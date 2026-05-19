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
