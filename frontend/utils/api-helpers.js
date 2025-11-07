// utils/api-helpers.js
// fetch 공통 헬퍼: 쿼리스트링, JSON 파싱, 헤더 유틸

export function toQueryString(query = {}) {
  const params = new URLSearchParams();
  Object.keys(query || {}).forEach((k) => {
    const v = query[k];

    if (v === undefined || v === null) {
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x) => params.append(k, x));
    } else {
      params.set(k, String(v));
    }
  });
  const s = params.toString();

  return s ? `?${s}` : "";
}

export async function parseByContentType(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  if (ct.startsWith("text/")) {
    return await res.text();
  }

  // 그 외(바이너리 등)는 호출부에서 명시적으로 blob/arrayBuffer를 요청해야 함
  return null;
}

export function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}
export function isPlainObject(x) {
  return Object.prototype.toString.call(x) === "[object Object]";
}
