const STORAGE_KEY = "ohos2026.latestCapture";
const TARGET_URL = "https://developer.huawei.com/consumer/cn/activity/harmonyos-incentive/data-query2026";

const statusEl = document.querySelector("#status");
const rewardCountEl = document.querySelector("#rewardCount");
const hotCountEl = document.querySelector("#hotCount");
const previewEl = document.querySelector("#preview");
const fetchAllButton = document.querySelector("#fetchAll");
const insertColumnButton = document.querySelector("#insertColumn");
const fillMonthlyButton = document.querySelector("#fillMonthly");
const scanTablesButton = document.querySelector("#scanTables");

let latestState = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function cleanForExport(state) {
  const stripInternal = (item) => {
    const copy = { ...item };
    delete copy.__page;
    return copy;
  };

  return {
    capturedAt: state?.lastUpdated ?? null,
    pageUrl: state?.url ?? null,
    rewardApps: Array.isArray(state?.rewardApps) ? state.rewardApps.map(stripInternal) : [],
    hotApps: Array.isArray(state?.hotApps) ? state.hotApps.map(stripInternal) : [],
    tableSnapshots: Array.isArray(state?.tableSnapshots) ? state.tableSnapshots : [],
    rawResponses: Array.isArray(state?.rawResponses) ? state.rawResponses : []
  };
}

function render(state) {
  latestState = state;
  const exportData = cleanForExport(state);
  const rewardCount = exportData.rewardApps.length;
  const hotCount = exportData.hotApps.length;

  rewardCountEl.textContent = String(rewardCount);
  hotCountEl.textContent = String(hotCount);

  const hasData = rewardCount > 0 || hotCount > 0 || exportData.tableSnapshots.some((table) => table.rows.length);
  if (!state) {
    previewEl.textContent = "暂无数据。请先打开目标页面并完成登录。";
    setStatus("未读取到缓存数据。");
    return;
  }

  const updatedText = state.lastUpdated ? new Date(state.lastUpdated).toLocaleString("zh-CN") : "未知时间";
  setStatus(hasData ? `已捕获数据：${updatedText}` : "页面已连接，正在等待登录态数据加载。");

  previewEl.textContent = JSON.stringify(
    {
      capturedAt: exportData.capturedAt,
      rewardAppCount: exportData.rewardApps.length,
      hotAppCount: exportData.hotApps.length,
      rewardApps: exportData.rewardApps,
      hotApps: exportData.hotApps
    },
    null,
    2
  );
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function requestPageState(type = "OHOS2026_GET_STATE") {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url?.startsWith(TARGET_URL)) {
    const cached = await chrome.storage.local.get(STORAGE_KEY);
    render(cached[STORAGE_KEY] ?? null);
    setStatus("请在目标华为页面打开插件。");
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (response?.ok) {
      render(response.state);
      return;
    }
    if (response?.message || response?.diagnostics) {
      setStatus(response.message || "页面返回失败。");
      previewEl.textContent = JSON.stringify(response.diagnostics || response, null, 2);
      return;
    }
  } catch (_error) {
    setStatus(`页面脚本尚未就绪，请刷新目标页面后再试：${_error?.message || _error}`);
  }

  const cached = await chrome.storage.local.get(STORAGE_KEY);
  render(cached[STORAGE_KEY] ?? null);
}

scanTablesButton.addEventListener("click", () => requestPageState("OHOS2026_SCAN_TABLES"));

fetchAllButton.addEventListener("click", async () => {
  fetchAllButton.disabled = true;
  setStatus("正在获取全部应用数据...");

  const tab = await getActiveTab();
  if (!tab?.id || !tab.url?.startsWith(TARGET_URL)) {
    setStatus("请在目标华为页面打开插件。");
    fetchAllButton.disabled = false;
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "OHOS2026_FETCH_ALL_REWARD_APPS" });
    if (response?.ok) {
      render(response.state);
      setStatus(`已获取 ${response.loaded ?? 0}/${response.total ?? response.loaded ?? 0} 条应用数据。`);
    } else {
      render(response?.state ?? latestState);
      setStatus(response?.message || "获取全部数据失败。");
    }
  } catch (_error) {
    setStatus(`获取全部数据失败：${_error?.message || _error}`);
  } finally {
    fetchAllButton.disabled = false;
  }
});

insertColumnButton.addEventListener("click", () => requestPageState("OHOS2026_INSERT_MONTHLY_COLUMN"));

fillMonthlyButton.addEventListener("click", async () => {
  fillMonthlyButton.disabled = true;
  setStatus("正在逐行读取本月月活，请不要操作页面...");
  const tab = await getActiveTab();

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "OHOS2026_FILL_MONTHLY_FROM_MODALS" });
    if (response?.ok) {
      render(response.state);
      setStatus(`已读取 ${response.updatedCount ?? 0} 行本月月活。`);
    } else {
      setStatus(response?.message || "读取失败，请确认当前在目标页面。");
      if (response?.diagnostics) {
        previewEl.textContent = JSON.stringify(response.diagnostics, null, 2);
      }
    }
  } catch (_error) {
    setStatus(`页面脚本尚未就绪，请刷新目标页面后再试：${_error?.message || _error}`);
  } finally {
    fillMonthlyButton.disabled = false;
  }
});

requestPageState();
