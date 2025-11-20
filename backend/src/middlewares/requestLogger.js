const morgan = require('morgan');
const { httpStream } = require('../utils/logers');

/**
 * @function requestLogger
 * @description 요청/응답 로그를 남기는 Express 미들웨어
 * @returns {import('express').RequestHandler}
 */
function requestLogger() {
  return morgan('combined', { stream: httpStream });
}

module.exports = { requestLogger };
