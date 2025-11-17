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
 * @property {Object} userMeta  사용자 지정 메타데이터
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
  if (!data?.userMeta.version) {
    throw new AppError('버전이 존재하지 않습니다.', 422, 'VERSION_REQUIRED');
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
      version: data.userMeta.version,
      userData: data.userMeta.userData,
    });

    console.log('========================');
    // ✅ 즉시 구조 점검
    const dbg = JSON.parse(updatedGltfStr);
    console.log('[dbg] images has', dbg.images?.length, 'items');
    console.log(
      '[dbg] images.uri?  ',
      dbg.images?.map((i) => typeof i?.uri === 'string'),
    );
    console.log(
      '[dbg] images.bv?   ',
      dbg.images?.map((i) => Number.isInteger(i?.bufferView)),
    );
    console.log(
      '[dbg] buffers.uri? ',
      dbg.buffers?.map((b) => typeof b?.uri === 'string'),
    );

    // 이 시점에 images[*]는 (uri || bufferView) 중 하나가 반드시 true 여야 합니다.

    // finalMeta 생성에서 문제
    const finalMeta = await extractGltfMetadata(updatedGltfStr);
    console.log('\n\n');
    // 출력되지 않음
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
