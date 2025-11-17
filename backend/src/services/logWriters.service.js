const Asset = require('../models/assets/assets');
const { AppError } = require('../errors/appError');

/**
 * @typedef {Object} DownloadLogPayload
 * @property {string} assetId 에셋 ID
 * @property {string} [assetVersionId] 에셋 버전 ID(선택)
 * @property {string} via 경로(cdn|s3-presign 등)
 * @property {'success'|'fail'} status 최종 상태
 * @property {number} [latencyMs] 소요 시간(ms)
 * @property {string} [error] 에러 메시지(실패 시)
 * @property {string} [traceId] 추적 ID
 */

/**
 * @typedef {Object} AssetEventPayload
 * @property {string} assetId 에셋 ID
 * @property {string} [assetVersionId] 에셋 버전 ID(선택)
 * @property {string} type 이벤트 타입(예: 'CDN_URL_UPDATED')
 * @property {Object} [meta] 부가 메타데이터
 */

/**
 * @typedef {Object} AssetSnapshotPayload
 * @property {string} assetId 에셋 ID
 * @property {number|string} version 버전 번호 또는 문자열
 * @property {string} fileType 파일 형식
 * @property {number} [sizeBytes] 파일 크기(바이트)
 * @property {boolean} [previewable] 미리보기 가능 여부
 * @property {string} [cdnUrl] CDN URL
 * @property {string} [thumbCdnUrl] 썸네일 CDN URL
 */

/**
 * @function writeDownloadLog
 * @description 다운로드 로그를 처리한다. (현재: 콘솔 출력)
 * @param {DownloadLogPayload} payload 다운로드 로그 페이로드
 * @returns {Promise<void>}
 */
async function writeDownloadLog(payload) {
  // 이후 단계: downloadLogs 컬렉션에 insert
  // 지금은 콘솔로 골조만 확인
  // eslint-disable-next-line no-console
  console.log('[LOG][downloadLogs]', payload);
}

/**
 * @function writeAssetEvent
 * @description 에셋 이벤트 로그를 처리한다. (현재: 콘솔 출력)
 * @param {AssetEventPayload} payload 에셋 이벤트 페이로드
 * @returns {Promise<void>}
 */
async function writeAssetEvent(payload) {
  // 이후 단계: assetEvents 컬렉션에 insert
  // eslint-disable-next-line no-console
  console.log('[LOG][assetEvents]', payload);
}

/**
 * @function writeAssetSnapshot
 * @description 에셋의 최신버전 스냅샷 저장
 * @param {AssetSnapshotPayload} payload 스냅샷 로그 페이로드
 * @returns {Promise<void>}
 */
async function writeAssetSnapshot(payload) {
  try {
    await Asset.findOneAndUpdate(
      { $set: payload },
      {
        upsert: true, // 없으면 새 문서 생성
      },
    );

    // eslint-disable-next-line no-console
    console.log('[LOG][assetVersions][saved]', {
      fileName: payload.fileName,
      version: payload.latestVersion.version,
    });
  } catch (err) {
    throw new AppError('스냅샷 저장 중 오류가 발생했습니다.', 422, err);
  }
}

module.exports = {
  writeDownloadLog,
  writeAssetEvent,
  writeAssetSnapshot,
};
