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
