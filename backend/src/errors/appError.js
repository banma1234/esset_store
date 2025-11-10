/**
 * @file AppError 및 에러 정규화 유틸
 * @description
 * - 모든 에러를 하나의 구조로 정규화하여 로깅/응답에 사용한다.
 * - status(HTTP), code(비즈니스 코드), details(배열/객체) 등을 포함한다.
 */

/**
 * @class AppError
 * @classdesc 통합 에러 표현을 위한 커스텀 에러
 */
class AppError extends Error {
  /**
   * @param {string} message 에러 메시지
   * @param {number} [status=500] HTTP 상태 코드
   * @param {string} [code] 비즈니스 에러 코드(선택)
   * @param {any} [details] 추가 정보(선택)
   */
  constructor(message, status = 500, code, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (code) this.code = code;
    if (details !== undefined) this.details = details;
  }
}

/**
 * @function normalizeError
 * @description 임의의 에러를 통합 포맷으로 변환한다.
 * @param {unknown} err 임의의 에러
 * @returns {{
 *   name: string, message: string, status: number, code?: string|number,
 *   details?: any, stack?: string
 * }}
 */
function normalizeError(err) {
  if (err instanceof AppError) {
    return {
      name: err.name,
      message: err.message,
      status: err.status ?? 500,
      code: err.code,
      details: err.details,
      stack: err.stack,
    };
  }

  // Mongoose/DB/기타 에러 매핑 예시
  const any = /** @type {any} */ (err) || {};
  const status = any.status || any.statusCode || (any.name === 'ValidationError' ? 400 : 500);

  return {
    name: any.name || 'Error',
    message: any.message || 'Unknown error',
    status,
    code: any.code, // 예: 11000(duplicate key)
    details: any.errors || any.details,
    stack: any.stack,
  };
}

module.exports = { AppError, normalizeError };
