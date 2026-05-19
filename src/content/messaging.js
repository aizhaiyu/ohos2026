function persist() {
  state.lastUpdated = new Date().toISOString();
  state.url = location.href;
  renderMonthlyActiveColumn();
  captureTables();

  chrome.storage.local.set({ [STORAGE_KEY]: state });
  saveCurrentMauSnapshot();
  window.dispatchEvent(new CustomEvent(DATA_UPDATED_EVENT, { detail: state }));
}

function handleGwResponse(messageEvent) {
  if (messageEvent.source !== window || messageEvent.data?.source !== MESSAGE_SOURCE) {
    return;
  }

  if (messageEvent.data?.type !== GW_RESPONSE_MESSAGE) {
    return;
  }

  const detail = safeJsonParse(messageEvent.data.payload, null);
  if (!detail || !detail.serviceName) {
    return;
  }

  const result = detail.response?.result;
  const page = Number(detail.request?.current || 1);
  const pageSize = Number(detail.request?.pageSize || 10);

  state.rawResponses.push({
    serviceName: detail.serviceName,
    request: detail.request ?? null,
    response: detail.response ?? null,
    capturedAt: detail.capturedAt
  });

  if (detail.serviceName.includes(REWARD_APP_ENDPOINT)) {
    const pending = detail.clientRequestId ? pendingFetchAllRequests.get(detail.clientRequestId) : null;
    if (detail.error && detail.clientRequestId && pendingFetchAllRequests.has(detail.clientRequestId)) {
      pendingFetchAllRequests.delete(detail.clientRequestId);
      pending.resolve({ ok: false, message: detail.error.message || "获取全部数据失败", state });
      return;
    }

    const apps = normalizeRewardApps(result);
    prepareMauComparison();
    if (pageSize >= 100) {
      state.rewardApps = page === 1 ? apps : dedupeBy([...state.rewardApps, ...apps], (item) => item.appId || item.appName);
    } else {
      state.rewardApps = upsertByPage(state.rewardApps, apps, page, (item) => `${item.appId || item.appName}:${item.__page}`);
    }
    renderMonthlyActiveColumn();
    refreshActiveFilterRows();
    persist();

    if (pending) {
      window.clearTimeout(pending.timeoutId);
      const total = getRewardTotalFromResult(result);
      const loaded = state.rewardApps.length;
      if (!total || loaded >= total || pageSize >= total) {
        pendingFetchAllRequests.delete(detail.clientRequestId);
        pending.resolve({ ok: true, total: total || loaded, loaded, state });
      }
    }
    return;
  }

  if (detail.serviceName.includes(HOT_APP_ENDPOINT)) {
    const apps = normalizeHotApps(result, detail.request);
    state.hotApps = upsertByPage(state.hotApps, apps, page, (item) => `${item.index}:${item.appName}:${item.developerName}`);
    persist();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OHOS2026_GET_STATE") {
    captureTables();
    sendResponse({ ok: true, state });
    return true;
  }

  if (message?.type === "OHOS2026_SCAN_TABLES") {
    persist();
    sendResponse({ ok: true, state });
    return true;
  }

  if (message?.type === "OHOS2026_INSERT_MONTHLY_COLUMN") {
    renderMonthlyActiveColumn();
    persist();
    sendResponse({ ok: true, state });
    return true;
  }

  if (message?.type === "OHOS2026_FILL_MONTHLY_FROM_MODALS") {
    fillMonthlyActiveFromModals().then((result) => sendResponse({ ...result, state }));
    return true;
  }

  if (message?.type === "OHOS2026_FETCH_ALL_REWARD_APPS") {
    fetchAllRewardApps().then((response) => {
      refreshActiveFilterRows();
      sendResponse(response);
    });
    return true;
  }

  return false;
});

function getRewardTotalFromResult(result) {
  const payload = safeJsonParse(result?.resultString, {});
  return Number(payload?.pageInfo?.totalCount || 0);
}

function fetchAllRewardApps() {
  const clientRequestId = `fetch-all-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      pendingFetchAllRequests.delete(clientRequestId);
      resolve({ ok: false, message: "获取全部数据超时，请刷新页面后重试", state });
    }, 15000);

    pendingFetchAllRequests.set(clientRequestId, { resolve, timeoutId });
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: FETCH_ALL_REWARD_APPS_MESSAGE,
        clientRequestId
      },
      window.location.origin
    );
  });
}
