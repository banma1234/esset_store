const { Queue } = require('bullmq');
const { getRedisConnectionOptions } = require('../config/redis');

/** 큐 네임스페이스(prefix)와 이름(name)은 분리해서 관리 */
const { QUEUE_PREFIX, QUEUE_NAME } = process.env;
/** 공통 큐 옵션 */
const queueOptions = {
  connection: getRedisConnectionOptions(),
  prefix: QUEUE_PREFIX, // ← 여기서 네임스페이스 지정
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 10_000 },
  },
};

/** 큐 인스턴스 */
const assetPipelineQueue = new Queue(QUEUE_NAME, queueOptions);

module.exports = {
  QUEUE_PREFIX,
  QUEUE_NAME,
  assetPipelineQueue,
  queueOptions,
};
