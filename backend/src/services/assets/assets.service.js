const {
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { createS3Client } = require('../../utils/s3');
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
  const { key, contentLength } = await getMetaData(body.key);

  if (!/\/staging\//.test(key)) {
    throw new AppError('유효한 파일 경로가 아닙니다.', 422, 'KEY_INCORRECT');
  }
  if (body.key !== key) {
    throw new AppError('파일 경로가 일치하지 않습니다.', 422, 'KEY_MISMATCH');
  }
  if (body.sizeBytes !== contentLength) {
    throw new AppError('파일 크기가 일치하지 않습니다.', 422, 'SIZE_MISMATCH');
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

async function deleteObject(key) {
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
  await deleteObject(key);

  return { ...body, key: finalKey };
}

/**
 * @function putThumbnail
 * @description JPEG 썸네일 업로드.
 * @param {string} key
 * @param {Buffer|Uint8Array} buffer
 * @param {string} [cacheControl]
 */
async function putThumbnail(key, buffer, cacheControl = 'public, max-age=31536000, immutable') {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/jpeg',
      CacheControl: cacheControl,
    }),
  );
}

module.exports = { checkMetaCorrect, putThumbnail, getSafeObjectBuffer, promoteStagingToFinal, getMetaData };
