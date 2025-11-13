const { assetPipelineQueue } = require('../queues/asset.queue');
const { AppError } = require('../errors/appError');

/**
 * @typedef {Object} EnqueueThumbPayload
 * @property {string} gltfKey   .gltf 객체 키
 * @property {string} fileName  에셋 파일명(폴더 구성용)
 * @property {number} version   버전 번호
 * @property {string=} fileBase 썸네일 파일명 베이스(생략 시 timestamp)
 * @property {number=} width    기본 200
 * @property {number=} height   기본 200
 */

const DEFAULT_PAGE_SETUP = {
  width: 200,
  height: 200,
};

/**
 * @function buildThumbKey
 * @description 표준 썸네일 키 생성
 * @param {string} fileName
 * @param {number} version
 * @param {string|number} [base]
 * @returns {string}
 */
function buildThumbKey(fileName, version, base) {
  const safe = base + String(Date.now());
  return `assets/thumbnail/${fileName}/${version}/${safe}.jpg`;
}

/**
 * @function buildJobId
 * @description 멱등 잡 ID(동일 gltfKey/thumbKey 조합의 중복 등록 방지)
 */
function buildJobId(gltfKey, thumbKey) {
  return `thumb@${gltfKey}@${thumbKey}`;
}

/**
 * @function enqueueThumbnailJob
 * @description 썸네일 생성 잡을 큐에 등록
 * @param {EnqueueThumbPayload} body
 */
async function enqueueThumbnailJob(body) {
  const { key, fileName, version } = body;
  const { width, height } = DEFAULT_PAGE_SETUP;

  if (!key || !key.toLowerCase().endsWith('gltf')) {
    throw new AppError('유효한 key값이 아닙니다.', 422, 'KEY_MISMATCH');
  }

  const thumbKey = buildThumbKey(fileName, version, `thumb_${fileName}_`);
  const jobId = buildJobId(key, thumbKey);

  //   await assetPipelineQueue.resume(); // 글로벌 resume
  //   await assetPipelineQueue.resume(true); // 로컬 resume

  const job = await assetPipelineQueue.add(
    'generate-thumbnail',
    { key, thumbKey, width, height },
    {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    },
  );

  return job;
}

module.exports = {
  enqueueThumbnailJob,
  buildThumbKey,
  buildJobId,
};
