const { Worker } = require('bullmq');
const { queueOptions, QUEUE_NAME } = require('../queues/asset.queue');
const { getSafeObjectBuffer, putThumbnail } = require('../services/assets/assets.service');
const { renderGltfToJpeg } = require('../services/assets/thumbnail.service');
const { extractGltfMetadata } = require('../services/assets/unpackageAssets.service');
const { injectMetadata } = require('../services/assets/injectMetaData.service');

const { AppError } = require('../errors/appError');

/**
 * @typedef {Object} ThumbJobData
 * @property {string} key  S3/MinIO의 .gltf 키
 * @property {string} thumbKey 결과 썸네일 업로드 키
 * @property {number} width    썸네일 너비
 * @property {number} height   썸네일 높이
 * @property {string} version  버전
 */

function assertJobData(data) {
  if (!data?.key || !data.key.toLowerCase().endsWith('.gltf')) {
    throw new AppError('key값이 존재하지 않습니다.', 422, 'KEY_REQUIRED');
  }
  if (!data?.thumbKey) {
    throw new AppError('thumbKey값이 존재하지 않습니다.', 422, 'THUMBKEY_REQUIRED');
  }
  if (!Number.isFinite(data?.width) || !Number.isFinite(data?.height)) {
    throw new AppError('파일 크기가 일치하지 않습니다.', 422, 'SIZE_MISMATCH');
  }
}

const worker = new Worker(
  QUEUE_NAME,
  /**
   * @param {import('bullmq').Job<ThumbJobData>} job
   */
  async (job) => {
    const data = job.data;
    assertJobData(data);

    // 1) GLTF 본문 로드(UTF-8)
    const gltfBuffer = await getSafeObjectBuffer(data.key);
    const gltfStr = gltfBuffer.toString('utf8');

    // 2) 썸네일 생성(서비스)
    const jpeg = await renderGltfToJpeg(gltfStr, { width: data.width, height: data.height });
    // 3) 업로드
    await putThumbnail(data.thumbKey, jpeg);

    const updatedGltfStr = await injectMetadata({
      gltfJsonStr: gltfStr,
      thumbJpeg: jpeg,
      version: data.version,
      userData: {
        rig: {},
        links: {},
      },
    });

    const finalMeta = await extractGltfMetadata(updatedGltfStr);
    console.log('\n\n');
    console.log(finalMeta);
    console.log('\n\n');

    return {
      status: 'ok',
      key: data.key,
      thumbKey: data.thumbKey,
      width: data.width,
      height: data.height,
      bytes: jpeg?.length || 0,
    };
  },
  queueOptions,
);

worker.on('completed', (job) => {
  console.log(`[thumb-worker] completed: ${job.id} → ${job.data?.thumbKey}`);
});

worker.on('failed', (job, err) => {
  console.error(`[thumb-worker] failed: ${job?.id}`, err?.message);
});

module.exports = worker;
