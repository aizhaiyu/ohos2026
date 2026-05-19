function buildCurrentMauSnapshot() {
  const apps = { ...lastSavedMauByApp };
  for (const app of state.rewardApps) {
    const key = getAppKey(app);
    const record = getBaselineMauRecord(app);
    if (key && record) {
      apps[key] = record;
    }
    if (app.appName && record) {
      apps[String(app.appName).trim()] = record;
    }
  }
  return apps;
}

function saveCurrentMauSnapshot() {
  const apps = buildCurrentMauSnapshot();
  if (Object.keys(apps).length === 0) {
    return;
  }

  if (!mauSnapshotLoaded) {
    pendingMauSnapshotSave = true;
    return;
  }

  lastSavedMauByApp = apps;

  chrome.storage.local.set({
    [MAU_SNAPSHOT_KEY]: {
      capturedAt: new Date().toISOString(),
      apps
    }
  });
}

function loadPreviousMauSnapshot() {
  chrome.storage.local.get(MAU_SNAPSHOT_KEY, (result) => {
    const snapshot = result?.[MAU_SNAPSHOT_KEY] || {};
    lastSavedMauByApp = normalizeStoredMauMap(snapshot.apps, getSnapshotMonthKey(snapshot.capturedAt));
    previousMauByApp = lastSavedMauByApp;
    mauSnapshotLoaded = true;
    renderMonthlyActiveColumn();

    if (pendingMauSnapshotSave) {
      pendingMauSnapshotSave = false;
      saveCurrentMauSnapshot();
    }
  });
}

function prepareMauComparison() {
  if (mauSnapshotLoaded) {
    previousMauByApp = lastSavedMauByApp;
  }
}
