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
  const FAILED_PERFORMANCE_LABEL = "暂不满足";
  const SCORE_VALUE_KEYS = [
    "monthEndScore",
    "monthlyScore",
    "ratingScore",
    "avgScore",
    "averageScore",
    "score",
    "rating",
    "grade",
    "rate",
    "月末评分",
    "评分"
  ];
  const SCORE_COUNT_KEYS = [
    "monthEndScoreCount",
    "monthlyScoreCount",
    "ratingCount",
    "scoreCount",
    "commentCount",
    "reviewCount",
    "evaluationCount",
    "gradeCount",
    "rateCount",
    "ratingNum",
    "scoreNum",
    "commentNum",
    "reviewNum",
    "evaluationNum",
    "gradeNum",
    "月末评分个数",
    "评分个数",
    "评论数",
    "评价数"
  ];
  const FILTER_ALL = "all";
  const FILTER_PASSED = "passed";
  const FILTER_FAILED = "failed";
  const PERFORMANCE_FILTER_OPTIONS = [
    { value: FILTER_ALL, label: "全部" },
    { value: FILTER_PASSED, label: "已达标" },
    { value: FILTER_FAILED, label: "未达标" }
  ];

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
  const filterState = {
    value: FILTER_ALL,
    requestId: 0,
    originalRows: null,
    renderingFilteredRows: false
  };
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
      .ohos2026-performance-filter-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        max-width: 100%;
        cursor: pointer;
        vertical-align: middle;
      }
      .ohos2026-performance-filter-wrap::after {
        content: "▼";
        display: inline-block;
        color: rgba(0, 0, 0, 0.46);
        font-size: 10px;
        line-height: 1;
        transform: scaleY(0.78);
      }
      .ohos2026-performance-filter-wrap:hover::after,
      .ohos2026-performance-filter-wrap:focus-within::after {
        color: rgba(0, 0, 0, 0.72);
      }
      .ohos2026-performance-filter-label {
        display: inline-block;
      }
      .ohos2026-performance-filter {
        position: absolute;
        inset: -4px -16px -4px -4px;
        width: calc(100% + 20px);
        height: calc(100% + 8px);
        opacity: 0;
        border: 0;
        cursor: pointer;
      }
      .ohos2026-performance-filter:disabled {
        cursor: wait;
      }
      .ohos2026-performance-filter-wrap.is-loading::after {
        color: rgba(0, 0, 0, 0.28);
      }
      .ohos2026-filter-summary {
        display: none;
        margin: 0 0 8px;
        padding: 0;
        color: rgba(0, 0, 0, 0.52);
        font-size: 12px;
        line-height: 18px;
      }
      .ohos2026-filter-summary.is-visible {
        display: block;
      }
      .ohos2026-filter-summary.is-error {
        color: #d93026;
      }
      .ohos2026-filtered-empty {
        padding: 28px 12px !important;
        text-align: center !important;
        color: rgba(0, 0, 0, 0.52) !important;
        font-weight: 400 !important;
      }
      .ohos2026-filter-summary-count {
        color: rgba(0, 0, 0, 0.78);
        font-weight: 500;
      }
      .ohos2026-performance-review-cell {
        white-space: nowrap;
      }
      .ohos2026-performance-detail-trigger {
        cursor: pointer;
      }
      .ohos2026-performance-detail-trigger:hover {
        color: #0a59f7;
      }
      .ohos2026-performance-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.36);
      }
      .ohos2026-performance-modal-main {
        width: min(720px, calc(100vw - 48px));
        max-height: calc(100vh - 80px);
        overflow: hidden;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
      }
      .ohos2026-performance-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 28px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        font-size: 18px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.9);
      }
      .ohos2026-performance-modal-close {
        width: 28px;
        height: 28px;
        border: 0;
        background: transparent;
        color: rgba(0, 0, 0, 0.56);
        cursor: pointer;
        font-size: 22px;
        line-height: 28px;
      }
      .ohos2026-performance-modal-close:hover {
        color: rgba(0, 0, 0, 0.9);
      }
      .ohos2026-performance-modal-content {
        padding: 24px 28px 28px;
        overflow: auto;
        max-height: calc(100vh - 170px);
      }
      .ohos2026-performance-modal-app {
        margin: 0 0 16px;
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
        line-height: 20px;
      }
      .ohos2026-performance-modal-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.9);
      }
      .ohos2026-performance-modal-table th,
      .ohos2026-performance-modal-table td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        white-space: nowrap;
      }
      .ohos2026-performance-modal-table th {
        background: rgba(241, 243, 245, 0.5);
        font-weight: 500;
      }
      .ohos2026-performance-modal-empty {
        padding: 24px 0;
        color: rgba(0, 0, 0, 0.52);
        text-align: center;
        font-size: 14px;
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

  function pickFirstValue(source, keys) {
    if (!source || typeof source !== "object") {
      return null;
    }

    for (const key of keys) {
      if (source[key] != null && source[key] !== "") {
        return source[key];
      }
    }

    const entries = Object.entries(source);
    for (const [key, value] of entries) {
      const normalizedKey = String(key).toLowerCase();
      const matched = keys.some((candidate) => normalizedKey === String(candidate).toLowerCase());
      if (matched && value != null && value !== "") {
        return value;
      }
    }

    return null;
  }

  function normalizeCount(value) {
    if (value == null || value === "") {
      return null;
    }

    const text = String(value).trim();
    if (!text || text === "暂无" || text === "-") {
      return null;
    }

    const numericText = text.replace(/[^\d.-]/g, "");
    const numericValue = Number(numericText);
    return Number.isFinite(numericValue) ? Math.max(0, Math.trunc(numericValue)) : null;
  }

  function formatScore(value) {
    if (value == null || value === "") {
      return "暂无";
    }

    const text = String(value).trim();
    if (!text || text === "暂无" || text === "-") {
      return "暂无";
    }

    const numericValue = Number(text.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(numericValue)) {
      return text;
    }
    if (numericValue === -1) {
      return "不涉及";
    }
    if (numericValue === 0) {
      return "暂无";
    }

    return numericValue.toFixed(1);
  }

  function normalizeReviewData(performanceData) {
    if (!performanceData) {
      return {
        latestReviewCount: null,
        latestReviewCountText: "",
        latestScore: "",
        latestReviewText: ""
      };
    }

    const scoreCount = normalizeCount(pickFirstValue(performanceData, SCORE_COUNT_KEYS));
    const displayScoreCount = scoreCount ?? 0;
    const score = formatScore(pickFirstValue(performanceData, SCORE_VALUE_KEYS));

    return {
      latestReviewCount: scoreCount,
      latestReviewCountText: new Intl.NumberFormat("zh-CN").format(displayScoreCount),
      latestScore: score,
      latestReviewText: `${score} / ${new Intl.NumberFormat("zh-CN").format(displayScoreCount)}评`
    };
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
      const latestReviewData = normalizeReviewData(latestPerformance);

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
        ...latestReviewData,
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

  function getPerformanceLabel(app) {
    return app?.performanceFlagStr || labelByIndex(app?.performanceFlag) || "";
  }

  function getPerformanceDisplayText(app) {
    const label = getPerformanceLabel(app);
    if (label === FAILED_PERFORMANCE_LABEL && app?.latestReviewText) {
      return app.latestReviewText;
    }
    return label;
  }

  function formatPerformanceMau(value) {
    return formatMau(value);
  }

  function formatPerformanceRating(value) {
    return formatScore(value);
  }

  function formatPerformanceRatingCount(value) {
    const count = normalizeCount(value);
    return count == null ? "暂无" : new Intl.NumberFormat("zh-CN").format(count);
  }

  function matchesPerformanceFilter(app, filterValue) {
    const label = getPerformanceLabel(app);
    if (filterValue === FILTER_PASSED) {
      return label === "满足";
    }
    if (filterValue === FILTER_FAILED) {
      return label !== "满足";
    }
    return true;
  }

  function getFilterLabel(filterValue) {
    return PERFORMANCE_FILTER_OPTIONS.find((option) => option.value === filterValue)?.label || "全部";
  }

  function getHeaderLabel(cell) {
    if (!cell) {
      return "";
    }

    const clone = cell.cloneNode(true);
    clone.querySelectorAll(".ohos2026-performance-filter").forEach((element) => element.remove());
    clone.querySelectorAll(".ohos2026-performance-filter-wrap").forEach((element) => {
      element.replaceWith(element.querySelector(".ohos2026-performance-filter-label")?.textContent || "");
    });
    return textOf(clone);
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
      const headerText = Array.from(table.querySelectorAll("thead th")).map(getHeaderLabel).join(" ");
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
        latestMauText: "暂无",
        ...normalizeReviewData(null)
      };
    }

    const cells = Array.from(row.querySelectorAll("td")).map((cell) => textOf(cell));
    const mauText = cells[1] && cells[1] !== "暂无" ? cells[1].replace(/[^\d.-]/g, "") : "暂无";
    const reviewData = normalizeReviewData({
      rating: cells[2],
      ratingCount: cells[3]
    });
    return {
      latestMauMonth: cells[0] ?? "",
      latestMau: Number.isFinite(Number(mauText)) ? Number(mauText) : null,
      latestMauText: mauText === "暂无" ? "暂无" : formatMau(mauText),
      ...reviewData
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
      const text = getHeaderLabel(cell);
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

  function createPerformanceFilterSelect() {
    const select = document.createElement("select");
    select.className = "ohos2026-performance-filter";
    select.title = "按达标状态筛选全量应用";
    select.setAttribute("aria-label", "按达标状态筛选全量应用");

    for (const optionConfig of PERFORMANCE_FILTER_OPTIONS) {
      const option = document.createElement("option");
      option.value = optionConfig.value;
      option.textContent = optionConfig.label;
      select.appendChild(option);
    }

    select.value = filterState.value;
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("mousedown", (event) => event.stopPropagation());
    select.addEventListener("change", () => {
      applyPerformanceFilter(select.value);
    });
    return select;
  }

  function ensurePerformanceFilterControl(headerCell) {
    if (!headerCell) {
      return null;
    }

    let select = headerCell.querySelector(".ohos2026-performance-filter");
    if (!select) {
      const content = headerCell.querySelector(".t-cell") || headerCell;
      const originalText = getHeaderLabel(headerCell);
      content.textContent = "";

      const wrapper = document.createElement("span");
      wrapper.className = "ohos2026-performance-filter-wrap";
      wrapper.title = "按达标状态筛选全量应用";

      const label = document.createElement("span");
      label.className = "ohos2026-performance-filter-label";
      label.textContent = originalText || "有效月活及评分";

      select = createPerformanceFilterSelect();
      wrapper.append(label, select);
      content.appendChild(wrapper);
    }
    select.dataset.ohos2026ColumnIndex = String(Array.from(headerCell.parentElement?.children || []).indexOf(headerCell));
    if (select.value !== filterState.value) {
      select.value = filterState.value;
    }
    return select;
  }

  function setPerformanceFilterLoading(isLoading) {
    document.querySelectorAll(".ohos2026-performance-filter").forEach((select) => {
      select.disabled = isLoading;
      select.closest(".ohos2026-performance-filter-wrap")?.classList.toggle("is-loading", isLoading);
    });
  }

  function findRewardSection(table) {
    let node = table;
    while (node && node !== document.body) {
      const previous = node.previousElementSibling;
      if (previous && textOf(previous).includes("激励计划上架应用数据")) {
        return node;
      }
      if (textOf(node).includes("激励计划上架应用数据")) {
        return node;
      }
      node = node.parentElement;
    }
    return table.parentElement || table;
  }

  function ensureFilterSummary(table) {
    const container = table.parentElement || findRewardSection(table);
    let summary = container.querySelector(":scope > .ohos2026-filter-summary");
    if (!summary) {
      summary = document.createElement("div");
      summary.className = "ohos2026-filter-summary";
      container.insertBefore(summary, table);
    }
    return summary;
  }

  function updateFilterSummary(table, message = "", isError = false) {
    const summary = ensureFilterSummary(table);
    if (typeof message === "string") {
      summary.textContent = message;
    } else {
      summary.replaceChildren(message);
    }
    summary.classList.toggle("is-visible", Boolean(message));
    summary.classList.toggle("is-error", Boolean(isError));
  }

  function createFilterSummaryContent(filterValue, matchedCount, totalCount) {
    const fragment = document.createDocumentFragment();
    fragment.append("筛选：", getFilterLabel(filterValue), " ");

    const count = document.createElement("span");
    count.className = "ohos2026-filter-summary-count";
    count.textContent = `${matchedCount} / ${totalCount}`;
    fragment.appendChild(count);
    fragment.append("，已临时显示全量筛选结果");
    return fragment;
  }

  function getRewardPaginationContainer(table) {
    let node = table;
    while (node && node !== document.body) {
      const next = node.nextElementSibling;
      if (next && textOf(next).includes("项/页")) {
        return next;
      }
      node = node.parentElement;
    }
    return null;
  }

  function setRewardPaginationHidden(table, isHidden) {
    const pagination = getRewardPaginationContainer(table);
    if (!pagination) {
      return;
    }

    if (isHidden) {
      pagination.dataset.ohos2026HiddenByFilter = "true";
      pagination.style.display = "none";
    } else if (pagination.dataset.ohos2026HiddenByFilter === "true") {
      pagination.style.display = "";
      delete pagination.dataset.ohos2026HiddenByFilter;
    }
  }

  function snapshotOriginalRows(tbody) {
    if (!tbody || filterState.originalRows) {
      return;
    }

    filterState.originalRows = Array.from(tbody.children);
  }

  function restoreOriginalRows(table) {
    const tbody = table?.querySelector("tbody");
    if (!tbody) {
      return;
    }

    if (filterState.originalRows) {
      filterState.renderingFilteredRows = true;
      tbody.replaceChildren(...filterState.originalRows);
      filterState.renderingFilteredRows = false;
      filterState.originalRows = null;
    }
    setRewardPaginationHidden(table, false);
    updateFilterSummary(table, "");
    renderMonthlyActiveColumn();
  }

  function renderFilteredRows(table, apps, filterValue) {
    const tbody = table?.querySelector("tbody");
    const headerRow = table?.querySelector("thead tr");
    if (!tbody || !headerRow) {
      return;
    }

    snapshotOriginalRows(tbody);
    const columnOrder = Array.from(headerRow.children).map(getHeaderLabel);
    const filteredApps = apps.filter((app) => matchesPerformanceFilter(app, filterValue));
    const rows = filteredApps.map((app) => createFilteredRow(app, table, headerRow, columnOrder));

    if (rows.length === 0) {
      const row = document.createElement("tr");
      row.className = "ohos2026-filtered-row";
      const cell = document.createElement("td");
      cell.className = "ohos2026-filtered-empty";
      cell.colSpan = Math.max(columnOrder.length, 1);
      cell.textContent = "没有符合筛选条件的应用";
      row.appendChild(cell);
      rows.push(row);
    }

    filterState.renderingFilteredRows = true;
    tbody.replaceChildren(...rows);
    filterState.renderingFilteredRows = false;
    setRewardPaginationHidden(table, true);
    updateFilterSummary(table, createFilterSummaryContent(filterValue, filteredApps.length, apps.length));
  }

  function refreshActiveFilterRows() {
    if (filterState.value === FILTER_ALL || filterState.renderingFilteredRows) {
      return;
    }

    const table = findRewardTable();
    if (!table) {
      return;
    }

    renderFilteredRows(table, state.rewardApps, filterState.value);
  }

  async function applyPerformanceFilter(filterValue) {
    const table = findRewardTable();
    if (!table) {
      return;
    }

    filterState.value = filterValue || FILTER_ALL;
    const headerRow = table.querySelector("thead tr");
    const performanceIndex = findPerformanceColumnIndex(table);
    ensurePerformanceFilterControl(headerRow?.children?.[performanceIndex]);

    if (filterState.value === FILTER_ALL) {
      restoreOriginalRows(table);
      return;
    }

    const requestId = filterState.requestId + 1;
    filterState.requestId = requestId;
    setPerformanceFilterLoading(true);
    updateFilterSummary(table, `正在获取全部应用数据...`);

    try {
      const response = await fetchAllRewardApps();
      if (filterState.requestId !== requestId || filterState.value === FILTER_ALL) {
        return;
      }

      if (!response?.ok) {
        updateFilterSummary(table, response?.message || "获取全部应用数据失败", true);
        return;
      }

      renderFilteredRows(table, state.rewardApps, filterState.value);
      persist();
    } catch (error) {
      if (filterState.requestId === requestId) {
        updateFilterSummary(table, `筛选失败：${error?.message || error}`, true);
      }
    } finally {
      if (filterState.requestId === requestId) {
        setPerformanceFilterLoading(false);
      }
    }
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

  function createTableCell(referenceCell, value, className = "") {
    const td = document.createElement("td");
    copyScopedAttributes(referenceCell, td);
    td.style.cssText = referenceCell?.getAttribute("style") || "";
    td.style.padding = td.style.padding || "18px 24px";
    td.style.fontSize = td.style.fontSize || "14px";
    if (className) {
      td.className = className;
    }

    const content = document.createElement("div");
    content.className = "t-cell";
    content.textContent = value || "";
    td.appendChild(content);
    return td;
  }

  function closeCustomPerformanceModal(event) {
    if (event?.type === "keydown" && event.key !== "Escape") {
      return;
    }

    document.querySelector(".ohos2026-performance-modal")?.remove();
    document.removeEventListener("keydown", closeCustomPerformanceModal);
  }

  function createModalCell(value) {
    const td = document.createElement("td");
    td.textContent = value;
    return td;
  }

  function showPerformanceDetailModal(app) {
    closeCustomPerformanceModal();

    const modal = document.createElement("div");
    modal.className = "ohos2026-performance-modal";
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeCustomPerformanceModal();
      }
    });

    const main = document.createElement("div");
    main.className = "ohos2026-performance-modal-main";

    const header = document.createElement("div");
    header.className = "ohos2026-performance-modal-header";

    const title = document.createElement("span");
    title.textContent = "有效活跃及评分明细数据";

    const closeButton = document.createElement("button");
    closeButton.className = "ohos2026-performance-modal-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "关闭");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", closeCustomPerformanceModal);

    header.append(title, closeButton);

    const content = document.createElement("div");
    content.className = "ohos2026-performance-modal-content";

    const appInfo = document.createElement("div");
    appInfo.className = "ohos2026-performance-modal-app";
    appInfo.textContent = [app?.appName, app?.appId].filter(Boolean).join(" · ");
    content.appendChild(appInfo);

    const performanceDatas = Array.isArray(app?.performanceDatas) ? [...app.performanceDatas] : [];
    if (performanceDatas.length === 0) {
      const empty = document.createElement("div");
      empty.className = "ohos2026-performance-modal-empty";
      empty.textContent = "暂无明细数据";
      content.appendChild(empty);
    } else {
      const table = document.createElement("table");
      table.className = "ohos2026-performance-modal-table";

      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      ["月份", "有效月活", "月末评分", "月末评分个数"].forEach((text) => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);

      const tbody = document.createElement("tbody");
      performanceDatas
        .sort((left, right) => getMonthSortValue(left.month) - getMonthSortValue(right.month))
        .forEach((item) => {
          const row = document.createElement("tr");
          row.append(
            createModalCell(item.month == null || item.month === "" ? "暂无" : String(item.month)),
            createModalCell(formatPerformanceMau(item.mau)),
            createModalCell(formatPerformanceRating(item.rating)),
            createModalCell(formatPerformanceRatingCount(item.ratingCount))
          );
          tbody.appendChild(row);
        });

      table.append(thead, tbody);
      content.appendChild(table);
    }

    main.append(header, content);
    modal.appendChild(main);
    document.body.appendChild(modal);
    document.addEventListener("keydown", closeCustomPerformanceModal);
  }

  function createPerformanceBodyCell(referenceCell, app) {
    const td = createTableCell(referenceCell, getPerformanceDisplayText(app), "ohos2026-performance-review-cell");
    td.classList.add("ohos2026-performance-detail-trigger");
    td.title = "查看有效活跃及评分明细数据";
    td.addEventListener("click", () => showPerformanceDetailModal(app));
    return td;
  }

  function createFilteredRow(app, table, headerRow, columnOrder) {
    const row = document.createElement("tr");
    row.className = "ohos2026-filtered-row";
    row.dataset.ohos2026Filtered = "true";

    const referenceCells = Array.from(table.querySelectorAll("tbody tr:not(.ohos2026-filtered-row) td"));
    const fallbackReference = referenceCells[0] || headerRow?.children?.[0] || null;
    const values = {
      "应用名称": app.appName || "",
      AppID: app.appId || "",
      "有效月活及评分": getPerformanceDisplayText(app),
      [MONTHLY_ACTIVE_HEADER]: app.latestMauText && app.latestMauText !== "暂无" ? app.latestMauText : "0",
      "应用类型": app.appType || "",
      "首次上架时间": app.firstOnshelfTime || "",
      "在架状态": app.isOnshelf || "",
      "功能完备情况": app.funcCompleted || "",
      "账号服务": app.accountIntegrated || ""
    };

    columnOrder.forEach((headerText, index) => {
      const reference = referenceCells[index] || fallbackReference;
      if (headerText === MONTHLY_ACTIVE_HEADER) {
        row.appendChild(createMonthlyBodyCell(reference, app));
        return;
      }

      if (headerText === "有效月活及评分") {
        row.appendChild(createPerformanceBodyCell(reference, app));
        return;
      }

      row.appendChild(createTableCell(reference, values[headerText] ?? ""));
    });
    return row;
  }

  function updatePerformanceCell(cell, app) {
    const displayText = getPerformanceDisplayText(app);
    if (!cell || !displayText || getPerformanceLabel(app) !== FAILED_PERFORMANCE_LABEL) {
      return;
    }

    cell.classList.add("ohos2026-performance-review-cell");
    cell.title = app?.latestMauMonth ? `${app.latestMauMonth}月末评分：${displayText}` : `月末评分：${displayText}`;
    if (textOf(cell).includes(displayText)) {
      cell.dataset.ohos2026PerformanceReviewText = displayText;
      return;
    }

    const previousText = cell.dataset.ohos2026PerformanceReviewText;
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      if (textNode.nodeValue.includes(FAILED_PERFORMANCE_LABEL) || (previousText && textNode.nodeValue.includes(previousText))) {
        textNode.nodeValue = textNode.nodeValue
          .replace(FAILED_PERFORMANCE_LABEL, displayText)
          .replace(previousText || FAILED_PERFORMANCE_LABEL, displayText);
        cell.dataset.ohos2026PerformanceReviewText = displayText;
        return;
      }
      textNode = walker.nextNode();
    }

    const content = cell.querySelector(".t-cell") || cell;
    content.textContent = displayText;
    cell.dataset.ohos2026PerformanceReviewText = displayText;
  }

  function updatePerformanceCells(table) {
    const headerRow = table?.querySelector("thead tr");
    if (!table || !headerRow) {
      return;
    }

    const headers = Array.from(headerRow.children);
    const performanceIndex = findPerformanceColumnIndex(table);
    const appNameIndex = getColumnIndex(headers, "应用名称");
    const appIdIndex = getColumnIndex(headers, "AppID");
    if (performanceIndex < 0 || (appNameIndex < 0 && appIdIndex < 0)) {
      return;
    }

    const appMap = getRewardAppMap();
    table.querySelectorAll("tbody tr").forEach((row) => {
      if (row.querySelectorAll("td").length <= 1) {
        return;
      }

      const cells = Array.from(row.children);
      const appId = textOf(cells[appIdIndex]);
      const appName = textOf(cells[appNameIndex]);
      const app = appMap.get(appId) || appMap.get(appName);
      updatePerformanceCell(cells[performanceIndex], app);
    });
  }

  function updateFilteredRowsMonthlyCells(table) {
    const headerRow = table?.querySelector("thead tr");
    const monthlyIndex = getColumnIndex(Array.from(headerRow?.children || []), MONTHLY_ACTIVE_HEADER);
    if (!table || monthlyIndex < 0) {
      return;
    }

    const appMap = getRewardAppMap();
    const headers = Array.from(headerRow.children);
    const appNameIndex = getColumnIndex(headers, "应用名称");
    const appIdIndex = getColumnIndex(headers, "AppID");
    table.querySelectorAll("tbody tr.ohos2026-filtered-row").forEach((row) => {
      const cells = Array.from(row.children);
      const appId = textOf(cells[appIdIndex]);
      const appName = textOf(cells[appNameIndex]);
      const app = appMap.get(appId) || appMap.get(appName);
      const monthlyCell = cells[monthlyIndex];
      if (monthlyCell) {
        monthlyCell.classList.add("ohos2026-monthly-active-cell");
        updateMonthlyBodyCell(monthlyCell, app);
      }
    });
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
    ensurePerformanceFilterControl(headers[performanceIndex]);

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

    updatePerformanceCells(table);

    if (filterState.value !== FILTER_ALL) {
      updateFilteredRowsMonthlyCells(table);
      setPageBadge("筛选结果已同步本月月活列");
      return;
    }

    const appMap = getRewardAppMap();
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
      (row) => row.querySelectorAll("td").length > 1 && !row.dataset.ohos2026Filtered
    );

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
