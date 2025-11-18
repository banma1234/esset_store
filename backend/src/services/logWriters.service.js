const Asset = require('../models/assets/Assets.model');
const AssetVersions = require('../models/assets/AssetVersions.model');
const AssetEvent = require('../models/assets/AssetEvent.model');
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
 * @typedef {'CREATE'|'UPDATE'|'DELETE'} AssetEventType
 */

/**
 * @typedef {Object} AssetEventPayload
 * @property {AssetEventType} eventType 이벤트 타입 (CREATE/UPDATE/DELETE)
 * @property {import('mongoose').Types.ObjectId} assetId 참조 대상 에셋 ID (assets._id)
 * @property {import('mongoose').Types.ObjectId} assetVersionsId 참조 대상 에셋 버전 ID (assetVersions._id)
 * @property {string} [fileName] 파일 이름
 * @property {string} [version] 버전 번호
 */

/**
 * @typedef {Object} LatestVersionInfo
 * @property {string} version 버전 문자열 (예: "1.0.0")
 * @property {string} url 해당 버전의 파일 URL
 */

/**
 * @typedef {Object} AssetSnapshotPayload
 * @property {string} fileName 파일 이름
 * @property {string} fileType 파일 형식
 * @property {number} [sizeBytes] 파일 크기(바이트)
 * @property {string} [thumbnail] 썸네일 CDN URL
 * @property {Object} category 카테고리 정보 객체
 * @property {Object[]} filters 필터 정보 배열
 * @property {LatestVersionInfo} latestVersion 최신 버전 정보
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
 * @description 에셋 이벤트 로그를 처리한다.
 * @param {AssetEventPayload} payload 에셋 이벤트 페이로드
 * @returns {Promise<void>}
 */
async function writeAssetEvent(payload) {
  try {
    await AssetEvent.create(payload);
  } catch (err) {
    throw new AppError('에셋 이벤트 등록에 실패했습니다.', 500, err);
  }
}
/**
 * @function writeAssetSnapshot
 * @description 에셋의 최신버전 스냅샷 저장 + 버전 이력 + 이벤트 기록
 * @param {AssetSnapshotPayload} payload 스냅샷 로그 페이로드
 * @returns {Promise<void>}
 */
async function writeAssetSnapshot(payload) {
  const now = new Date();
  let assetDoc;
  let isAssetCreate = false;

  // 1) 에셋 찾기 또는 생성
  try {
    assetDoc = await Asset.findOne({ fileName: payload.fileName });

    if (!assetDoc) {
      isAssetCreate = true;
      assetDoc = await Asset.create({
        ...payload,
        updatedAt: now,
      });
    } else {
      await Asset.updateOne(
        { _id: assetDoc._id },
        {
          $set: {
            ...payload,
            updatedAt: now,
          },
        },
      );
    }
  } catch (err) {
    throw new AppError('에셋 저장 중 오류가 발생했습니다.', 500, err);
  }

  // 2) assetVersions 스냅샷 저장
  const { latestVersion, ...rest } = payload;

  const snapshotPayload = {
    ...rest,
    assetId: assetDoc._id,
    version: latestVersion.version,
    url: latestVersion.url,
    updatedAt: now,
  };

  let assetVersionDoc;

  try {
    // 먼저 항상 create를 시도
    assetVersionDoc = await AssetVersions.create(snapshotPayload);
  } catch (err) {
    // 중복키(이미 같은 assetId + version 이 있는 경우)면 update로 전환
    if (err && err.code === 11000) {
      try {
        await AssetVersions.updateOne(
          { assetId: assetDoc._id, version: latestVersion.version },
          { $set: snapshotPayload },
        );

        assetVersionDoc = await AssetVersions.findOne({
          assetId: assetDoc._id,
          version: latestVersion.version,
        });
      } catch (innerErr) {
        throw new AppError('에셋 버전 스냅샷 업데이트 중 오류가 발생했습니다.', 500, innerErr);
      }
    } else {
      throw new AppError('에셋 버전 스냅샷 저장 중 오류가 발생했습니다.', 500, err);
    }
  }

  if (!assetVersionDoc) {
    throw new AppError('에셋 버전 스냅샷 결과를 찾을 수 없습니다.', 500);
  }

  // 3) assetEvents 기록
  try {
    const eventPayload = {
      eventType: isAssetCreate ? 'CREATE' : 'UPDATE',
      assetId: assetDoc._id,
      assetVersionsId: assetVersionDoc._id,
      fileName: payload.fileName,
      version: latestVersion.version,
      // updatedAt 은 스키마 default 사용
    };

    await writeAssetEvent(eventPayload);
  } catch (err) {
    throw new AppError('스냅샷 생성중 오류가 발생했습니다.', 500, err);
  }
}

module.exports = {
  writeDownloadLog,
  writeAssetEvent,
  writeAssetSnapshot,
};
