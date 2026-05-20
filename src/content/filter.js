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

function createPerformanceMenuItem(config) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ohos2026-performance-menu-item";
  button.dataset.ohos2026Type = config.type;
  button.dataset.ohos2026Value = config.value;
  button.textContent = config.label;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) {
      return;
    }

    closePerformanceMenu();
    if (config.type === "action" && config.value === "reload") {
      window.location.reload();
      return;
    }
    if (config.type === "filter") {
      applyPerformanceView({ filterValue: config.value });
      return;
    }
    if (config.type === "sort") {
      applyPerformanceView({ sortValue: config.value });
    }
  });
  return button;
}

function createPerformanceMenuSection(title, items, type) {
  const section = document.createElement("div");
  section.className = "ohos2026-performance-menu-section";

  const titleElement = document.createElement("div");
  titleElement.className = "ohos2026-performance-menu-title";
  titleElement.textContent = title;
  section.appendChild(titleElement);

  items.forEach((item) => section.appendChild(createPerformanceMenuItem({ ...item, type })));
  return section;
}

function createPerformanceMenu() {
  const menu = document.createElement("div");
  menu.className = "ohos2026-performance-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.append(
    createPerformanceMenuSection("筛选", PERFORMANCE_FILTER_OPTIONS, "filter"),
    createPerformanceMenuSection("排序", PERFORMANCE_SORT_OPTIONS, "sort"),
    createPerformanceMenuSection("操作", [{ value: "reload", label: "恢复页面原样" }], "action")
  );
  return menu;
}

function closePerformanceMenu() {
  activePerformanceMenuAnchor = null;
  if (performanceMenuPositionRaf) {
    window.cancelAnimationFrame(performanceMenuPositionRaf);
    performanceMenuPositionRaf = 0;
  }
  document.querySelectorAll(".ohos2026-performance-filter-wrap.is-open").forEach((wrapper) => {
    wrapper.classList.remove("is-open");
  });
  document.querySelectorAll(".ohos2026-performance-menu").forEach((menu) => {
    menu.hidden = true;
  });
  document.removeEventListener("click", closePerformanceMenu);
  document.removeEventListener("keydown", closePerformanceMenuOnEscape);
  window.removeEventListener("scroll", schedulePerformanceMenuPosition, true);
  window.removeEventListener("resize", schedulePerformanceMenuPosition);
}

function closePerformanceMenuOnEscape(event) {
  if (event.key === "Escape") {
    closePerformanceMenu();
  }
}

function updatePerformanceMenuState(wrapper) {
  if (!wrapper) {
    return;
  }

  getPerformanceMenu().querySelectorAll(".ohos2026-performance-menu-item").forEach((item) => {
    const type = item.dataset.ohos2026Type;
    const value = item.dataset.ohos2026Value;
    const active = (type === "filter" && value === filterState.value) || (type === "sort" && value === filterState.sortValue);
    item.classList.toggle("is-active", active);
  });
}

function getPerformanceMenu() {
  let menu = document.body.querySelector(":scope > .ohos2026-performance-menu");
  if (!menu) {
    menu = createPerformanceMenu();
    document.body.appendChild(menu);
  }
  return menu;
}

function isUsablePerformanceAnchor(wrapper) {
  if (!wrapper || !document.documentElement.contains(wrapper)) {
    return false;
  }

  const rect = wrapper.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
}

function positionPerformanceMenu(wrapper, menu) {
  if (!isUsablePerformanceAnchor(wrapper)) {
    closePerformanceMenu();
    return;
  }

  const rect = wrapper.getBoundingClientRect();
  const width = 184;
  const gap = 8;
  const viewportPadding = 10;
  const preferredMenuHeight = Math.min(menu.scrollHeight || menu.offsetHeight || 420, 420);
  const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportPadding);
  const spaceAbove = Math.max(0, rect.top - gap - viewportPadding);
  const minUsefulHeight = Math.min(180, preferredMenuHeight);
  const placeBelow = spaceBelow >= minUsefulHeight || spaceBelow >= spaceAbove;
  const availableHeight = placeBelow ? spaceBelow : spaceAbove;
  const menuHeight = Math.max(80, Math.min(preferredMenuHeight, availableHeight || window.innerHeight - viewportPadding * 2));
  const top = placeBelow ? rect.bottom + gap : Math.max(viewportPadding, rect.top - menuHeight - gap);
  const left = Math.min(Math.max(viewportPadding, rect.left), window.innerWidth - width - viewportPadding);
  const anchorCenter = rect.left + rect.width / 2;
  const arrowLeft = Math.min(Math.max(left + 18, anchorCenter - 8), left + width - 34);
  const arrowTop = placeBelow ? top - 7 : top + menuHeight - 9;

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.maxHeight = `${menuHeight}px`;
  menu.style.setProperty("--ohos2026-performance-menu-arrow-left", `${arrowLeft}px`);
  menu.style.setProperty("--ohos2026-performance-menu-arrow-top", `${arrowTop}px`);
}

function schedulePerformanceMenuPosition(event) {
  const menu = document.body.querySelector(":scope > .ohos2026-performance-menu");
  if (!activePerformanceMenuAnchor || !menu || menu.hidden) {
    return;
  }

  if (event?.target && menu.contains(event.target)) {
    return;
  }

  if (performanceMenuPositionRaf) {
    return;
  }

  performanceMenuPositionRaf = window.requestAnimationFrame(() => {
    performanceMenuPositionRaf = 0;
    positionPerformanceMenu(activePerformanceMenuAnchor, menu);
  });
}

function openPerformanceMenu(wrapper) {
  if (!wrapper || wrapper.classList.contains("is-loading")) {
    return;
  }

  const menu = getPerformanceMenu();
  const shouldOpen = !wrapper.classList.contains("is-open");
  closePerformanceMenu();
  if (!shouldOpen) {
    return;
  }

  updatePerformanceMenuState(wrapper);
  wrapper.classList.add("is-open");
  activePerformanceMenuAnchor = wrapper;
  menu.hidden = false;
  positionPerformanceMenu(wrapper, menu);
  document.addEventListener("click", closePerformanceMenu);
  document.addEventListener("keydown", closePerformanceMenuOnEscape);
  window.addEventListener("scroll", schedulePerformanceMenuPosition, true);
  window.addEventListener("resize", schedulePerformanceMenuPosition);
}

function ensurePerformanceFilterControl(headerCell) {
  if (!headerCell) {
    return null;
  }

  headerCell.classList.add("ohos2026-performance-filter-header");
  let wrapper = headerCell.querySelector(".ohos2026-performance-filter-wrap");
  if (!wrapper) {
    const content = headerCell.querySelector(".t-cell") || headerCell;
    const originalText = getHeaderLabel(headerCell);
    content.textContent = "";

    wrapper = document.createElement("span");
    wrapper.className = "ohos2026-performance-filter-wrap";
    wrapper.title = "筛选或排序全量应用";
    wrapper.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPerformanceMenu(wrapper);
    });

    const label = document.createElement("span");
    label.className = "ohos2026-performance-filter-label";
    label.textContent = originalText || "有效月活及评分";

    const arrow = document.createElement("span");
    arrow.className = "ohos2026-performance-filter-arrow";
    arrow.textContent = "▼";

    wrapper.append(label, arrow);
    content.appendChild(wrapper);
  }
  wrapper.dataset.ohos2026ColumnIndex = String(Array.from(headerCell.parentElement?.children || []).indexOf(headerCell));
  updatePerformanceMenuState(wrapper);
  return wrapper;
}

function setPerformanceFilterLoading(isLoading) {
  document.querySelectorAll(".ohos2026-performance-filter-wrap").forEach((wrapper) => {
    wrapper.classList.toggle("is-loading", isLoading);
  });
  getPerformanceMenu().querySelectorAll(".ohos2026-performance-menu-item").forEach((button) => {
    button.disabled = isLoading;
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

function createFilterSummaryContent(filterValue, sortValue, matchedCount, totalCount) {
  const fragment = document.createDocumentFragment();
  fragment.append("筛选：", getFilterLabel(filterValue), " ");

  const count = document.createElement("span");
  count.className = "ohos2026-filter-summary-count";
  count.textContent = `${matchedCount} / ${totalCount}`;
  fragment.appendChild(count);

  if (sortValue !== SORT_DEFAULT) {
    fragment.append(" · 排序：", getSortLabel(sortValue));
  }
  fragment.append("，已临时显示全量结果");
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

function getSortNumberValue(app, sortValue) {
  if (sortValue === SORT_MAU_DESC || sortValue === SORT_MAU_ASC) {
    return getNumericMau(app);
  }
  if (sortValue === SORT_REVIEW_DESC || sortValue === SORT_REVIEW_ASC) {
    return getLatestReviewCount(app);
  }
  if (sortValue === SORT_SCORE_DESC || sortValue === SORT_SCORE_ASC) {
    return getLatestScoreNumber(app);
  }
  return null;
}

function compareAppIdentity(left, right) {
  const leftKey = String(left?.appName || left?.appId || "");
  const rightKey = String(right?.appName || right?.appId || "");
  return leftKey.localeCompare(rightKey, "zh-Hans-CN");
}

function sortPerformanceApps(apps, sortValue) {
  const direction = String(sortValue).endsWith("-asc") ? 1 : -1;
  if (sortValue === SORT_DEFAULT) {
    return apps;
  }

  return [...apps].sort((left, right) => {
    const leftValue = getSortNumberValue(left, sortValue);
    const rightValue = getSortNumberValue(right, sortValue);
    const leftMissing = leftValue == null || Number.isNaN(leftValue);
    const rightMissing = rightValue == null || Number.isNaN(rightValue);
    if (leftMissing && rightMissing) {
      return compareAppIdentity(left, right);
    }
    if (leftMissing) {
      return 1;
    }
    if (rightMissing) {
      return -1;
    }
    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * direction;
    }
    return compareAppIdentity(left, right);
  });
}

function getPerformanceViewApps(apps) {
  return sortPerformanceApps(apps.filter((app) => matchesPerformanceFilter(app, filterState.value)), filterState.sortValue);
}

function shouldUsePerformanceView() {
  return filterState.viewActive || filterState.value !== FILTER_ALL || filterState.sortValue !== SORT_DEFAULT;
}

function renderPerformanceViewRows(table, apps) {
  const tbody = table?.querySelector("tbody");
  const headerRow = table?.querySelector("thead tr");
  if (!tbody || !headerRow) {
    return;
  }

  snapshotOriginalRows(tbody);
  const columnOrder = Array.from(headerRow.children).map(getHeaderLabel);
  const viewApps = getPerformanceViewApps(apps);
  const rows = viewApps.map((app) => createFilteredRow(app, table, headerRow, columnOrder));

  if (rows.length === 0) {
    const row = document.createElement("tr");
    row.className = "ohos2026-filtered-row";
    const cell = document.createElement("td");
    cell.className = "ohos2026-filtered-empty";
    cell.colSpan = Math.max(columnOrder.length, 1);
    cell.textContent = "没有符合条件的应用";
    row.appendChild(cell);
    rows.push(row);
  }

  filterState.renderingFilteredRows = true;
  tbody.replaceChildren(...rows);
  filterState.renderingFilteredRows = false;
  setRewardPaginationHidden(table, true);
  updateFilterSummary(table, createFilterSummaryContent(filterState.value, filterState.sortValue, viewApps.length, apps.length));
  applyPrivacyMaskToTable(table);
}

function refreshActiveFilterRows() {
  if (!shouldUsePerformanceView() || filterState.renderingFilteredRows) {
    return;
  }

  const table = findRewardTable();
  if (!table) {
    return;
  }

  renderPerformanceViewRows(table, state.rewardApps);
}

async function ensureFullRewardAppsForPerformanceView(table, requestId) {
  if (filterState.hasFetchedAll) {
    return { ok: true, state };
  }

  updateFilterSummary(table, `正在获取全部应用数据...`);
  const response = await fetchAllRewardApps();
  if (filterState.requestId !== requestId) {
    return { ok: false, ignored: true };
  }
  if (response?.ok) {
    filterState.hasFetchedAll = true;
  }
  return response;
}

async function applyPerformanceView({ filterValue, sortValue } = {}) {
  const table = findRewardTable();
  if (!table) {
    return;
  }

  if (filterValue != null) {
    filterState.value = filterValue || FILTER_ALL;
  }
  if (sortValue != null) {
    filterState.sortValue = sortValue || SORT_DEFAULT;
  }
  const headerRow = table.querySelector("thead tr");
  const performanceIndex = findPerformanceColumnIndex(table);
  const wrapper = ensurePerformanceFilterControl(headerRow?.children?.[performanceIndex]);
  const shouldRestoreOriginal = filterState.value === FILTER_ALL && filterState.sortValue === SORT_DEFAULT;

  if (shouldRestoreOriginal) {
    filterState.viewActive = false;
    restoreOriginalRows(table);
    updatePerformanceMenuState(wrapper);
    persist();
    return;
  }

  filterState.viewActive = true;
  const requestId = filterState.requestId + 1;
  filterState.requestId = requestId;
  setPerformanceFilterLoading(true);

  try {
    const response = await ensureFullRewardAppsForPerformanceView(table, requestId);
    if (filterState.requestId !== requestId || response?.ignored) {
      return;
    }

    if (!response?.ok) {
      updateFilterSummary(table, response?.message || "获取全部应用数据失败", true);
      return;
    }

    renderPerformanceViewRows(table, state.rewardApps);
    persist();
  } catch (error) {
    if (filterState.requestId === requestId) {
      updateFilterSummary(table, `处理失败：${error?.message || error}`, true);
    }
  } finally {
    if (filterState.requestId === requestId) {
      setPerformanceFilterLoading(false);
      updatePerformanceMenuState(wrapper);
    }
  }
}

async function applyPerformanceFilter(filterValue) {
  await applyPerformanceView({ filterValue });
}
