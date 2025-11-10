/**
 * @file HTTP 요청 로거 미들웨어
 * @description
 * - morgan을 winston 스트림과 연결하여 파일로 요청/응답 로그를 남긴다.
 * - 포맷: 'combined' (원한다면 토큰 커스터마이징 가능)
 */

const morgan = require('morgan');
const { httpStream } = require('../utils/logers');

/**
 * @function requestLogger
 * @description 요청/응답 로그를 남기는 Express 미들웨어
 * @returns {import('express').RequestHandler}
 */
function requestLogger() {
  // 예: :method :url :status :res[content-length] - :response-time ms
  return morgan('combined', { stream: httpStream });
}

module.exports = { requestLogger };
