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
    .ohos2026-monthly-active-header,
    .ohos2026-monthly-active-header .t-cell,
    .ohos2026-monthly-active-cell {
      text-align: left !important;
    }
    .ohos2026-performance-filter-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      max-width: 100%;
      cursor: pointer;
      vertical-align: middle;
    }
    .ohos2026-performance-filter-label {
      display: inline-block;
      max-width: calc(100% - 18px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }
    .ohos2026-performance-filter {
      position: static;
      flex: 0 0 16px;
      width: 16px;
      height: 18px;
      margin: 0;
      padding: 0;
      border: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      color: transparent;
      font-size: 0;
      line-height: 1;
      cursor: pointer;
    }
    .ohos2026-performance-filter option {
      color: rgba(0, 0, 0, 0.88);
      font-size: 13px;
    }
    .ohos2026-performance-filter-wrap::after {
      content: "▼";
      position: absolute;
      top: 50%;
      right: 2px;
      color: rgba(0, 0, 0, 0.46);
      font-size: 10px;
      line-height: 1;
      pointer-events: none;
      transform: translateY(-50%) scaleY(0.78);
    }
    .ohos2026-performance-filter-wrap:hover::after,
    .ohos2026-performance-filter-wrap:focus-within::after {
      color: rgba(0, 0, 0, 0.72);
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
    .ohos2026-stats-root,
    .ohos2026-stats-root * {
      box-sizing: border-box;
    }
    .ohos2026-stats-fab,
    .ohos2026-stats-fab * {
      box-sizing: border-box;
    }
    .ohos2026-stats-fab {
      position: fixed;
      right: 24px;
      bottom: 88px;
      z-index: 9998;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      width: 104px;
      height: 36px;
      padding: 0 12px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 18px;
      background: #fff;
      color: rgba(0, 0, 0, 0.86);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      line-height: 1;
      transition: border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
    }
    .suspension-menu.ohos2026-suspension-menu {
      overflow: visible;
    }
    .suspension-menu .ohos2026-stats-fab.is-native-mounted {
      position: absolute;
      top: -104px;
      right: 4px;
      z-index: 2;
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      width: 40px;
      height: 96px;
      padding: 8px 0;
      border: 0;
      border-radius: 20px;
      background: #0a59f7;
      box-shadow: 0 6px 16px rgba(10, 89, 247, 0.34);
      backdrop-filter: blur(120px);
      color: #fff;
      font-size: 13px;
      line-height: 1;
    }
    .ohos2026-stats-fab:hover,
    .ohos2026-stats-fab:focus-visible {
      border-color: rgba(10, 89, 247, 0.46);
      color: #0a59f7;
      box-shadow: 0 8px 22px rgba(10, 89, 247, 0.16);
      outline: none;
    }
    .suspension-menu .ohos2026-stats-fab.is-native-mounted:hover,
    .suspension-menu .ohos2026-stats-fab.is-native-mounted:focus-visible {
      border: 0;
      background: #084bd8;
      color: #fff;
      box-shadow: 0 8px 20px rgba(10, 89, 247, 0.42);
    }
    .ohos2026-stats-fab-icon {
      display: inline-flex;
      align-items: flex-end;
      gap: 2px;
      width: 14px;
      height: 14px;
    }
    .suspension-menu .ohos2026-stats-fab.is-native-mounted .ohos2026-stats-fab-icon {
      display: inline-flex;
      flex: 0 0 auto;
      width: 13px;
      height: 13px;
    }
    .suspension-menu .ohos2026-stats-fab.is-native-mounted .ohos2026-stats-fab-label {
      display: inline-block;
      white-space: nowrap;
      flex: 0 0 auto;
      writing-mode: vertical-rl;
      text-orientation: upright;
      letter-spacing: 0;
    }
    .ohos2026-stats-fab-icon span {
      display: block;
      width: 3px;
      border-radius: 2px;
      background: currentColor;
      opacity: 0.82;
    }
    .ohos2026-stats-fab-icon span:nth-child(1) {
      height: 6px;
    }
    .ohos2026-stats-fab-icon span:nth-child(2) {
      height: 11px;
    }
    .ohos2026-stats-fab-icon span:nth-child(3) {
      height: 8px;
    }
    .ohos2026-stats-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9996;
      display: none;
      border: 0;
      background: rgba(0, 0, 0, 0.24);
      cursor: default;
      opacity: 0;
      transition: opacity 0.18s ease;
    }
    .ohos2026-stats-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9997;
      display: flex;
      flex-direction: column;
      width: min(860px, calc(100vw - 32px));
      height: 100vh;
      background: #fff;
      border-left: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: -12px 0 32px rgba(0, 0, 0, 0.14);
      transform: translateX(104%);
      transition: transform 0.22s ease;
      color: rgba(0, 0, 0, 0.86);
      font-size: 14px;
    }
    .ohos2026-stats-root.is-open .ohos2026-stats-backdrop {
      display: block;
      opacity: 1;
    }
    .ohos2026-stats-root.is-open .ohos2026-stats-fab,
    .ohos2026-stats-fab.is-panel-open {
      opacity: 0;
      pointer-events: none;
    }
    .ohos2026-stats-root.is-open .ohos2026-stats-drawer {
      transform: translateX(0);
    }
    .ohos2026-stats-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 24px 18px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    .ohos2026-stats-title {
      color: rgba(0, 0, 0, 0.9);
      font-size: 18px;
      font-weight: 600;
      line-height: 24px;
    }
    .ohos2026-stats-header-actions {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .ohos2026-stats-version {
      color: rgba(0, 0, 0, 0.42);
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }
    .ohos2026-stats-privacy-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: rgba(0, 0, 0, 0.52);
      cursor: pointer;
      font-size: 12px;
      line-height: 18px;
      user-select: none;
      white-space: nowrap;
    }
    .ohos2026-stats-privacy-toggle input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .ohos2026-stats-privacy-track {
      position: relative;
      width: 28px;
      height: 16px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.14);
      transition: background 0.18s ease;
    }
    .ohos2026-stats-privacy-track::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
      transition: transform 0.18s ease;
    }
    .ohos2026-stats-privacy-toggle input:checked + .ohos2026-stats-privacy-track {
      background: #0a59f7;
    }
    .ohos2026-stats-privacy-toggle input:checked + .ohos2026-stats-privacy-track::after {
      transform: translateX(12px);
    }
    .ohos2026-stats-privacy-toggle:hover,
    .ohos2026-stats-privacy-toggle:focus-within {
      color: rgba(0, 0, 0, 0.82);
    }
    .ohos2026-stats-source-link {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 10px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.72);
      color: rgba(0, 0, 0, 0.62);
      cursor: pointer;
      font-size: 12px;
      font-weight: 400;
      line-height: 26px;
      text-decoration: none;
      transition: border-color 0.18s ease, color 0.18s ease, background 0.18s ease;
      white-space: nowrap;
    }
    .ohos2026-stats-source-link:hover,
    .ohos2026-stats-source-link:focus-visible {
      border-color: rgba(10, 89, 247, 0.28);
      background: rgba(10, 89, 247, 0.04);
      color: #0a59f7;
      outline: none;
    }
    .ohos2026-stats-close {
      flex: 0 0 auto;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: 15px;
      background: transparent;
      color: rgba(0, 0, 0, 0.46);
      cursor: pointer;
      font-size: 24px;
      font-weight: 300;
      line-height: 28px;
    }
    .ohos2026-stats-close:hover,
    .ohos2026-stats-close:focus-visible {
      background: rgba(0, 0, 0, 0.04);
      color: rgba(0, 0, 0, 0.82);
      outline: none;
    }
    .ohos2026-stats-body {
      flex: 1 1 auto;
      overflow: auto;
      padding: 20px;
      background: #f6f8fb;
    }
    .ohos2026-stats-overview-card {
      padding: 18px;
      border: 1px solid rgba(20, 35, 65, 0.06);
      border-radius: 12px;
      background:
        radial-gradient(circle at 12% 0%, rgba(70, 132, 255, 0.08), transparent 34%),
        linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
      box-shadow: 0 14px 36px rgba(18, 42, 80, 0.08);
    }
    .ohos2026-stats-overview-title {
      margin-bottom: 14px;
      color: rgba(0, 0, 0, 0.86);
      font-size: 15px;
      font-weight: 600;
      line-height: 22px;
    }
    .ohos2026-stats-overview-row {
      display: grid;
      gap: 12px;
      align-items: stretch;
    }
    .ohos2026-stats-overview-row + .ohos2026-stats-overview-row {
      margin-top: 12px;
    }
    .ohos2026-stats-overview-row.is-secondary {
      grid-template-columns: 1fr;
    }
    .ohos2026-stats-summary-card,
    .ohos2026-stats-distribution-card {
      min-width: 0;
      padding: 16px;
      border: 1px solid rgba(20, 35, 65, 0.06);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.82);
      box-shadow: 0 8px 24px rgba(18, 42, 80, 0.06);
    }
    .ohos2026-stats-summary-card {
      background:
        radial-gradient(circle at 92% -10%, rgba(245, 158, 11, 0.12), transparent 36%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 251, 255, 0.9));
    }
    .ohos2026-stats-summary-hero {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) minmax(260px, 0.9fr);
      gap: 18px;
      align-items: start;
    }
    .ohos2026-stats-summary-label,
    .ohos2026-stats-summary-stat-label,
    .ohos2026-stats-info-title {
      color: rgba(0, 0, 0, 0.52);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-summary-value {
      margin-top: 4px;
      color: rgba(0, 0, 0, 0.9);
      font-size: 34px;
      font-weight: 600;
      line-height: 42px;
      overflow-wrap: anywhere;
    }
    .ohos2026-stats-summary-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .ohos2026-stats-summary-stat {
      min-width: 0;
      padding: 11px 12px;
      border: 1px solid rgba(20, 35, 65, 0.06);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.72);
    }
    .ohos2026-stats-summary-stat-value {
      margin-top: 4px;
      color: rgba(0, 0, 0, 0.78);
      font-size: 18px;
      font-weight: 600;
      line-height: 24px;
      overflow-wrap: anywhere;
    }
    .ohos2026-stats-summary-stat.is-earned .ohos2026-stats-summary-stat-value {
      color: #b7791f;
    }
    .ohos2026-stats-summary-progress-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 18px;
      color: rgba(0, 0, 0, 0.56);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-summary-progress-head span:last-child {
      color: rgba(0, 0, 0, 0.82);
      font-weight: 500;
      white-space: nowrap;
    }
    .ohos2026-stats-main-progress {
      height: 7px;
      margin-top: 10px;
      overflow: hidden;
      border-radius: 999px;
      background: #e9eef6;
    }
    .ohos2026-stats-main-progress-bar {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #ffb84d;
    }
    .ohos2026-stats-requirements {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .ohos2026-stats-requirement-chip {
      min-width: 0;
      display: grid;
      grid-template-columns: 6px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border: 1px solid rgba(20, 35, 65, 0.06);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.62);
      color: rgba(0, 0, 0, 0.62);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-requirement-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-requirement-value {
      color: rgba(0, 0, 0, 0.82);
      font-weight: 500;
      white-space: nowrap;
    }
    .ohos2026-stats-legend {
      display: grid;
      gap: 6px;
      margin-top: 10px;
    }
    .ohos2026-stats-legend-row {
      display: grid;
      grid-template-columns: 8px minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      color: rgba(0, 0, 0, 0.56);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .ohos2026-stats-legend-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-legend-value {
      color: rgba(0, 0, 0, 0.72);
    }
    .ohos2026-stats-distribution-card {
      display: grid;
      grid-template-columns: minmax(150px, 0.7fr) 190px minmax(260px, 1fr);
      align-items: center;
      gap: 20px;
      background:
        radial-gradient(circle at 80% 0%, rgba(155, 124, 248, 0.1), transparent 35%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.88));
    }
    .ohos2026-stats-distribution-note {
      margin-top: 8px;
      color: rgba(0, 0, 0, 0.46);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-distribution-insight {
      margin-top: 12px;
      color: rgba(0, 0, 0, 0.82);
      font-size: 16px;
      font-weight: 500;
      line-height: 22px;
    }
    .ohos2026-stats-distribution-ring {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 172px;
      height: 172px;
      border-radius: 50%;
      box-shadow: 0 10px 26px rgba(18, 42, 80, 0.08);
    }
    .ohos2026-stats-distribution-ring::before {
      content: "";
      position: absolute;
      inset: 22px;
      border-radius: 50%;
      background: #fff;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
    }
    .ohos2026-stats-distribution-center {
      position: relative;
      z-index: 1;
      max-width: 96px;
      text-align: center;
    }
    .ohos2026-stats-donut-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-donut-value {
      margin-top: 3px;
      color: rgba(0, 0, 0, 0.9);
      font-size: 22px;
      font-weight: 600;
      line-height: 28px;
      overflow-wrap: anywhere;
    }
    .ohos2026-stats-distribution-list {
      display: grid;
      gap: 8px;
    }
    .ohos2026-stats-distribution-item {
      display: grid;
      grid-template-columns: 8px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      color: rgba(0, 0, 0, 0.72);
      cursor: pointer;
      font-size: 12px;
      line-height: 18px;
      text-align: left;
      transition: background 0.18s ease, border-color 0.18s ease;
    }
    .ohos2026-stats-distribution-item:hover,
    .ohos2026-stats-distribution-item:focus-visible {
      border-color: rgba(10, 89, 247, 0.18);
      background: rgba(10, 89, 247, 0.04);
      outline: none;
    }
    .ohos2026-stats-distribution-item:disabled {
      cursor: default;
      opacity: 1;
    }
    .ohos2026-stats-distribution-item:disabled:hover {
      border-color: transparent;
      background: transparent;
    }
    .ohos2026-stats-distribution-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-distribution-value {
      color: rgba(0, 0, 0, 0.58);
      white-space: nowrap;
    }
    .ohos2026-stats-section {
      margin-top: 18px;
    }
    .ohos2026-stats-section-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .ohos2026-stats-section-title {
      color: rgba(0, 0, 0, 0.88);
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
    }
    .ohos2026-stats-section-extra {
      color: rgba(0, 0, 0, 0.46);
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }
    .ohos2026-stats-priority-list {
      display: grid;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      background: #fff;
    }
    .ohos2026-stats-priority-item {
      position: relative;
      display: grid;
      grid-template-columns: minmax(120px, 1fr) minmax(260px, 1.7fr) minmax(150px, 0.9fr) auto;
      align-items: center;
      gap: 14px;
      min-height: 66px;
      padding: 12px 14px;
      background: #fff;
    }
    .ohos2026-stats-priority-item + .ohos2026-stats-priority-item {
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }
    .ohos2026-stats-priority-item:hover {
      background: #fbfdff;
    }
    .ohos2026-stats-priority-main {
      min-width: 0;
    }
    .ohos2026-stats-priority-title {
      overflow: hidden;
      color: rgba(0, 0, 0, 0.88);
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-priority-meta,
    .ohos2026-stats-priority-gap {
      color: rgba(0, 0, 0, 0.48);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-priority-gap {
      overflow: hidden;
      color: rgba(0, 0, 0, 0.58);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ohos2026-stats-priority-reward {
      color: #b7791f;
      font-size: 13px;
      font-weight: 500;
      line-height: 20px;
      white-space: nowrap;
    }
    .ohos2026-stats-priority-data {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      color: rgba(0, 0, 0, 0.74);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-priority-metric {
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding: 5px 7px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 6px;
      background: #f7f9fc;
      color: rgba(0, 0, 0, 0.62);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-priority-metric.is-met {
      border-color: rgba(40, 201, 139, 0.18);
      background: rgba(40, 201, 139, 0.06);
    }
    .ohos2026-stats-priority-metric-label {
      color: rgba(0, 0, 0, 0.52);
      white-space: nowrap;
    }
    .ohos2026-stats-priority-metric-value {
      color: rgba(0, 0, 0, 0.82);
      white-space: nowrap;
    }
    .ohos2026-stats-list-empty {
      color: rgba(0, 0, 0, 0.5);
      font-size: 12px;
      line-height: 18px;
    }
    .ohos2026-stats-empty {
      display: grid;
      justify-items: start;
      gap: 10px;
      padding: 24px 18px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      background: #fff;
    }
    .ohos2026-stats-empty-title {
      color: rgba(0, 0, 0, 0.88);
      font-size: 15px;
      font-weight: 500;
      line-height: 22px;
    }
    .ohos2026-stats-empty-text {
      color: rgba(0, 0, 0, 0.52);
      font-size: 13px;
      line-height: 20px;
    }
    @media (max-width: 640px) {
      .ohos2026-stats-fab {
        right: 16px;
        bottom: 72px;
      }
      .ohos2026-stats-drawer {
        top: auto;
        bottom: 0;
        width: 100vw;
        height: min(86vh, 720px);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        border-left: 0;
        border-radius: 12px 12px 0 0;
        transform: translateY(104%);
      }
      .ohos2026-stats-root.is-open .ohos2026-stats-drawer {
        transform: translateY(0);
      }
      .ohos2026-stats-overview-row,
      .ohos2026-stats-overview-row.is-secondary {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-summary-hero,
      .ohos2026-stats-summary-stats,
      .ohos2026-stats-requirements {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-summary-value {
        font-size: 28px;
        line-height: 36px;
      }
      .ohos2026-stats-distribution-card {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-distribution-ring {
        justify-self: center;
        width: 128px;
        height: 128px;
      }
      .ohos2026-stats-priority-item {
        grid-template-columns: 1fr;
        gap: 8px;
        align-items: stretch;
      }
      .ohos2026-stats-priority-data {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-priority-gap {
        white-space: normal;
      }
      .ohos2026-stats-priority-reward {
        justify-self: start;
      }
    }
    @media (min-width: 641px) and (max-width: 980px) {
      .ohos2026-stats-overview-row.is-secondary {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-summary-hero {
        grid-template-columns: 1fr;
      }
      .ohos2026-stats-distribution-card {
        grid-template-columns: 1fr 190px;
      }
      .ohos2026-stats-distribution-list {
        grid-column: 1 / -1;
      }
      .ohos2026-stats-priority-item {
        grid-template-columns: minmax(120px, 1fr) auto;
      }
      .ohos2026-stats-priority-data {
        grid-column: 1 / -1;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .ohos2026-stats-priority-gap {
        grid-column: 1 / -1;
      }
      .ohos2026-stats-priority-reward {
        justify-self: end;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .ohos2026-stats-fab,
      .ohos2026-stats-backdrop,
      .ohos2026-stats-drawer,
      .ohos2026-stats-privacy-track,
      .ohos2026-stats-privacy-track::after {
        transition: none;
      }
    }
  `;
  document.documentElement.appendChild(style);
}

function setPageBadge(message) {
  console.log(`OHOS2026: ${message}`);
}
