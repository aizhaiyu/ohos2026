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

function openPerformanceFilterSelect(select) {
  if (!select || select.disabled) {
    return;
  }

  select.focus();
  if (typeof select.showPicker === "function") {
    select.showPicker();
  }
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
    wrapper.addEventListener("click", (event) => {
      const selectElement = wrapper.querySelector(".ohos2026-performance-filter");
      if (event.target !== selectElement) {
        event.preventDefault();
        event.stopPropagation();
        openPerformanceFilterSelect(selectElement);
      }
    });

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
    window.location.reload();
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
