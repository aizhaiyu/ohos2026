var statsPanelState = {
  isOpen: false,
  loading: false,
  hasFetchedAll: false,
  nativeMenuObserver: null,
  nativeMenuMountRaf: 0
};

function formatStatsNumber(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("zh-CN").format(Number.isFinite(number) ? number : 0);
}

function formatStatsMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function getRewardAmount(app) {
  if (String(app?.appType || "").includes("热门")) {
    return 10000;
  }
  if (String(app?.appType || "").includes("新应用")) {
    return 3000;
  }
  return 0;
}

function isNewRewardApp(app) {
  return String(app?.appType || "").includes("新应用");
}

function isOnshelfApp(app) {
  return String(app?.isOnshelf || "").trim() === "在架";
}

function getUniqueStatsApps(apps) {
  return mergeRewardApps([], apps);
}

function isLatestScoreMet(app) {
  const score = getLatestScoreNumber(app);
  return score != null && score > 3;
}

function isLatestActivityQualified(app) {
  return isLatestMauMet(app) && isLatestReviewCountMet(app) && isLatestScoreMet(app);
}

function getStatsAppStatus(app) {
  const mau = getNumericMau(app) ?? 0;
  const reviewCount = getLatestReviewCount(app);
  const score = getLatestScoreNumber(app);
  const mauGap = Math.max(0, MAU_TARGET - mau);
  const reviewGap = Math.max(0, REVIEW_COUNT_TARGET - reviewCount);
  const scoreMissing = score == null || score <= 3;
  const gaps = [];

  if (mauGap > 0) {
    gaps.push(`${formatStatsNumber(mauGap)} 月活`);
  }
  if (reviewGap > 0) {
    gaps.push(`${formatStatsNumber(reviewGap)} 评`);
  }
  if (scoreMissing) {
    gaps.push(score == null ? "评分" : "评分 > 3");
  }

  return {
    mau,
    reviewCount,
    score,
    mauGap,
    reviewGap,
    scoreMissing,
    gapText: gaps.length ? `缺口：${gaps.join(" · ")}` : "本月数据已满足，等待官方确认"
  };
}

function getStatsSummary(apps) {
  const total = apps.length;
  const newApps = apps.filter(isNewRewardApp);
  const onshelfApps = apps.filter(isOnshelfApp);
  const passedApps = apps.filter((app) => getPerformanceLabel(app) === "满足");
  const passedNewApps = passedApps.filter(isNewRewardApp);
  const onshelfPendingApps = onshelfApps.filter((app) => getPerformanceLabel(app) !== "满足");
  const onshelfPendingAmount = onshelfPendingApps.reduce((sum, app) => sum + getRewardAmount(app), 0);
  const estimatedAmount = onshelfApps.reduce((sum, app) => sum + getRewardAmount(app), 0);
  const earnedAmount = passedApps.reduce((sum, app) => sum + getRewardAmount(app), 0);
  const attention = {
    currentQualified: 0,
    mauOnly: 0,
    reviewOnly: 0,
    near: 0,
    zeroMau: 0,
    other: 0
  };

  newApps
    .filter((app) => getPerformanceLabel(app) !== "满足")
    .forEach((app) => {
      const mauMet = isLatestMauMet(app);
      const reviewMet = isLatestReviewCountMet(app);
      if (isLatestActivityQualified(app)) {
        attention.currentQualified += 1;
      } else if (mauMet && !reviewMet) {
        attention.mauOnly += 1;
      } else if (reviewMet && !mauMet) {
        attention.reviewOnly += 1;
      } else if (isNearTarget(app)) {
        attention.near += 1;
      } else if ((getNumericMau(app) ?? 0) === 0) {
        attention.zeroMau += 1;
      } else {
        attention.other += 1;
      }
    });

  return {
    total,
    newAppCount: newApps.length,
    onshelfPendingAmount,
    passedCount: passedApps.length,
    passedNewCount: passedNewApps.length,
    estimatedAmount,
    earnedAmount,
    attention
  };
}

function getPriorityApps(apps) {
  return apps
    .filter((app) => isNewRewardApp(app) && getPerformanceLabel(app) !== "满足")
    .map((app) => {
      const status = getStatsAppStatus(app);
      const nearBonus = isNearTarget(app) ? -1 : 0;
      const scorePenalty = status.scoreMissing ? 0.6 : 0;
      const priorityScore = status.mauGap / MAU_TARGET + status.reviewGap / REVIEW_COUNT_TARGET + scorePenalty + nearBonus;
      return { app, status, priorityScore };
    })
    .sort((left, right) => left.priorityScore - right.priorityScore)
    .slice(0, 8);
}

function createStatsElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (text != null) {
    element.textContent = text;
  }
  return element;
}

function createStatsButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function setStatsPanelOpen(isOpen) {
  statsPanelState.isOpen = isOpen;
  const root = document.getElementById("ohos2026-stats-root");
  if (!root) {
    return;
  }

  root.classList.toggle("is-open", isOpen);
  root.querySelector(".ohos2026-stats-drawer")?.setAttribute("aria-hidden", isOpen ? "false" : "true");
  const fab = getStatsFabElement();
  fab?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  fab?.classList.toggle("is-panel-open", isOpen);
  if (isOpen) {
    ensureFullStatsData();
    renderStatsPanel();
  }
}

function handleStatsPanelKeydown(event) {
  if (event.key === "Escape") {
    setStatsPanelOpen(false);
  }
}

function getStatsFabElement() {
  return document.getElementById("ohos2026-stats-fab");
}

function handleStatsFabClick(event) {
  event.preventDefault();
  event.stopPropagation();
  setStatsPanelOpen(!statsPanelState.isOpen);
}

function stopStatsFabNativeEvent(event) {
  event.stopPropagation();
}

function mountStatsFabToHuaweiMenu() {
  const root = document.getElementById("ohos2026-stats-root");
  const fab = getStatsFabElement();
  if (!root || !fab) {
    return;
  }

  const nativeMenu = document.querySelector(".suspension-menu");
  if (nativeMenu) {
    nativeMenu.classList.add("ohos2026-suspension-menu");
    if (fab.parentElement !== nativeMenu) {
      nativeMenu.appendChild(fab);
    }
    fab.classList.add("is-native-mounted");
    root.classList.add("has-native-fab");
    return;
  }

  if (fab.parentElement !== root) {
    root.insertBefore(fab, root.firstChild);
  }
  fab.classList.remove("is-native-mounted");
  root.classList.remove("has-native-fab");
}

function scheduleStatsFabMount() {
  if (statsPanelState.nativeMenuMountRaf) {
    return;
  }

  statsPanelState.nativeMenuMountRaf = window.requestAnimationFrame(() => {
    statsPanelState.nativeMenuMountRaf = 0;
    mountStatsFabToHuaweiMenu();
  });
}

function watchHuaweiSuspensionMenu() {
  if (statsPanelState.nativeMenuObserver || !document.body) {
    return;
  }

  statsPanelState.nativeMenuObserver = new MutationObserver(scheduleStatsFabMount);
  statsPanelState.nativeMenuObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  [0, 300, 1000, 2500].forEach((delay) => {
    window.setTimeout(scheduleStatsFabMount, delay);
  });
}

function ensureStatsPanel() {
  if (document.getElementById("ohos2026-stats-root")) {
    scheduleStatsFabMount();
    return;
  }

  const root = document.createElement("div");
  root.id = "ohos2026-stats-root";
  root.className = "ohos2026-stats-root";

  const fab = document.createElement("button");
  fab.id = "ohos2026-stats-fab";
  fab.type = "button";
  fab.className = "ohos2026-stats-fab top_btn";
  fab.title = "打开激励总览";
  fab.setAttribute("aria-label", "打开激励总览");
  fab.setAttribute("aria-expanded", "false");

  const icon = document.createElement("span");
  icon.className = "ohos2026-stats-fab-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createStatsElement("span", ""), createStatsElement("span", ""), createStatsElement("span", ""));

  const label = createStatsElement("span", "ohos2026-stats-fab-label", "激励总览");
  fab.append(icon, label);
  fab.addEventListener("click", handleStatsFabClick);
  fab.addEventListener("mousedown", stopStatsFabNativeEvent);
  fab.addEventListener("mouseup", stopStatsFabNativeEvent);

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "ohos2026-stats-backdrop";
  backdrop.setAttribute("aria-label", "关闭统计面板");
  backdrop.addEventListener("click", () => setStatsPanelOpen(false));

  const drawer = document.createElement("aside");
  drawer.className = "ohos2026-stats-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-label", "激励统计面板");

  root.append(fab, backdrop, drawer);
  document.body.appendChild(root);
  document.addEventListener("keydown", handleStatsPanelKeydown);
  window.addEventListener(DATA_UPDATED_EVENT, renderStatsPanel);
  window.addEventListener(PRIVACY_UPDATED_EVENT, renderStatsPanel);
  watchHuaweiSuspensionMenu();
  scheduleStatsFabMount();
  renderStatsPanel();
}

function createStatsSectionTitle(title, extraText) {
  const header = createStatsElement("div", "ohos2026-stats-section-head");
  header.appendChild(createStatsElement("div", "ohos2026-stats-section-title", title));
  if (extraText) {
    header.appendChild(createStatsElement("div", "ohos2026-stats-section-extra", extraText));
  }
  return header;
}

function getStatsPercent(value, total) {
  if (!total) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function createLegendRow(color, label, value) {
  const row = createStatsElement("div", "ohos2026-stats-legend-row");
  const dot = createStatsElement("span", "ohos2026-stats-legend-dot");
  dot.style.background = color;
  row.append(dot, createStatsElement("span", "ohos2026-stats-legend-label", label), createStatsElement("span", "ohos2026-stats-legend-value", value));
  return row;
}

function getDonutGradient(segments) {
  const total = segments.reduce((sum, item) => sum + Math.max(0, Number(item.value || 0)), 0);
  if (!total) {
    return "#edf1f5";
  }

  let cursor = 0;
  const stops = segments
    .filter((item) => Number(item.value || 0) > 0)
    .map((item) => {
      const start = cursor;
      const end = cursor + (Number(item.value) / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    });
  return `conic-gradient(${stops.join(", ")})`;
}

function createSummaryStat(label, value, modifierClass) {
  const item = createStatsElement("div", "ohos2026-stats-summary-stat");
  if (modifierClass) {
    item.classList.add(modifierClass);
  }
  item.append(createStatsElement("div", "ohos2026-stats-summary-stat-label", label), createStatsElement("div", "ohos2026-stats-summary-stat-value", value));
  return item;
}

function createRequirementChip(color, label, value) {
  const chip = createStatsElement("div", "ohos2026-stats-requirement-chip");
  const dot = createStatsElement("span", "ohos2026-stats-legend-dot");
  dot.style.background = color;
  chip.append(dot, createStatsElement("span", "ohos2026-stats-requirement-label", label), createStatsElement("span", "ohos2026-stats-requirement-value", value));
  return chip;
}

function createSummaryCard(summary) {
  const progress = getStatsPercent(summary.passedCount, summary.total);
  const card = createStatsElement("div", "ohos2026-stats-summary-card");

  const hero = createStatsElement("div", "ohos2026-stats-summary-hero");
  const amount = createStatsElement("div", "ohos2026-stats-summary-amount");
  amount.append(createStatsElement("div", "ohos2026-stats-summary-label", "预计激励"), createStatsElement("div", "ohos2026-stats-summary-value", formatStatsMoney(summary.estimatedAmount)));

  const stats = createStatsElement("div", "ohos2026-stats-summary-stats");
  stats.append(
    createSummaryStat("已获激励", formatStatsMoney(summary.earnedAmount), "is-earned"),
    createSummaryStat("待达标激励", formatStatsMoney(summary.onshelfPendingAmount))
  );
  hero.append(amount, stats);

  const progressHead = createStatsElement("div", "ohos2026-stats-summary-progress-head");
  progressHead.append(
    createStatsElement("span", "", "达标进度"),
    createStatsElement("span", "", `${formatStatsNumber(summary.passedCount)} / ${formatStatsNumber(summary.total)} · ${progress}%`)
  );

  const progressWrap = createStatsElement("div", "ohos2026-stats-main-progress");
  const bar = createStatsElement("span", "ohos2026-stats-main-progress-bar");
  bar.style.width = `${progress}%`;
  progressWrap.appendChild(bar);

  const requirements = createStatsElement("div", "ohos2026-stats-requirements");
  requirements.append(
    createRequirementChip("#28c98b", "月活", `≥${formatStatsNumber(MAU_TARGET)}`),
    createRequirementChip("#4aa3ff", "评论", `≥${formatStatsNumber(REVIEW_COUNT_TARGET)}评`),
    createRequirementChip("#ffb84d", "评分", ">3.0")
  );

  card.append(hero, progressHead, progressWrap, requirements);
  return card;
}

function createDistributionLegendItem(item, total) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ohos2026-stats-distribution-item";
  button.disabled = !item.filterValue;
  button.title = item.filterValue ? `筛选：${item.label}` : item.label;
  if (item.filterValue) {
    button.addEventListener("click", () => applyStatsFilter(item.filterValue));
  }

  const dot = createStatsElement("span", "ohos2026-stats-legend-dot");
  dot.style.background = item.color;
  const label = createStatsElement("span", "ohos2026-stats-distribution-label", item.label);
  const value = createStatsElement(
    "span",
    "ohos2026-stats-distribution-value",
    `${formatStatsNumber(item.value)} · ${getStatsPercent(item.value, total)}%`
  );
  button.append(dot, label, value);
  return button;
}

function getDistributionInsight(summary, readyCount) {
  if (!summary.newAppCount) {
    return "暂无新应用数据";
  }
  if (readyCount >= summary.newAppCount) {
    return "本月新应用均已进入达标区";
  }
  if (summary.attention.mauOnly >= summary.attention.reviewOnly && summary.attention.mauOnly > 0) {
    return "主要卡在评分与评论";
  }
  if (summary.attention.reviewOnly > 0) {
    return "主要卡在月活增长";
  }
  if (summary.attention.near > 0) {
    return "已有应用接近达标线";
  }
  if (summary.attention.zeroMau > 0) {
    return "仍有应用暂无月活";
  }
  return "未达标应用分散在不同缺口";
}

function createDistributionCard(summary) {
  const pendingOtherCount = summary.attention.zeroMau + summary.attention.other;
  const readyCount = summary.passedNewCount + summary.attention.currentQualified;
  const readyPercent = getStatsPercent(readyCount, summary.newAppCount);
  const segments = [
    { label: "满足/待确认", value: readyCount, color: "#28c98b" },
    { label: "月活够，评分不足", value: summary.attention.mauOnly, color: "#ffb84d", filterValue: FILTER_MAU_MET_REVIEW_MISSING },
    { label: "评分够，月活不足", value: summary.attention.reviewOnly, color: "#4aa3ff", filterValue: FILTER_REVIEW_MET_MAU_MISSING },
    { label: "接近达标", value: summary.attention.near, color: "#9b7cf8", filterValue: FILTER_NEAR_TARGET },
    { label: "其他未达标", value: pendingOtherCount, color: "#cbd5e1" }
  ];

  const card = createStatsElement("div", "ohos2026-stats-distribution-card");
  const info = createStatsElement("div", "ohos2026-stats-distribution-info");
  info.append(
    createStatsElement("div", "ohos2026-stats-info-title", "当前分布"),
    createStatsElement("div", "ohos2026-stats-distribution-note", "新应用本月达标状态"),
    createStatsElement("div", "ohos2026-stats-distribution-insight", getDistributionInsight(summary, readyCount))
  );

  const ring = createStatsElement("div", "ohos2026-stats-distribution-ring");
  ring.style.background = getDonutGradient(segments);
  const center = createStatsElement("div", "ohos2026-stats-distribution-center");
  center.append(createStatsElement("div", "ohos2026-stats-donut-title", "达标率"), createStatsElement("div", "ohos2026-stats-donut-value", `${readyPercent}%`));
  ring.appendChild(center);

  const legend = createStatsElement("div", "ohos2026-stats-distribution-list");
  segments.forEach((item) => legend.appendChild(createDistributionLegendItem(item, summary.newAppCount)));

  card.append(info, ring, legend);
  return card;
}

function formatPriorityMetricValue(label, value, target, suffix) {
  if (label === "评分") {
    return `${value == null ? "暂无" : String(value)} / >3.0`;
  }
  return `${formatStatsNumber(value)} / ${formatStatsNumber(target)}${suffix}`;
}

function createPriorityMetric(label, value, target, suffix, isMet) {
  const metric = createStatsElement("div", "ohos2026-stats-priority-metric");
  if (isMet) {
    metric.classList.add("is-met");
  }
  metric.append(
    createStatsElement("span", "ohos2026-stats-priority-metric-label", label),
    createStatsElement("span", "ohos2026-stats-priority-metric-value", formatPriorityMetricValue(label, value, target, suffix))
  );
  return metric;
}

function createOverviewBoard(summary) {
  const board = createStatsElement("div", "ohos2026-stats-overview-card");
  board.appendChild(createStatsElement("div", "ohos2026-stats-overview-title", "激励统计情况"));

  const secondRow = createStatsElement("div", "ohos2026-stats-overview-row is-secondary");

  secondRow.append(createDistributionCard(summary));

  board.append(createSummaryCard(summary), secondRow);
  return board;
}

function createPriorityItem(item) {
  const { app, status } = item;
  const row = createStatsElement("div", "ohos2026-stats-priority-item");

  const main = createStatsElement("div", "ohos2026-stats-priority-main");
  const title = createStatsElement("div", "ohos2026-stats-priority-title", maskPrivateValue(app.appName || "未命名应用"));
  const meta = createStatsElement(
    "div",
    "ohos2026-stats-priority-meta",
    [app.appType, app.isOnshelf].filter(Boolean).join(" · ")
  );
  main.append(title, meta);

  const data = createStatsElement("div", "ohos2026-stats-priority-data");
  data.append(
    createPriorityMetric("月活", status.mau, MAU_TARGET, "", status.mauGap === 0),
    createPriorityMetric("评论", status.reviewCount, REVIEW_COUNT_TARGET, "评", status.reviewGap === 0),
    createPriorityMetric("评分", status.score, 5, "", !status.scoreMissing)
  );

  const gap = createStatsElement("div", "ohos2026-stats-priority-gap", status.gapText);
  const reward = createStatsElement("div", "ohos2026-stats-priority-reward", getRewardAmount(app) ? formatStatsMoney(getRewardAmount(app)) : "");
  row.append(main, data, gap, reward);
  return row;
}

function createEmptyStatsContent() {
  const empty = createStatsElement("div", "ohos2026-stats-empty");
  empty.append(
    createStatsElement("div", "ohos2026-stats-empty-title", statsPanelState.loading ? "正在读取全量数据" : "等待页面数据"),
    createStatsElement("div", "ohos2026-stats-empty-text", "页面加载或登录完成后会自动读取全量应用数据。")
  );
  return empty;
}

function ensureFullStatsData() {
  if (statsPanelState.loading || statsPanelState.hasFetchedAll) {
    return;
  }
  handleStatsFetchAll();
}

function createPrivacyToggle() {
  const label = document.createElement("label");
  label.className = "ohos2026-stats-privacy-toggle";
  label.title = "隐藏应用名称和 AppID";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = isPrivacyModeEnabled();
  input.addEventListener("change", () => setPrivacyModeEnabled(input.checked));

  const track = createStatsElement("span", "ohos2026-stats-privacy-track");
  const text = createStatsElement("span", "ohos2026-stats-privacy-text", "隐私");
  label.append(input, track, text);
  return label;
}

function renderStatsPanel() {
  const drawer = document.querySelector("#ohos2026-stats-root .ohos2026-stats-drawer");
  if (!drawer) {
    return;
  }

  const apps = getUniqueStatsApps(Array.isArray(state.rewardApps) ? state.rewardApps : []);
  const summary = getStatsSummary(apps);
  const header = createStatsElement("div", "ohos2026-stats-header");
  const titleWrap = createStatsElement("div", "");
  titleWrap.appendChild(createStatsElement("div", "ohos2026-stats-title", "激励统计"));

  const headerActions = createStatsElement("div", "ohos2026-stats-header-actions");
  const versionBadge = createStatsElement("span", "ohos2026-stats-version", `v${chrome.runtime.getManifest().version}`);

  const sourceLink = document.createElement("a");
  sourceLink.className = "ohos2026-stats-source-link";
  sourceLink.href = "https://github.com/aizhaiyu/ohos2026";
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.textContent = "开源地址";

  const closeButton = createStatsButton("×", "ohos2026-stats-close", () => setStatsPanelOpen(false));
  closeButton.setAttribute("aria-label", "关闭");
  headerActions.append(createPrivacyToggle(), versionBadge, sourceLink, closeButton);
  header.append(titleWrap, headerActions);

  const body = createStatsElement("div", "ohos2026-stats-body");
  if (apps.length === 0) {
    body.appendChild(createEmptyStatsContent());
  } else {
    const priority = createStatsElement("div", "ohos2026-stats-section");
    priority.appendChild(createStatsSectionTitle("重点关注", "按缺口从小到大"));
    const priorityList = createStatsElement("div", "ohos2026-stats-priority-list");
    const priorityApps = getPriorityApps(apps);
    if (priorityApps.length) {
      priorityApps.forEach((item) => priorityList.appendChild(createPriorityItem(item)));
    } else {
      priorityList.appendChild(createStatsElement("div", "ohos2026-stats-list-empty", "暂无重点关注应用"));
    }
    priority.appendChild(priorityList);

    body.append(createOverviewBoard(summary), priority);
  }

  drawer.replaceChildren(header, body);
}

async function handleStatsFetchAll() {
  if (statsPanelState.loading) {
    return;
  }

  statsPanelState.loading = true;
  renderStatsPanel();

  try {
    const response = await fetchAllRewardApps();
    if (response?.ok) {
      statsPanelState.hasFetchedAll = true;
      refreshActiveFilterRows();
      persist();
    }
  } catch (_error) {
    // The panel stays quiet; page data will update on the next successful capture.
  } finally {
    statsPanelState.loading = false;
    renderStatsPanel();
  }
}

async function applyStatsFilter(filterValue) {
  renderStatsPanel();
  await applyPerformanceFilter(filterValue);
  renderStatsPanel();
  setStatsPanelOpen(false);
}
