(() => {
  const MESSAGE_SOURCE = "ohos2026";
  const GW_RESPONSE_MESSAGE = "GW_RESPONSE";
  const REQUEST_REPLAY_MESSAGE = "REQUEST_REPLAY";
  const FETCH_ALL_REWARD_APPS_MESSAGE = "FETCH_ALL_REWARD_APPS";
  const REWARD_APP_ENDPOINT = "partnerActivityService/v1/developer/queryDeveloperRewardAppList";
  const TARGET_SERVICES = [
    REWARD_APP_ENDPOINT,
    "partnerActivityService/v1/developer/queryDeveloperRewardHotAppList"
  ];

  const capturedResponses = [];

  function safeSerialize(value) {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return JSON.stringify({
        serializationError: true,
        message: "响应中包含无法序列化的字段"
      });
    }
  }

  function postPayload(payload) {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: GW_RESPONSE_MESSAGE,
        payload: safeSerialize(payload)
      },
      window.location.origin
    );
  }

  function emit(detail) {
    const payload = {
      ...detail,
      capturedAt: new Date().toISOString()
    };

    capturedResponses.push(payload);
    postPayload(payload);
  }

  function isTargetService(serviceName) {
    return TARGET_SERVICES.some((target) => String(serviceName).includes(target));
  }

  function patchCreateGWService(opengw) {
    if (!opengw || opengw.__ohos2026Patched || typeof opengw.createGWService !== "function") {
      return false;
    }

    const originalCreateGWService = opengw.createGWService;
    if (!opengw.__ohos2026OriginalCreateGWService) {
      Object.defineProperty(opengw, "__ohos2026OriginalCreateGWService", {
        value: originalCreateGWService,
        enumerable: false
      });
    }

    opengw.createGWService = function patchedCreateGWService(serviceName, options) {
      const service = originalCreateGWService.apply(this, arguments);

      if (!isTargetService(serviceName) || typeof service !== "function") {
        return service;
      }

      return function patchedGWService(requestPayload) {
        const responsePromise = service.apply(this, arguments);

        Promise.resolve(responsePromise)
          .then((response) => {
            emit({
              serviceName,
              options,
              request: requestPayload,
              response
            });
          })
          .catch((error) => {
            emit({
              serviceName,
              options,
              request: requestPayload,
              error: {
                message: error?.message || String(error)
              }
            });
          });

        return responsePromise;
      };
    };

    Object.defineProperty(opengw, "__ohos2026Patched", {
      value: true,
      enumerable: false
    });

    return true;
  }

  function tryPatch() {
    return patchCreateGWService(window.AUI2?.OPENGW);
  }

  async function fetchRewardAppsPage(current, pageSize, clientRequestId) {
    if (!window.AUI2?.OPENGW?.createGWService || !window.AUI2?.LOGIN?.getSiteId) {
      emit({
        serviceName: REWARD_APP_ENDPOINT,
        clientRequestId,
        request: { current, pageSize },
        error: { message: "AUI2 登录服务尚未就绪" }
      });
      return null;
    }

    const createGWService =
      window.AUI2.OPENGW.__ohos2026OriginalCreateGWService || window.AUI2.OPENGW.createGWService;
    const service = createGWService.call(window.AUI2.OPENGW, REWARD_APP_ENDPOINT, {
      csZone: window.AUI2.LOGIN.getSiteId(),
      prefix: false,
      reqType: 1
    });
    const request = { current, pageSize };
    const response = await service(request);
    emit({
      serviceName: REWARD_APP_ENDPOINT,
      clientRequestId,
      request,
      response
    });
    return response;
  }

  function parseTotalCount(response) {
    try {
      const payload = JSON.parse(response?.result?.resultString || "{}");
      return Number(payload?.pageInfo?.totalCount || 0);
    } catch (_error) {
      return 0;
    }
  }

  async function fetchAllRewardApps(clientRequestId) {
    const pageSize = 200;
    const firstResponse = await fetchRewardAppsPage(1, pageSize, clientRequestId);
    const totalCount = parseTotalCount(firstResponse);
    const totalPages = Math.ceil(totalCount / pageSize);

    for (let current = 2; current <= totalPages; current += 1) {
      await fetchRewardAppsPage(current, pageSize, clientRequestId);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== MESSAGE_SOURCE) {
      return;
    }

    if (event.data?.type === REQUEST_REPLAY_MESSAGE) {
      capturedResponses.forEach(postPayload);
    }

    if (event.data?.type === FETCH_ALL_REWARD_APPS_MESSAGE) {
      fetchAllRewardApps(event.data.clientRequestId).catch((error) => {
        emit({
          serviceName: REWARD_APP_ENDPOINT,
          clientRequestId: event.data.clientRequestId,
          request: { current: 1, pageSize: 200 },
          error: { message: error?.message || String(error) }
        });
      });
    }
  });

  tryPatch();

  const interval = window.setInterval(() => {
    if (tryPatch()) {
      window.clearInterval(interval);
    }
  }, 100);

  window.setTimeout(() => window.clearInterval(interval), 30000);
})();
