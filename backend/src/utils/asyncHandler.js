/**
 * @file 비동기 핸들러 안전 래퍼
 * @description
 * - async 라우트 핸들러의 예외를 next(err)로 위임한다.
 * - 모든 라우트에 적용하여 에러 핸들러로 수렴시킨다.
 */

/**
 * @template {import('express').RequestHandler} T
 * @param {T} fn 비동기/동기 라우트 핸들러
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
