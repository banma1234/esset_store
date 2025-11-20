const { randomUUID } = require('crypto');

/**
 * @typedef {object} RequestContext
 * @property {string} requestId 요청 ID
 * @property {number} startTs 요청 시작 시각(epoch ms)
 * @property {string} method HTTP 메서드
 * @property {string} url 원본 URL
 * @property {string} ip 클라이언트 IP
 */

/**
 * @function requestContext
 * @description 요청에 컨텍스트(req.ctx)를 주입하는 미들웨어
 * @returns {import('express').RequestHandler}
 */
function requestContext() {
  return (req, _res, next) => {
    /** @type {RequestContext} */
    const ctx = {
      requestId: randomUUID(),
      startTs: Date.now(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '',
    };
    // @ts-ignore
    req.ctx = ctx;
    next();
  };
}

module.exports = { requestContext };
