var PAGE_URL_PATTERN = "/consumer/cn/activity/harmonyos-incentive/data-query2026";
var MESSAGE_SOURCE = "ohos2026";
var GW_RESPONSE_MESSAGE = "GW_RESPONSE";
var REQUEST_REPLAY_MESSAGE = "REQUEST_REPLAY";
var FETCH_ALL_REWARD_APPS_MESSAGE = "FETCH_ALL_REWARD_APPS";
var DATA_UPDATED_EVENT = "ohos2026:data-updated";
var STORAGE_KEY = "ohos2026.latestCapture";
var MAU_SNAPSHOT_KEY = "ohos2026.latestMauSnapshot";

var REWARD_APP_ENDPOINT = "partnerActivityService/v1/developer/queryDeveloperRewardAppList";
var HOT_APP_ENDPOINT = "partnerActivityService/v1/developer/queryDeveloperRewardHotAppList";
var MONTHLY_ACTIVE_HEADER = "本月月活";
var FAILED_PERFORMANCE_LABEL = "暂不满足";
var SCORE_VALUE_KEYS = [
  "monthEndScore",
  "monthlyScore",
  "ratingScore",
  "avgScore",
  "averageScore",
  "score",
  "rating",
  "grade",
  "rate",
  "月末评分",
  "评分"
];
var SCORE_COUNT_KEYS = [
  "monthEndScoreCount",
  "monthlyScoreCount",
  "ratingCount",
  "scoreCount",
  "commentCount",
  "reviewCount",
  "evaluationCount",
  "gradeCount",
  "rateCount",
  "ratingNum",
  "scoreNum",
  "commentNum",
  "reviewNum",
  "evaluationNum",
  "gradeNum",
  "月末评分个数",
  "评分个数",
  "评论数",
  "评价数"
];
var FILTER_ALL = "all";
var FILTER_PASSED = "passed";
var FILTER_FAILED = "failed";
var FILTER_MAU_MET_REVIEW_MISSING = "mau-met-review-missing";
var FILTER_REVIEW_MET_MAU_MISSING = "review-met-mau-missing";
var FILTER_NEAR_TARGET = "near-target";
var MAU_TARGET = 400;
var REVIEW_COUNT_TARGET = 10;
var NEAR_TARGET_MAU = 300;
var NEAR_TARGET_REVIEW_COUNT = 8;
var PERFORMANCE_FILTER_OPTIONS = [
  { value: FILTER_ALL, label: "全部" },
  { value: FILTER_PASSED, label: "已达标" },
  { value: FILTER_FAILED, label: "未达标" },
  { value: FILTER_MAU_MET_REVIEW_MISSING, label: "月活够，评分不足" },
  { value: FILTER_REVIEW_MET_MAU_MISSING, label: "评分够，月活不足" },
  { value: FILTER_NEAR_TARGET, label: "接近达标" }
];

var state = {
  lastUpdated: null,
  url: location.href,
  rewardApps: [],
  hotApps: [],
  rawResponses: [],
  tableSnapshots: []
};
var renderScheduled = false;
var previousMauByApp = {};
var lastSavedMauByApp = {};
var mauSnapshotLoaded = false;
var pendingMauSnapshotSave = false;
var filterState = {
  value: FILTER_ALL,
  requestId: 0,
  originalRows: null,
  renderingFilteredRows: false
};
var pendingFetchAllRequests = new Map();
