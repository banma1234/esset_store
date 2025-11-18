const {
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { createS3Client } = require('../../utils/s3');
const { handleLogEvent } = require('../../utils/logEventHandler');
const Asset = require('../../models/assets/Assets.model');
const { AppError } = require('../../errors/appError');

const s3 = createS3Client();
const S3_BUCKET = process.env.S3_BUCKET;

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
  if (version === body.userMeta.version) {
    throw new AppError('기존 파일과 버전이 겹칩니다.', 422, 'VERSION_MISMATCH');
  }
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
    throw new AppError('gltf의 JSON 파싱에 실패했습니다.', 433, 'FAILED_GLTF_JSON');
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

  const { CDN_BASE_URL, S3_ENDPOINT } = process.env;

  handleLogEvent({
    type: 'ASSET_SNAPSHOT',
    payload: {
      fileName: body.fileName,
      fileType: body.fileType,
      sizeBytes: body.sizeBytes,
      thumbnail: `${CDN_BASE_URL}${thumbKey.replace(S3_ENDPOINT, '')}`,
      category: userMeta.userData.category,
      filters: userMeta.userData.filters,
      latestVersion: {
        version: userMeta.version,
        url: `${CDN_BASE_URL}${key.replace(S3_ENDPOINT, '')}`,
      },
    },
  });

  return { ok: true };
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
async function getAssetsBySearchOptions(options) {
  if (!options) {
    throw new AppError('검색 옵션이 전달되지 않았습니다.', 400, 'INVALID_OPTIONS');
  }

  const { category, filters, page, filename } = options;
  const PAGE_SIZE = 4;

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

module.exports = {
  checkMetaCorrect,
  getSafeObjectBuffer,
  promoteStagingToFinal,
  getMetaData,
  saveSafeModel,
  getAssetsBySearchOptions,
};
