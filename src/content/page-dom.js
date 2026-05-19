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
