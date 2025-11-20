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
 * @property {import('mongoose').Types.ObjectId || undefined} assetVersionsId 참조 대상 에셋 버전 ID (assetVersions._id)
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

/**
 * @typedef {Object} VersionFile
 * @property {number} version        - 버전 번호
 * @property {string} fileType       - 파일 형식
 * @property {number} [sizeBytes]    - 파일 크기(바이트)
 * @property {string} [cdnUrl]       - CDN URL
 * @property {string} [thumbCdnUrl]  - 썸네일 CDN URL
 * @property {Date} [uploadedAt]     - 업로드 시각
 *
 * @typedef {Object} VersionGroup
 * @property {mongoose.Types.ObjectId} assetId - 에셋 ID
 * @property {string} fileName                 - 파일명(assetVersions.fileName)
 * @property {VersionFile[]} files             - 버전별 파일 목록(버전 내림차순)
 */

/**
 * @function getAssetVersionGroups
 * @description assetVersions를 assetId로 그룹화하여 반환한다.
 * @param {Object} [opts]
 * @param {string|string[]} [opts.assetIds]   - 특정 에셋만 필터(선택)
 * @param {string|string[]} [opts.fileTypes]  - 파일 형식 필터(선택)
 * @param {boolean} [opts.excludeDeleted=false] - deletedAt != null 문서 제외 여부
 * @returns {Promise<VersionGroup[]>}
 */
async function getAssetVersionGroups(opts = {}) {
  const { assetIds, fileTypes, excludeDeleted = false } = opts;

  /** @type {any[]} */
  const pipeline = [];

  // 1) 사전 필터
  const match = {};
  if (excludeDeleted) {
    match.deletedAt = null;
  }
  if (assetIds) {
    const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
    match.assetId = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  if (fileTypes) {
    const types = Array.isArray(fileTypes) ? fileTypes : [fileTypes];
    match.fileType = { $in: types };
  }
  if (Object.keys(match).length) pipeline.push({ $match: match });

  // 2) 그룹 내 정렬(버전 내림차순) → 이후 $group의 $push 순서가 이 정렬을 따라감
  pipeline.push({ $sort: { assetId: 1, version: -1 } });

  // 3) assetId 기준 그룹화, fileName은 동일하므로 $first로 대표값 사용
  pipeline.push({
    $group: {
      _id: '$assetId',
      fileName: { $first: '$fileName' }, // ← assetVersions.fileName 사용
      files: {
        $push: {
          version: '$version',
          fileType: '$fileType',
          sizeBytes: '$sizeBytes',
          url: '$url',
          thumbnail: '$thumbnail',
          updatedAt: '$updatedAt',
          isActive: '$isActive',
          deletedAt: '$deletedAt'
        },
      },
    },
  });

  // 4) 출력 형태 정리 및 정렬(선택)
  pipeline.push(
    {
      $project: {
        _id: 0,
        assetId: '$_id',
        fileName: 1,
        files: 1,
      },
    },
    { $sort: { fileName: 1 } }, // 보기 좋은 정렬(선택)
  );

  return AssetVersions.aggregate(pipeline).allowDiskUse(true);
}

/**
 * @typedef {Object} AssetEventSearchOptions
 * @property {string} [eventType] 이벤트 타입 (CREATE/UPDATE/DELETE)
 * @property {string} [startDate] 시작 날짜(포함, ISO 문자열: '2025-05-01' 등)
 * @property {string} [endDate] 종료 날짜(포함, ISO 문자열: '2025-07-31' 등)
 * @property {string|number} [page] 페이지 번호 (1부터 시작, 기본값 1)
 * @property {string|number} [pageSize] 페이지당 최대 개수 (기본값 20)
 */

/**
 * @function searchAssetEvents
 * @description AssetEvents 컬렉션에서 eventType / 날짜 범위 / 페이지네이션을 적용해 조회한다.
 * @param {AssetEventSearchOptions} options 검색 옵션 (req.query 그대로 넘겨도 됨)
 * @returns {Promise<{
 *   items: object[],
 *   pagination: {
 *     page: number,
 *     pageSize: number,
 *     totalItems: number,
 *     totalPages: number,
 *     hasNextPage: boolean,
 *     hasPrevPage: boolean
 *   }
 * }>}
 */
async function searchAssetEvents(options = {}) {
  const { eventType, startDate, endDate, page, pageSize } = options;

  // ==========================
  // 1) 페이지네이션 파라미터 처리
  // ==========================
  const DEFAULT_PAGE_SIZE = 20;
  const MAX_PAGE_SIZE = 100;

  let pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) {
    pageNum = 1;
  }

  let limit = parseInt(pageSize, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = DEFAULT_PAGE_SIZE;
  }
  if (limit > MAX_PAGE_SIZE) {
    limit = MAX_PAGE_SIZE;
  }

  const skip = (pageNum - 1) * limit;

  // ==========================
  // 2) 검색 조건(query) 구성
  // ==========================
  /** @type {Record<string, any>} */
  const query = {};

  // 이벤트 타입 필터 (CREATE/UPDATE/DELETE)
  if (typeof eventType === 'string' && eventType.trim() !== '') {
    query.eventType = eventType.trim();
  }

  // 날짜 범위 필터 (updatedAt 기준)
  const hasStart = typeof startDate === 'string' && startDate.trim() !== '';
  const hasEnd = typeof endDate === 'string' && endDate.trim() !== '';

  if (hasStart || hasEnd) {
    /** @type {{ $gte?: Date, $lte?: Date }} */
    const dateCond = {};

    if (hasStart) {
      // 시작일(포함)
      dateCond.$gte = new Date(startDate);
    }

    if (hasEnd) {
      // 종료일(포함) – 날짜만 들어온다고 가정하고, 그대로 <= 비교
      dateCond.$lte = new Date(endDate);
    }

    query.updatedAt = dateCond;
  }

  // ==========================
  // 3) 조회 + 전체 개수 계산
  // ==========================
  const [items, totalItems] = await Promise.all([
    AssetEvent.find(query)
      .sort({ updatedAt: -1 }) // 최신 이벤트 먼저
      .skip(skip)
      .limit(limit)
      .lean(),
    AssetEvent.countDocuments(query),
  ]);

  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / limit);

  return {
    items,
    pagination: {
      page: pageNum,
      pageSize: limit,
      totalItems,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
}

module.exports = {
  writeDownloadLog,
  writeAssetEvent,
  writeAssetSnapshot,
  getAssetVersionGroups,
  searchAssetEvents,
};
