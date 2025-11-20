const { logger } = require('../utils/logers');
const { normalizeError } = require('../errors/appError');

/**
 * @function formatPrettyErrorLog
 * @description 사람이 읽기 좋은 에러 로그 문자열을 생성한다.
 * @param {ReturnType<typeof normalizeError>} n 정규화된 에러 객체
 * @param {any} ctx 요청 컨텍스트(req.ctx)
 * @param {number|undefined} durationMs 소요 시간(ms)
 * @param {import('express').Request} req Express 요청 객체
 * @returns {string} 포매팅된 에러 로그 문자열
 */
function formatPrettyErrorLog(n, ctx, durationMs, req) {
  const method = ctx.method || req.method || '-';
  const url = ctx.url || req.originalUrl || req.url || '-';
  const requestId = ctx.requestId || '-';
  const ip = ctx.ip || req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '-';

  const lines = [];

  // 1줄 요약
  lines.push(`❌ [${n.status || 500}] ${n.message}` + (n.code ? ` (code: ${n.code})` : ''));

  // 요청 정보
  lines.push(`   ↳ ${method} ${url} | requestId=${requestId}`);
  lines.push(`   ↳ ip=${ip} | duration=${durationMs ?? '-'}ms`);

  // 에러 이름
  lines.push(`   ↳ error: ${n.name || 'Error'}`);

  // details
  if (n.details) {
    const detailsPreview = typeof n.details === 'string' ? n.details : JSON.stringify(n.details, null, 2);
    lines.push('   ↳ details:');
    lines.push('     ' + detailsPreview.split('\n').slice(0, 3).join('\n     '));
  }

  // stack 상위 몇 줄
  if (n.stack) {
    const stackLines = String(n.stack).split('\n').slice(0, 3);
    lines.push('   ↳ stack:');
    lines.push('     ' + stackLines.join('\n     '));
  }

  return lines.join('\n');
}

/**
 * @function errorHandler
 * @description Express 글로벌 에러 핸들러
 * @returns {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const n = normalizeError(err);

  // @ts-ignore
  const ctx = req.ctx || {};
  const durationMs = ctx.startTs ? Date.now() - ctx.startTs : undefined;

  // 콘솔용 예쁜 로그
  const pretty = formatPrettyErrorLog(n, ctx, durationMs, req);
  // eslint-disable-next-line no-console
  console.error(pretty);

  // 파일/구조화 로그 (메시지는 짧게)
  logger.error('Unhandled Error', {
    scope: 'errorHandler',
    requestId: ctx.requestId,
    method: ctx.method || req.method,
    url: ctx.url || req.originalUrl || req.url,
    ip: ctx.ip || req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
    durationMs,
    error: {
      name: n.name,
      message: n.message,
      status: n.status,
      code: n.code,
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
