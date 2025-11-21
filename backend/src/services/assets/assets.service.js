const {
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { createS3Client } = require('../../utils/s3');
const { handleLogEvent } = require('../../utils/logEventHandler');
const { ObjectId } = require('mongodb');
const { AppError } = require('../../errors/appError');
const Asset = require('../../models/assets/Assets.model');
const AssetVersions = require('../../models/assets/AssetVersions.model');

const s3 = createS3Client();
const { CDN_BASE_URL, S3_ENDPOINT, S3_BUCKET } = process.env;

async function getMetaData(key) {
  const res = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));

  return { key, contentLength: Number(res.ContentLength ?? 0) };
}

/**
 * @function checkMetaCorrect
 * @description 전달받은 모델 유효성 검사.
 * @param {Object} body
 * @return {boolean} ok
 */
async function checkMetaCorrect(body) {
  const { key, contentLength, version } = await getMetaData(body.key);

  if (!/\/staging\//.test(key)) {
    throw new AppError('유효한 파일 경로가 아닙니다.', 422, 'KEY_INCORRECT');
  }
  if (body.key !== key) {
    throw new AppError('파일 경로가 일치하지 않습니다.', 422, 'KEY_MISMATCH');
  }
  if (body.sizeBytes !== contentLength) {
    throw new AppError('파일 크기가 일치하지 않습니다.', 422, 'SIZE_MISMATCH');
  }
  // if (version === body.userMeta.version) {
  //   throw new AppError('기존 파일과 버전이 겹칩니다.', 422, 'VERSION_MISMATCH');
  // }
}

/**
 * @function checkMetaCorrect
 * @description 안전한 모델 가져오기
 * @param {string} key
 * @return {Object} key, Buffer
 */
async function getSafeObjectBuffer(key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  const chunks = [];
  for await (const target of res.Body) {
    chunks.push(target);
  }

  return Buffer.concat(chunks);
}

async function deleteObjectSafely(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/**
 * @description sourceKey에 해당하는 에셋 targetKey로 복사
 * @param {*} sourceKey
 * @param {*} targetKey
 */
async function copyObject(sourceKey, targetKey) {
  await s3
    .send(
      new CopyObjectCommand({
        Bucket: S3_BUCKET,
        Key: targetKey,
        CopySource: `${S3_BUCKET}/${sourceKey}`,
      }),
    )
    .then((res) => {
      return res.CopyObjectResult;
    })
    .catch((err) => {
      throw new AppError(err.message, 432, 'COPY_FAILED');
    });
}

async function promoteStagingToFinal(body) {
  const { key } = body;
  const finalKey = key.replace(/\/staging\//, '/final/');

  await copyObject(key, finalKey);
  await deleteObjectSafely(key);

  return { ...body, key: finalKey };
}

/**
 * @typedef {Object} PersistOptions
 * @property {string} key         업로드할 S3 키(예: "assets/final/xxx/1.0.6/xxx.gltf")
 * @property {string} gltfJsonStr glTF JSON 문자열(임베디드 data:URI 포함)
 */

/**
 * @function saveSafeModel
 * @description glTF JSON 문자열을 .gltf로 S3에 업로드한다.
 * @param {PersistOptions} payload
 * @returns {Promise<{ key: string, bytes: number }>}
 */
async function saveSafeModel(payload) {
  const { key, gltfJsonStr, body, userMeta, thumbKey } = payload || {};

  if (typeof gltfJsonStr !== 'string' || gltfJsonStr.length < 10) {
    throw new AppError('유효한 glTF JSON 문자열이 아닙니다.', 422, 'INVALID_JSON_STRING');
  }

  // 1) 파싱 + 최소 검증(뷰어 호환성)
  let json;
  try {
    json = JSON.parse(gltfJsonStr);
  } catch {
    throw new AppError('gltf의 JSON 파싱에 실패했습니다.', 422, 'GLTF_JSON_FAILED');
  }

  // 2) 문자열화(미니파이 기본)
  const outStr = JSON.stringify(json);
  const GLTFModel = Buffer.from(outStr, 'utf8');

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key, // 같은 키에 덮어쓰기
      Body: GLTFModel,
      ContentType: 'model/gltf+json',
      CacheControl: 'public, max-age=0, s-maxage=0, must-revalidate', // 재검증 강제
    }),
  );

  handleLogEvent({
    type: 'ASSET_SNAPSHOT',
    payload: {
      fileName: body.fileName,
      fileType: body.fileType,
      sizeBytes: body.sizeBytes,
      thumbnail: `${CDN_BASE_URL}${thumbKey.replace(S3_ENDPOINT, '')}`,
      category: userMeta.esUserData.category,
      filters: userMeta.esUserData.filters,
      counts: userMeta.esStats.counts,
      buffers: userMeta.esStats.buffers,
      latestVersion: {
        version: userMeta.version,
        url: `${CDN_BASE_URL}${key.replace(S3_ENDPOINT, '')}`,
      },
      // counts, buffers 주입
    },
  });

  return { ok: true };
}

async function getAssetByFileName(query) {
  if (!query.filename || typeof query.filename !== 'string') {
    throw new AppError('유효하지 않은 파일명 입니다.', 422, 'INVALID_FILENAME');
  }

  return Asset.findOne({ fileName: query.filename }).lean();
}

/**
 * @function getAssetsBySearchOptions
 * @description 카테고리 + 필터 + 페이지네이션을 적용하여 에셋을 검색한다.
 * @param {AssetSearchOptions} options 검색 옵션
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
async function getAssetsBySearchOptions(requestQuery) {
  if (!requestQuery) {
    throw new AppError('유효하지 않은 검색 옵션입니다.', 422, 'INVALID_OPTIONS');
  }

  const { category, filters, page, filename } = requestQuery;
  const PAGE_SIZE = 8;

  let pageNum = parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) {
    pageNum = 1;
  }

  const limit = PAGE_SIZE;
  const skip = (pageNum - 1) * limit;
  const query = { deletedAt: null, isActive: true };
  const filterCodes =
    filters.length > 0
      ? filters
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  if (filename.length > 0) {
    query.fileName = new RegExp(filename.trim(), 'i');
  } else {
    if (category) {
      query.category = new RegExp(`^${category}`);
    }
    if (filterCodes.length > 0) {
      query.filters = { $all: filterCodes };
    }
  }

  const [items, totalItems] = await Promise.all([
    Asset.find(query)
      .sort({ updatedAt: -1 }) // 인덱스 { category, filters, updatedAt: -1 } 활용
      .skip(skip)
      .limit(limit)
      .lean(),
    Asset.countDocuments(query),
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

/**
 * @function checkCDNUrlAvailable
 * @description 주어진 URL에 HEAD 요청을 보내어 사용 가능 여부를 판정한다.
 * @param {string} url 절대 URL (http/https)
 * @param {number} [timeoutMs=1500] 타임아웃(ms)
 * @returns {Promise<boolean>} 2xx/3xx면 true, 그 외/오류면 false
 */
async function checkCDNUrlAvailable(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        { method: 'HEAD', hostname: u.hostname, port: u.port, path: u.pathname + u.search, timeout: timeoutMs },
        (res) => {
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;
          // 소비 끝내기
          res.resume();
          resolve(Boolean(ok));
        },
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function downloadAssetFromDB(query, mode) {
  const { assetid, filename, version } = query;

  switch (mode) {
    case 'DEFAULT':
      if (!assetid || typeof assetid !== 'string') {
        throw new AppError('유효하지 않은 id 입니다.', 422, 'INVALID_ASSETID');
      }

      try {
        const { url } = await AssetVersions.findOne({ assetId: new ObjectId(assetid), version: version });

        return url;
      } catch (err) {
        throw new AppError('에셋 스냅샷 조회에 실패했습니다.', 422, 'FAILED_DOWNLOAD_ASSETVERSIONS');
      }

    case 'LATEST':
      if (!filename || typeof filename !== 'string') {
        throw new AppError('유효하지 않은 파일명 입니다.', 422, 'INVALID_FILENAME');
      }

      try {
        const { latestVersion } = await getAssetByFileName({ filename });
        await checkCDNUrlAvailable(latestVersion.url);

        return latestVersion.url;
      } catch (err) {
        throw new AppError('파일명으로 최신버전 에셋 조회에 실패했습니다.', 422, 'FAILED_DOWNLOAD_LATEST');
      }

    default:
      throw new AppError('유효하지 않은 mode값 입니다.', 500, 'INVALID_API_MODE');
  }
}

/**
 * @function deactivateAssetById
 * @description 특정 에셋 버전 비활성화(.
 * @param {{ _id: string, assetId: string, fileName?: string, version: string }} body
 * @returns {Promise<void>}
 */
async function deactivateAssetById(body) {
  const { _id, assetId, fileName, version } = body;
  const now = new Date();

  try {
    await AssetVersions.updateOne({ _id: new ObjectId(_id) }, { isActive: false, deletedAt: now });

    const assetOrigin = await Asset.findById(assetId).lean();

    if (!assetOrigin) {
      throw new AppError('해당 에셋을 찾을 수 없습니다.', 404, 'ASSET_NOT_FOUND');
    }

    const isLatestTarget = assetOrigin.latestVersion && assetOrigin.latestVersion.version === version;
    if (isLatestTarget) {
      const nextLatest = await AssetVersions.findOne({
        assetId,
        isActive: true,
      })
        .sort({ version: -1 })
        .lean();

      if (nextLatest) {
        // 이전 버전이 있는 경우 버전 갱신.
        await Asset.updateOne(
          { _id: new ObjectId(assetId) },
          {
            latestVersion: {
              version: nextLatest.version,
              url: nextLatest.url,
            },
            thumbnail: nextLatest.thumbnail,
            sizeBytes: nextLatest.sizeBytes,
            updatedAt: now,
            isActive: true,
            deletedAt: null,
          },
        );

        // 최신 버전 갱신 UPDATE 이벤트 기록.
        handleLogEvent({
          type: 'ASSET_EVENT',
          payload: {
            eventType: 'UPDATE',
            assetId,
            assetVersionsId: _id,
            fileName,
            version: nextLatest.version,
          },
        });
      } else {
        // 남은 versions 없으면 Asset 비활성화.
        await Asset.updateOne(
          { _id: new ObjectId(assetId) },
          {
            isActive: false,
            deletedAt: now,
            latestVersion: undefined,
            thumbnail: undefined,
            sizeBytes: undefined,
            updatedAt: now,
          },
        );
      }
    }

    handleLogEvent({
      type: 'ASSET_EVENT',
      payload: {
        eventType: 'DELETE',
        assetId,
        assetVersionsId: _id,
        fileName,
        version,
      },
    });
  } catch (err) {
    throw new AppError('에셋 비활성화에 실패했습니다.', 422, 'FAILED_ASSET_DEACTIVATE');
  }
}

/**
 * @function activateAssetById
 * @description 활성화
 * @param {{ _id: string, assetId: string, fileName?: string, version: string }} body
 * @returns {Promise<void>}
 */
async function activateAssetById(body) {
  const { _id, assetId, fileName, version } = body;
  const now = new Date();

  console.log(fileName);

  // 3) 현재 “활성” 중 최댓값 버전 조회(본인 포함 가능)
  const nextLatest = await AssetVersions.findOne({
    assetId: assetId,
    isActive: true,
    deletedAt: null,
  })
    .sort({ version: -1 }) // 가장 큰 버전
    .lean();

  console.log(nextLatest);
  console.log('==================');

  // 1) 활성화 대상 버전 로드
  const verDoc = await AssetVersions.findById(_id).lean();
  if (!verDoc) throw new AppError('활성화 대상 버전을 찾을 수 없습니다.', 404, 'ASSET_VERSION_NOT_FOUND');
  if (String(verDoc.assetId) !== String(assetId)) {
    throw new AppError('assetId와 버전의 소유가 일치하지 않습니다.', 409, 'ASSET_MISMATCH');
  }

  console.log(verDoc);

  // 2) 대상 버전 활성화
  await AssetVersions.updateOne({ _id: verDoc._id }, { $set: { isActive: true, deletedAt: null } });

  // 4) 요청하신 단순 비교: nextLatest.version < verDoc.version 인 경우만 승격
  //    (nextLatest가 없으면 -Infinity 취급)
  const base = nextLatest?.version ?? -Infinity;

  console.log(base);

  if (base < verDoc.version) {
    await Asset.updateOne(
      { _id: verDoc.assetId },
      {
        $set: {
          latestVersion: { url: verDoc.url, version: verDoc.version },
          thumbnail: verDoc.thumbnail,
          updatedAt: now,
          isActive: true,
          deletedAt: null,
        },
      },
    );
  }

  handleLogEvent({
    type: 'ASSET_EVENT',
    payload: {
      eventType: 'UPDATE',
      assetId: assetId,
      assetVersionsId: _id,
      fileName: fileName,
      version: version,
    },
  });
}

module.exports = {
  checkMetaCorrect,
  getSafeObjectBuffer,
  promoteStagingToFinal,
  getMetaData,
  saveSafeModel,
  getAssetByFileName,
  getAssetsBySearchOptions,
  downloadAssetFromDB,
  deactivateAssetById,
  activateAssetById,
};
