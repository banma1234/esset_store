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
