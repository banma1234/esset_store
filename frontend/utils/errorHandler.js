// utils/errorHandler.js
// - 에러 표준화(normalize): { code, message, stack, details }
// - 에러 생성 팩토리(createError)
// - 에러 리포터(report): 나중에 서버 로깅/추적 시스템으로 확장 가능

export function normalizeError(err, context = {}) {
  if (!err) {
    return {
      code: "UNKNOWN",
      message: "Unknown error",
      stack: "",
      details: { context },
    };
  }

  // 이미 표준형이면 그대로(추가 컨텍스트만 병합)
  if (err && err.code && err.message) {
    return { ...err, details: { ...(err.details || {}), context } };
  }

  // 일반 Error
  if (err instanceof Error) {
    return {
      code: err.code || "ERROR",
      message: err.message || "Unexpected error",
      stack: String(err.stack || ""),
      details: { context },
    };
  }

  // 서버에서 온 JSON 형태
  if (typeof err === "object") {
    return {
      code: err.code || "ERROR",
      message: err.message || JSON.stringify(err),
      stack: "",
      details: { ...(err.details || {}), context },
    };
  }

  // 문자열/기타
  return {
    code: "ERROR",
    message: String(err),
    stack: "",
    details: { context },
  };
}

export function createError(code, message, details) {
  const e = new Error(message);
  e.code = code;
  e.details = details;

  return e;
}

// 실제에선 여기서 서버로 전송하거나 Sentry 등 연결
export async function reportError(errObj) {
  // TODO: 서버 로깅 API 연동
  // await fetch('/api/logs', { method:'POST', body: JSON.stringify(errObj) })
  // 지금은 콘솔로만
  // eslint-disable-next-line no-console
  console.error(
    "[REPORT]",
    errObj.code,
    errObj.message,
    errObj.details || {},
    errObj.stack || ""
  );
}
