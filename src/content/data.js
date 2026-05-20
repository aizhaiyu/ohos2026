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

function getLatestReviewCount(app) {
  if (!app) {
    return 0;
  }

  if (app.latestReviewCount != null && app.latestReviewCount !== "") {
    const value = Number(app.latestReviewCount);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  const latestPerformance = getLatestPerformanceData(app.performanceDatas);
  const value = normalizeCount(pickFirstValue(latestPerformance, SCORE_COUNT_KEYS));
  return value ?? 0;
}

function getLatestScoreNumber(app) {
  const value = app?.latestScore;
  if (value == null || value === "" || value === "暂无" || value === "不涉及") {
    return null;
  }

  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function isLatestMauMet(app) {
  return (getNumericMau(app) ?? 0) >= MAU_TARGET;
}

function isLatestReviewCountMet(app) {
  return getLatestReviewCount(app) >= REVIEW_COUNT_TARGET;
}

function isCurrentMonthQualified(app) {
  return isLatestMauMet(app) && isLatestReviewCountMet(app);
}

function isNearTarget(app) {
  if (getPerformanceLabel(app) === "满足" || isCurrentMonthQualified(app)) {
    return false;
  }

  return (getNumericMau(app) ?? 0) >= NEAR_TARGET_MAU || getLatestReviewCount(app) >= NEAR_TARGET_REVIEW_COUNT;
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
  if (filterValue === FILTER_MAU_MET_REVIEW_MISSING) {
    return label !== "满足" && isLatestMauMet(app) && !isLatestReviewCountMet(app);
  }
  if (filterValue === FILTER_REVIEW_MET_MAU_MISSING) {
    return label !== "满足" && isLatestReviewCountMet(app) && !isLatestMauMet(app);
  }
  if (filterValue === FILTER_NEAR_TARGET) {
    return isNearTarget(app);
  }
  return true;
}

function getFilterLabel(filterValue) {
  return PERFORMANCE_FILTER_OPTIONS.find((option) => option.value === filterValue)?.label || "全部";
}

function getSortLabel(sortValue) {
  return PERFORMANCE_SORT_OPTIONS.find((option) => option.value === sortValue)?.label || "默认顺序";
}

function getHeaderLabel(cell) {
  if (!cell) {
    return "";
  }

  const clone = cell.cloneNode(true);
  clone.querySelectorAll(".ohos2026-performance-menu, .ohos2026-performance-filter-arrow").forEach((element) => element.remove());
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
