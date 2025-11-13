/**
 * @typedef {Object} RedisConnOptions
 * @property {string} host Redis 호스트명
 * @property {number} port Redis 포트
 * @property {string|undefined} password Redis 패스워드(옵션)
 * @property {boolean} enableReadyCheck Ready 체크 사용 여부
 */

/**
 * @function getRedisConnectionOptions
 * @description 환경변수에서 BullMQ용 Redis 연결 옵션을 생성한다.
 * @returns {RedisConnOptions}
 */
function getRedisConnectionOptions() {
  const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

  return {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    password: REDIS_PASSWORD || undefined,
    enableReadyCheck: true,
  };
}

module.exports = { getRedisConnectionOptions };
