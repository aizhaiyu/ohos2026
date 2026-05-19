(() => {
  const PAGE_URL_PATTERN = "/consumer/cn/activity/harmonyos-incentive/data-query2026";
  const MESSAGE_SOURCE = "ohos2026";
  const GW_RESPONSE_MESSAGE = "GW_RESPONSE";
  const REQUEST_REPLAY_MESSAGE = "REQUEST_REPLAY";
  const FETCH_ALL_REWARD_APPS_MESSAGE = "FETCH_ALL_REWARD_APPS";
  const DATA_UPDATED_EVENT = "ohos2026:data-updated";
  const STORAGE_KEY = "ohos2026.latestCapture";
  const MAU_SNAPSHOT_KEY = "ohos2026.latestMauSnapshot";

  const REWARD_APP_ENDPOINT = "partnerActivityService/v1/developer/queryDeveloperRewardAppList";
  const HOT_APP_ENDPOINT = "partnerActivityService/v1/developer/queryDeveloperRewardHotAppList";
  const MONTHLY_ACTIVE_HEADER = "本月月活";

  const state = {
    lastUpdated: null,
    url: location.href,
    rewardApps: [],
    hotApps: [],
    rawResponses: [],
    tableSnapshots: []
  };
  let renderScheduled = false;
  let previousMauByApp = {};
  let lastSavedMauByApp = {};
  let mauSnapshotLoaded = false;
  let pendingMauSnapshotSave = false;
  const pendingFetchAllRequests = new Map();

  function injectPageStyles() {
    if (document.getElementById("ohos2026-monthly-active-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "ohos2026-monthly-active-style";
    style.textContent = `
      .ohos2026-monthly-active-value {
        display: inline-block;
        color: inherit;
        font-weight: 400;
        white-space: nowrap;
      }
      .ohos2026-monthly-active-delta {
        display: inline-block;
        margin-left: 6px;
        color: #18a058;
        font-weight: 700;
        white-space: nowrap;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function setPageBadge(message) {
    console.log(`OHOS2026: ${message}`);
  }

  function safeJsonParse(value, fallback = null) {
    if (typeof value !== "string") {
      return value ?? fallback;
    }

    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function labelByIndex(index) {
    const labels = ["不涉及", "满足", "暂不满足", "暂无"];
    return labels[index] ?? "";
  }

  function formatDate(value) {
    if (!value || typeof value !== "string") {
      return "";
    }

    return value.split(" ")[0].replaceAll("-", "/");
  }

  function getMonthSortValue(month) {
    if (month == null) {
      return -Infinity;
    }

    const text = String(month);
    const digits = text.replace(/\D/g, "");
    const numericValue = Number(digits);
    return Number.isFinite(numericValue) ? numericValue : -Infinity;
  }

  function getMauMonthKey(month) {
    if (month == null || month === "") {
      return "";
    }

    const text = String(month).trim();
    const yearMonthMatch = text.match(/\d{4}\D+(0?[1-9]|1[0-2])/);
    if (yearMonthMatch) {
      return String(Number(yearMonthMatch[1]));
    }

    const monthMatch = text.match(/(?:^|\D)(0?[1-9]|1[0-2])(?:\D|$)/);
    return monthMatch ? String(Number(monthMatch[1])) : "";
  }

  function getSnapshotMonthKey(capturedAt) {
    const date = capturedAt ? new Date(capturedAt) : null;
    return date && !Number.isNaN(date.getTime()) ? String(date.getMonth() + 1) : "";
  }

  function getLatestPerformanceData(performanceDatas) {
    if (!Array.isArray(performanceDatas) || performanceDatas.length === 0) {
      return null;
    }

    return [...performanceDatas].sort((left, right) => getMonthSortValue(right.month) - getMonthSortValue(left.month))[0] ?? null;
  }

  function formatMau(value) {
    if (value == null || value === "") {
      return "暂无";
    }

    const numericValue = Number(value);
    if (numericValue === -1) {
      return "不涉及";
    }

    if (!Number.isFinite(numericValue)) {
      return String(value);
    }

    return new Intl.NumberFormat("zh-CN").format(numericValue);
  }

  function normalizeRewardApps(result) {
    const payload = safeJsonParse(result?.resultString, {});
    const list = Array.isArray(payload?.appPerfDataList) ? payload.appPerfDataList : [];

    return list.map((item) => {
      const performanceDatas = Array.isArray(item.performanceDatas) ? item.performanceDatas : [];
      const latestPerformance = getLatestPerformanceData(performanceDatas);

      return {
        appName: item.appName ?? "",
        appId: item.appId ?? "",
        performanceFlag: item.performanceFlag,
        performanceFlagStr: labelByIndex(item.performanceFlag),
        appType: item.appType === 1 ? "热门应用" : "新应用",
        firstOnshelfTime: formatDate(item.firstOnshelfTime),
        isOnshelf: item.isOnshelf === 1 ? "在架" : "不在架",
        funcCompleted: labelByIndex(item.funcCompleted),
        accountIntegrated: labelByIndex(item.accountIntegrated),
        latestMauMonth: latestPerformance?.month ?? "",
        latestMau: latestPerformance?.mau ?? null,
        latestMauText: formatMau(latestPerformance?.mau),
        performanceDatas
      };
    });
  }

  function normalizeHotApps(result, request) {
    const payload = safeJsonParse(result?.resultString, {});
    const list = Array.isArray(payload?.appInfoList) ? payload.appInfoList : [];
    const current = Number(request?.current || 1);
    const pageSize = Number(request?.pageSize || 10);

    return list.map((item, index) => ({
      index: (current - 1) * pageSize + index + 1,
      appName: item.appName ?? "",
      developerName: item.developerName ?? ""
    }));
  }

  function dedupeBy(items, keyFn) {
    const map = new Map();
    for (const item of items) {
      map.set(keyFn(item), item);
    }
    return Array.from(map.values());
  }

  function upsertByPage(existing, incoming, page, keyFn) {
    const withoutPage = existing.filter((item) => item.__page !== page);
    const tagged = incoming.map((item) => ({ ...item, __page: page }));
    return dedupeBy([...withoutPage, ...tagged], keyFn);
  }

  function textOf(element) {
    return (element?.innerText || element?.textContent || "").trim().replace(/\s+/g, " ");
  }

  function getRewardAppMap() {
    const map = new Map();

    for (const app of state.rewardApps) {
      if (app.appId) {
        map.set(String(app.appId).trim(), app);
      }
      if (app.appName) {
        map.set(String(app.appName).trim(), app);
      }
    }

    return map;
  }

  function getAppKey(app) {
    return String(app?.appId || app?.appName || "").trim();
  }

  function getNumericMau(app) {
    if (!app || app.latestMau == null || app.latestMau === "" || app.latestMau === "暂无") {
      return null;
    }

    const value = Number(app?.latestMau);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function getAppMauMonthKey(app) {
    return getMauMonthKey(app?.latestMauMonth);
  }

  function normalizeStoredMauRecord(record, fallbackMonthKey = "") {
    if (record == null || record === "") {
      return null;
    }

    if (typeof record === "object") {
      const mau = Number(record.mau);
      const monthKey = getMauMonthKey(record.monthKey || record.month || fallbackMonthKey);
      return Number.isFinite(mau) && monthKey ? { mau, monthKey } : null;
    }

    const mau = Number(record);
    return Number.isFinite(mau) && fallbackMonthKey ? { mau, monthKey: fallbackMonthKey } : null;
  }

  function normalizeStoredMauMap(apps, fallbackMonthKey = "") {
    const normalized = {};
    if (!apps || typeof apps !== "object") {
      return normalized;
    }

    for (const [key, record] of Object.entries(apps)) {
      const normalizedRecord = normalizeStoredMauRecord(record, fallbackMonthKey);
      if (key && normalizedRecord) {
        normalized[key] = normalizedRecord;
      }
    }
    return normalized;
  }

  function getStoredMauRecord(app, sourceMap) {
    const currentMonthKey = getAppMauMonthKey(app);
    if (!currentMonthKey) {
      return null;
    }

    const appId = String(app?.appId || "").trim();
    const appName = String(app?.appName || "").trim();
    const records = [appId ? sourceMap[appId] : null, appName ? sourceMap[appName] : null];

    for (const record of records) {
      const normalizedRecord = normalizeStoredMauRecord(record);
      if (normalizedRecord?.monthKey === currentMonthKey) {
        return normalizedRecord;
      }
    }

    return null;
  }

  function getPreviousMau(app) {
    return getStoredMauRecord(app, previousMauByApp)?.mau ?? null;
  }

  function getBaselineMauRecord(app) {
    const currentMonthKey = getAppMauMonthKey(app);
    const currentMau = getNumericMau(app);
    if (!currentMonthKey || currentMau == null) {
      return null;
    }

    return getStoredMauRecord(app, lastSavedMauByApp) || {
      mau: currentMau,
      monthKey: currentMonthKey
    };
  }

  function buildCurrentMauSnapshot() {
    const apps = { ...lastSavedMauByApp };
    for (const app of state.rewardApps) {
      const key = getAppKey(app);
      const record = getBaselineMauRecord(app);
      if (key && record) {
        apps[key] = record;
      }
      if (app.appName && record) {
        apps[String(app.appName).trim()] = record;
      }
    }
    return apps;
  }

  function saveCurrentMauSnapshot() {
    const apps = buildCurrentMauSnapshot();
    if (Object.keys(apps).length === 0) {
      return;
    }

    if (!mauSnapshotLoaded) {
      pendingMauSnapshotSave = true;
      return;
    }

    lastSavedMauByApp = apps;

    chrome.storage.local.set({
      [MAU_SNAPSHOT_KEY]: {
        capturedAt: new Date().toISOString(),
        apps
      }
    });
  }

  function loadPreviousMauSnapshot() {
    chrome.storage.local.get(MAU_SNAPSHOT_KEY, (result) => {
      const snapshot = result?.[MAU_SNAPSHOT_KEY] || {};
      lastSavedMauByApp = normalizeStoredMauMap(snapshot.apps, getSnapshotMonthKey(snapshot.capturedAt));
      previousMauByApp = lastSavedMauByApp;
      mauSnapshotLoaded = true;
      renderMonthlyActiveColumn();

      if (pendingMauSnapshotSave) {
        pendingMauSnapshotSave = false;
        saveCurrentMauSnapshot();
      }
    });
  }

  function prepareMauComparison() {
    if (mauSnapshotLoaded) {
      previousMauByApp = lastSavedMauByApp;
    }
  }

  function getRewardRows() {
    const table = findRewardTable();
    if (!table) {
      return [];
    }

    return Array.from(table.querySelectorAll("tbody tr")).filter((row) => row.querySelectorAll("td").length > 1);
  }

  function findRewardTable() {
    const exactTable = Array.from(document.querySelectorAll(".appdata-container table, .incentive-query-container table, table")).find((table) => {
      const headerText = textOf(table.querySelector("thead"));
      return headerText.includes("应用名称") && headerText.includes("AppID") && findPerformanceColumnIndex(table) >= 0;
    });
    if (exactTable) {
      return exactTable;
    }

    return Array.from(document.querySelectorAll("table")).find((table) => {
      const headerCount = table.querySelectorAll("thead th").length;
      const rowCount = table.querySelectorAll("tbody tr").length;
      const firstRowCellCount = table.querySelectorAll("tbody tr:first-child td").length;
      return headerCount >= 3 && rowCount >= 1 && firstRowCellCount >= 3;
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function fastClick(element) {
    if (!element) {
      return;
    }

    element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    element.click?.();
  }

  async function waitFor(fn, timeout = 1500, step = 30) {
    const startedAt = performance.now();
    while (performance.now() - startedAt < timeout) {
      const value = fn();
      if (value) {
        return value;
      }
      await sleep(step);
    }
    return null;
  }

  function findPerformanceModal() {
    const modal = document.querySelector(".common-modal-main");
    return modal && textOf(modal).includes("有效活跃及评分明细数据") ? modal : null;
  }

  async function closePerformanceModal() {
    const modal = findPerformanceModal();
    if (!modal) {
      return true;
    }

    fastClick(modal.querySelector(".close-btn"));
    await waitFor(() => !findPerformanceModal(), 800, 20);
    return !findPerformanceModal();
  }

  function readLatestMauFromModal(modal) {
    const rows = Array.from(modal.querySelectorAll("tbody tr"));
    const row = rows[rows.length - 1];
    if (!row) {
      return {
        latestMauMonth: "",
        latestMau: null,
        latestMauText: "暂无"
      };
    }

    const cells = Array.from(row.querySelectorAll("td")).map((cell) => textOf(cell));
    const mauText = cells[1] && cells[1] !== "暂无" ? cells[1].replace(/[^\d.-]/g, "") : "暂无";
    return {
      latestMauMonth: cells[0] ?? "",
      latestMau: Number.isFinite(Number(mauText)) ? Number(mauText) : null,
      latestMauText: mauText === "暂无" ? "暂无" : formatMau(mauText)
    };
  }

  function getClickablePerformanceTarget(row, performanceIndex) {
    const cell = row.querySelectorAll("td")[performanceIndex];
    if (!cell) {
      return null;
    }

    return (
      cell.querySelector("a") ||
      Array.from(cell.querySelectorAll("span, div, button")).find((element) => {
        if (element.classList.contains("ohos2026-monthly-active-value")) {
          return false;
        }

        const text = textOf(element);
        if (!text) {
          return false;
        }

        const style = getComputedStyle(element);
        return style.cursor === "pointer" || text.length <= 8;
      }) ||
      cell
    );
  }

  async function fillMonthlyActiveFromModals() {
    renderMonthlyActiveColumn();

    const table = findRewardTable();
    const headerRow = table?.querySelector("thead tr");
    if (!table || !headerRow) {
      return { ok: false, message: "没有找到上架应用数据表格", diagnostics: getPageDiagnostics() };
    }

    const headers = Array.from(headerRow.children);
    const performanceIndex = findPerformanceColumnIndex(table);
    const appNameIndex = getColumnIndex(headers, "应用名称");
    const appIdIndex = getColumnIndex(headers, "AppID");
    if (performanceIndex < 0) {
      return { ok: false, message: "没有找到有效月活及评分列", diagnostics: getPageDiagnostics() };
    }
    if (appNameIndex < 0 || appIdIndex < 0) {
      return { ok: false, message: "没有找到应用名称或 AppID 列", diagnostics: getPageDiagnostics() };
    }

    await closePerformanceModal();

    let updatedCount = 0;
    for (const row of getRewardRows()) {
      const cells = Array.from(row.children);
      const appName = textOf(cells[appNameIndex]);
      const appId = textOf(cells[appIdIndex]);
      const target = getClickablePerformanceTarget(row, performanceIndex);
      if (!target) {
        continue;
      }

      fastClick(target);

      const modal = await waitFor(() => {
        const candidate = findPerformanceModal();
        if (!candidate) {
          return null;
        }
        return candidate.querySelector("tbody tr td:nth-child(2)") ? candidate : null;
      });

      const modalData = modal ? readLatestMauFromModal(modal) : { latestMauMonth: "", latestMau: null, latestMauText: "暂无" };
      const existingIndex = state.rewardApps.findIndex((app) => (appId && app.appId === appId) || (appName && app.appName === appName));
      const app = {
        ...(existingIndex >= 0 ? state.rewardApps[existingIndex] : {}),
        appName,
        appId,
        ...modalData
      };

      if (existingIndex >= 0) {
        state.rewardApps[existingIndex] = app;
      } else {
        state.rewardApps.push(app);
      }

      updatedCount += 1;
      renderMonthlyActiveColumn();
      await closePerformanceModal();
    }

    persist();
    return { ok: true, updatedCount };
  }


  function getColumnIndex(headers, matcher) {
    return headers.findIndex((cell) => {
      const text = textOf(cell);
      return typeof matcher === "function" ? matcher(text, cell) : text.includes(matcher);
    });
  }

  function isPerformanceHeaderText(text) {
    if (!text || text.includes(MONTHLY_ACTIVE_HEADER)) {
      return false;
    }

    return text.includes("有效月活及评分") || text.includes("有效月活") || text.includes("月活及评分");
  }

  function findPerformanceColumnIndex(table) {
    const headers = Array.from(table?.querySelectorAll("thead tr th") || []);
    return getColumnIndex(headers, isPerformanceHeaderText);
  }

  function getPageDiagnostics() {
    const tables = Array.from(document.querySelectorAll("table"));
    return {
      url: location.href,
      readyState: document.readyState,
      tableCount: tables.length,
      tableHeaders: tables.map((table, index) => ({
        index,
        headers: Array.from(table.querySelectorAll("thead th")).map((cell) => textOf(cell)),
        textPreview: textOf(table).slice(0, 300)
      }))
    };
  }

  function createMonthlyHeaderCell(referenceCell) {
    const th = document.createElement("th");
    copyScopedAttributes(referenceCell, th);
    th.className = "ohos2026-monthly-active-header";
    th.style.cssText = referenceCell?.getAttribute("style") || "";
    th.style.padding = th.style.padding || "14px 24px";
    th.style.fontSize = th.style.fontSize || "14px";
    th.style.fontWeight = th.style.fontWeight || "500";
    th.style.background = th.style.background || "#f1f3f5";
    th.style.minWidth = "116px";
    th.style.width = "116px";
    th.innerHTML = `<div class="t-cell">${MONTHLY_ACTIVE_HEADER}</div>`;
    return th;
  }

  function createMonthlyBodyCell(referenceCell, app) {
    const td = document.createElement("td");
    copyScopedAttributes(referenceCell, td);
    td.className = "ohos2026-monthly-active-cell";
    td.style.cssText = referenceCell?.getAttribute("style") || "";
    td.style.padding = td.style.padding || "18px 24px";
    td.style.fontSize = td.style.fontSize || "14px";
    td.style.textAlign = td.style.textAlign || "left";
    updateMonthlyBodyCell(td, app);
    return td;
  }

  function updateMonthlyBodyCell(cell, app) {
    const value = app ? (app.latestMauText && app.latestMauText !== "暂无" ? app.latestMauText : "0") : "0";
    const month = app?.latestMauMonth ? String(app.latestMauMonth) : "";
    cell.title = month ? `${month}：${value}` : value;

    let valueElement = cell.querySelector(".ohos2026-monthly-active-value");
    if (!valueElement) {
      valueElement = document.createElement("span");
      valueElement.className = "ohos2026-monthly-active-value";
      cell.replaceChildren(valueElement);
    }
    if (valueElement.textContent !== value) {
      valueElement.textContent = value;
    }

    const currentMau = getNumericMau(app);
    const previousMau = getPreviousMau(app);
    const delta = currentMau != null && previousMau != null ? currentMau - previousMau : 0;
    let deltaElement = cell.querySelector(".ohos2026-monthly-active-delta");

    if (delta > 0) {
      if (!deltaElement) {
        deltaElement = document.createElement("span");
        deltaElement.className = "ohos2026-monthly-active-delta";
        cell.appendChild(deltaElement);
      }
      deltaElement.textContent = `+${new Intl.NumberFormat("zh-CN").format(delta)}`;
      cell.title = `${cell.title}，较本月基准 +${new Intl.NumberFormat("zh-CN").format(delta)}`;
    } else if (deltaElement) {
      deltaElement.remove();
    }
  }

  function copyScopedAttributes(source, target) {
    if (!source || !target) {
      return;
    }

    for (const attribute of source.attributes) {
      if (attribute.name.startsWith("data-v-")) {
        target.setAttribute(attribute.name, attribute.value);
      }
    }
  }

  function expandFixedTableWidth(table) {
    const currentWidth = Number.parseFloat(table.style.width || getComputedStyle(table).width);
    if (!Number.isFinite(currentWidth)) {
      return;
    }

    if (!table.dataset.ohosOriginalWidth) {
      table.dataset.ohosOriginalWidth = String(currentWidth);
    }

    const originalWidth = Number.parseFloat(table.dataset.ohosOriginalWidth);
    table.style.width = `${originalWidth + 116}px`;
  }

  function syncRowSpan(row, monthlyIndex) {
    const cells = Array.from(row.children);
    if (cells.length === 1 && cells[0].hasAttribute("colspan")) {
      const current = Number(cells[0].getAttribute("colspan"));
      if (Number.isFinite(current) && current > 0) {
        cells[0].setAttribute("colspan", String(Math.max(current, monthlyIndex + 1)));
      }
      return true;
    }

    return false;
  }

  function renderMonthlyActiveColumn() {
    renderScheduled = false;
    const table = findRewardTable();
    if (!table) {
      console.log("OHOS2026: 未找到上架应用数据表格");
      setPageBadge(`已加载，但未找到表格。当前 table 数：${document.querySelectorAll("table").length}`);
      return;
    }
    setPageBadge("已加载，找到表格，正在插入本月月活列");

    const headerRow = table.querySelector("thead tr");
    if (!headerRow) {
      console.log("OHOS2026: 未找到表头行");
      setPageBadge("找到 table，但没有 thead tr");
      return;
    }

    const headers = Array.from(headerRow.children);
    let monthlyIndex = getColumnIndex(headers, MONTHLY_ACTIVE_HEADER);
    const performanceIndex = findPerformanceColumnIndex(table);
    const appNameIndex = getColumnIndex(headers, "应用名称");
    const appIdIndex = getColumnIndex(headers, "AppID");
    const insertAfterIndex = performanceIndex >= 0 ? performanceIndex : appIdIndex >= 0 ? appIdIndex : 2;
    const previousMonthlyIndex = monthlyIndex;

    console.log(
      "OHOS2026: 表头",
      headers.map((cell, index) => `${index + 1}:${textOf(cell)}`),
      { performanceIndex, monthlyIndex, appNameIndex, appIdIndex }
    );

    if (monthlyIndex < 0 && insertAfterIndex >= 0 && headers[insertAfterIndex]) {
      const targetHeader = headers[insertAfterIndex];
      targetHeader.parentNode.insertBefore(createMonthlyHeaderCell(targetHeader), targetHeader.nextSibling);
      expandFixedTableWidth(table);
      monthlyIndex = insertAfterIndex + 1;
      console.log(`OHOS2026: 已在第 ${insertAfterIndex + 1} 列右侧插入「${MONTHLY_ACTIVE_HEADER}」表头`);
    }

    if (monthlyIndex >= 0 && monthlyIndex !== insertAfterIndex + 1 && headers[monthlyIndex] && headers[insertAfterIndex]) {
      headers[insertAfterIndex].parentNode.insertBefore(headers[monthlyIndex], headers[insertAfterIndex].nextSibling);
      monthlyIndex = insertAfterIndex + 1;
      console.log(`OHOS2026: 已移动「${MONTHLY_ACTIVE_HEADER}」表头到有效月活及评分右侧`);
    }

    if (monthlyIndex < 0) {
      console.log("OHOS2026: 无法确定本月月活列位置");
      setPageBadge("无法确定本月月活列位置");
      return;
    }

    const appMap = getRewardAppMap();
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter((row) => row.querySelectorAll("td").length > 1);

    rows.forEach((row, rowIndex) => {
      if (syncRowSpan(row, monthlyIndex)) {
        return;
      }

      const refreshedCells = Array.from(row.children);
      const headerCount = headerRow.children.length;
      const existingCell =
        row.querySelector(".ohos2026-monthly-active-cell") ||
        (previousMonthlyIndex >= 0 && refreshedCells.length >= headerCount ? refreshedCells[previousMonthlyIndex] : null);
      const appId = textOf(refreshedCells[appIdIndex]);
      const appName = textOf(refreshedCells[appNameIndex]);
      const app = appMap.get(appId) || appMap.get(appName);
      const monthlyActiveCell = refreshedCells[insertAfterIndex];

      if (existingCell) {
        existingCell.classList.add("ohos2026-monthly-active-cell");
        updateMonthlyBodyCell(existingCell, app);
        if (monthlyActiveCell && row.children[insertAfterIndex + 1] !== existingCell) {
          monthlyActiveCell.parentNode.insertBefore(existingCell, monthlyActiveCell.nextSibling);
        }
        return;
      }

      if (monthlyActiveCell) {
        monthlyActiveCell.parentNode.insertBefore(createMonthlyBodyCell(monthlyActiveCell, app), monthlyActiveCell.nextSibling);
      } else {
        console.log(`OHOS2026: 第 ${rowIndex + 1} 行未找到有效月活及评分单元格`, textOf(row));
      }
    });
    setPageBadge(`已插入本月月活列，默认值 0，行数：${rows.length}`);
  }

  function scheduleRenderMonthlyActiveColumn() {
    if (renderScheduled) {
      return;
    }

    renderScheduled = true;
    window.requestAnimationFrame(renderMonthlyActiveColumn);
  }

  function captureTables() {
    const tables = Array.from(document.querySelectorAll(".incentive-query-container table"));
    state.tableSnapshots = tables.map((table, tableIndex) => {
      const headers = Array.from(table.querySelectorAll("thead th")).map((cell) =>
        cell.innerText.trim().replace(/\s+/g, " ")
      );
      const rows = Array.from(table.querySelectorAll("tbody tr"))
        .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.innerText.trim().replace(/\s+/g, " ")))
        .filter((row) => row.length && row.some(Boolean));

      return {
        tableIndex,
        headers,
        rows
      };
    });
  }

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
      fetchAllRewardApps().then(sendResponse);
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

  if (location.pathname.includes(PAGE_URL_PATTERN)) {
    injectPageStyles();
    setPageBadge("已加载，等待页面表格");
    loadPreviousMauSnapshot();
    window.addEventListener("message", handleGwResponse);
    window.postMessage({ source: MESSAGE_SOURCE, type: REQUEST_REPLAY_MESSAGE }, window.location.origin);

    const runInitialRender = () => {
      setTimeout(persist, 500);
      setTimeout(renderMonthlyActiveColumn, 1000);
      setTimeout(renderMonthlyActiveColumn, 2500);
      setTimeout(renderMonthlyActiveColumn, 5000);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runInitialRender);
    } else {
      runInitialRender();
    }

    const observer = new MutationObserver(() => {
      scheduleRenderMonthlyActiveColumn();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
