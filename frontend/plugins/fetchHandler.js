// plugins/api.js
// 모든 API 요청을 fetch로 통일. 전역 $api 주입.
// - 기본 URL/헤더/타임아웃/에러 표준화 처리
// - JSON 자동 직렬화 및 응답 파싱
// - 비 2xx 응답은 $err로 표준화/report 후 throw

import {
  toQueryString,
  parseByContentType,
  isFormData,
  isPlainObject,
} from "@/utils/api-helpers";

/**
 * API 클라이언트 팩토리
 * @param {Object} opts
 *  - baseURL: 기본 API URL (예: http://localhost:4000/api/v1)
 *  - defaultHeaders: 기본 헤더(함수/객체). 함수면 매 호출 시 실행.
 *  - getAuthToken: 함수. 결과를 Authorization 헤더에 Bearer로 자동 추가(선택).
 *  - defaultTimeout: ms. AbortController로 타임아웃(기본 15s).
 *  - onError: 공통 에러 훅(선택).
 */
function createApiClient(
  ctx,
  {
    baseURL = process.env.API_BASE_URL || "http://localhost:4000/api/v1",
    defaultHeaders = {},
    getAuthToken = null,
    defaultTimeout = 15000, // 15s
    onError = null,
  } = {}
) {
  const { app } = ctx; // $err 사용을 위해

  async function request(
    path,
    {
      method = "GET",
      query = null,
      headers = {},
      body = undefined,
      timeout = defaultTimeout,
      responseType = "auto", // 'auto'|'json'|'text'|'blob'|'arrayBuffer'|'raw'
      // 에러 메시지를 호출자 친화적으로 override 하고 싶을 때
      errorMessage = null,
      // 인증 필요 없게 강제하고 싶을 때
      skipAuth = false,
    } = {}
  ) {
    // URL 구성
    const url =
      path.startsWith("http://") || path.startsWith("https://")
        ? path
        : `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;

    const qs = query ? toQueryString(query) : "";
    const finalURL = `${url}${qs}`;

    // 헤더 구성
    const baseHeaders =
      typeof defaultHeaders === "function"
        ? await defaultHeaders()
        : defaultHeaders || {};
    const finalHeaders = new Headers({ ...baseHeaders, ...headers });

    // Authorization 자동 주입
    if (!skipAuth && typeof getAuthToken === "function") {
      const token = await getAuthToken();

      if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
    }

    // Body 처리(JSON 자동 직렬화)
    let finalBody = body;
    if (body !== undefined && !isFormData(body) && isPlainObject(body)) {
      finalHeaders.set("Content-Type", "application/json");
      finalBody = JSON.stringify(body);
    }
    // FormData면 Content-Type 자동 설정되므로 건드리지 않음.

    // 타임아웃
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);

    // fetch 실행
    let res;
    try {
      res = await fetch(finalURL, {
        method,
        headers: finalHeaders,
        body: finalBody,
        signal: ac.signal,
        credentials: "omit", // 필요시 'include'
      });
    } catch (e) {
      clearTimeout(timer);
      // 네트워크/타임아웃
      const err = app.$err.create(
        "NETWORK_ERROR",
        e?.message || "네트워크 오류 혹은 시간 초과",
        {
          where: "API.fetch",
          url: finalURL,
          method,
          timeout,
        }
      );
      const norm = app.$err.normalize(err);
      app.$err.report(norm);
      onError && onError(norm);

      throw err;
    } finally {
      clearTimeout(timer);
    }

    // 2xx가 아니면 에러 JSON을 파싱해 메시지 추출
    if (!res.ok) {
      let payload = null;

      try {
        payload = await res.clone().json();
      } catch {
        /* noop */
      }

      const serverMsg =
        payload?.message || payload?.error || (await res.text());
      const msg = errorMessage || serverMsg || `요청 실패 (HTTP ${res.status})`;

      const err = app.$err.create("API_ERROR", msg, {
        where: "API.response",
        url: finalURL,
        method,
        status: res.status,
        payload,
      });
      const norm = app.$err.normalize(err);
      app.$err.report(norm);
      onError && onError(norm);

      throw err;
    }

    // 응답 파싱
    if (responseType === "raw") return res;
    if (responseType === "json") return await res.json();
    if (responseType === "text") return await res.text();
    if (responseType === "blob") return await res.blob();
    if (responseType === "arrayBuffer") return await res.arrayBuffer();

    // auto: content-type 보고 적절히 추론
    return await parseByContentType(res);
  }

  // HTTP 메서드별 편의 함수
  const get = (p, opts = {}) => request(p, { ...opts, method: "GET" });
  const post = (p, body, opts = {}) =>
    request(p, { ...opts, method: "POST", body });
  const put = (p, body, opts = {}) =>
    request(p, { ...opts, method: "PUT", body });
  const patch = (p, body, opts = {}) =>
    request(p, { ...opts, method: "PATCH", body });
  const del = (p, opts = {}) => request(p, { ...opts, method: "DELETE" });

  // 안전 호출(throw 대신 {data, error})
  async function tryRequest(p, opts) {
    try {
      return { data: await request(p, opts), error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }

  return { request, tryRequest, get, post, put, patch, del };
}

export default function (ctx, inject) {
  // $err 플러그인이 먼저 로드되어 있어야 함.
  const api = createApiClient(ctx, {
    baseURL: process.env.API_BASE_URL || "http://localhost:4000/api/v1",
    defaultHeaders: async () => ({
      // 공통 헤더(필요 시): 'X-Requested-With': 'fetch'
    }),
    // 필요 시 토큰 주입 방법(예시):
    getAuthToken: null, // async () => localStorage.getItem('access_token')
    defaultTimeout: 15000,
    onError: null, // 에러 훅: (normalizedError) => {}
  });

  inject("api", api);
}
