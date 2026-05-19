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
