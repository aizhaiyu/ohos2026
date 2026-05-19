function isPrivacyModeEnabled() {
  return Boolean(privacyModeEnabled);
}

function maskPrivateValue(value) {
  return isPrivacyModeEnabled() && value ? PRIVACY_MASK : value;
}

function maskPrivateText(value) {
  return isPrivacyModeEnabled() ? PRIVACY_MASK : value;
}

function applyPrivacyMaskToCell(cell, shouldMask) {
  if (!cell) {
    return;
  }

  const content = cell.querySelector(".t-cell") || cell;
  if (!content.dataset.ohos2026PrivacyOriginal) {
    content.dataset.ohos2026PrivacyOriginal = content.textContent || "";
  }
  content.textContent = shouldMask ? PRIVACY_MASK : content.dataset.ohos2026PrivacyOriginal;
}

function getPrivateCellText(cell) {
  const content = cell?.querySelector?.(".t-cell") || cell;
  return content?.dataset?.ohos2026PrivacyOriginal || textOf(cell);
}

function applyPrivacyMaskToTable(table = findRewardTable()) {
  if (!table) {
    return;
  }

  const headerRow = table.querySelector("thead tr");
  if (!headerRow) {
    return;
  }

  const headers = Array.from(headerRow.children);
  const appNameIndex = getColumnIndex(headers, "应用名称");
  const appIdIndex = getColumnIndex(headers, "AppID");
  const targetIndexes = [appNameIndex, appIdIndex].filter((index) => index >= 0);
  if (!targetIndexes.length) {
    return;
  }

  table.querySelectorAll("tbody tr").forEach((row) => {
    const cells = Array.from(row.children);
    targetIndexes.forEach((index) => applyPrivacyMaskToCell(cells[index], isPrivacyModeEnabled()));
  });
}

function applyPrivacyMode() {
  applyPrivacyMaskToTable();
  window.dispatchEvent(new CustomEvent(PRIVACY_UPDATED_EVENT, { detail: { enabled: isPrivacyModeEnabled() } }));
}

function setPrivacyModeEnabled(enabled) {
  privacyModeEnabled = Boolean(enabled);
  chrome.storage.local.set({ [PRIVACY_STORAGE_KEY]: privacyModeEnabled });
  applyPrivacyMode();
}

function loadPrivacyMode() {
  chrome.storage.local.get(PRIVACY_STORAGE_KEY, (result) => {
    privacyModeEnabled = Boolean(result?.[PRIVACY_STORAGE_KEY]);
    applyPrivacyMode();
  });
}
