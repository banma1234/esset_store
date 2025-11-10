/**
 * @file 글로벌 에러 핸들러
 * @description
 * - 모든 에러를 통합 포맷으로 정규화하여 로깅한다.
 * - 응답은 항상 JSON { ok:false, message, code?, details? } 형태로 반환한다.
 * - 헤더가 이미 전송되었다면 next(err)로 위임.
 */

const { logger } = require('../utils/logers');
const { normalizeError } = require('../errors/appError');

/**
 * @function errorHandler
 * @description Express 글로벌 에러 핸들러
 * @returns {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const n = normalizeError(err);

  // 요청 컨텍스트 추출
  // @ts-ignore
  const ctx = req.ctx || {};
  const durationMs = ctx.startTs ? Date.now() - ctx.startTs : undefined;

  // 구조화된 에러 로그 (파일로 기록)
  logger.error('Unhandled Error', {
    scope: 'errorHandler',
    requestId: ctx.requestId,
    method: ctx.method,
    url: ctx.url,
    ip: ctx.ip,
    durationMs,
    error: {
      name: n.name,
      message: n.message,
      status: n.status,
      code: n.code,
      details: n.details,
      stack: n.stack,
    },
  });

  const body = {
    ok: false,
    message: n.message || 'Internal Server Error',
  };
  if (n.code !== undefined) body.code = n.code;
  if (n.details !== undefined) body.details = n.details;

  res.status(n.status || 500).json(body);
}

module.exports = { errorHandler };
