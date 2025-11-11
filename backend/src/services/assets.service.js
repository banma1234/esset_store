const { HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createS3Client } = require('../utils/s3');
const { AppError } = require('../errors/appError');

const s3 = createS3Client();
const S3_BUCKET = process.env.S3_BUCKET;

async function getMetaData(key) {
  const res = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));

  return { key, contentLength: Number(res.ContentLength ?? 0) };
}

async function checkMetaCorrect(body) {
  const { key, contentLength } = await getMetaData(body.key);

  if (body.key !== key) {
    throw new AppError('파일 경로가 일치하지 않습니다.', 4222, 'DIR_MISMATCH');
  }
  if (body.sizeBytes !== contentLength) {
    throw new AppError('파일 크기가 일치하지 않습니다.', 422, 'SIZE_MISMATCH');
  }

  return { ok: true };
}

/**
 * @function putJpeg
 * @description JPEG 버퍼를 업로드한다.
 * @param {string} bucket
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

module.exports = { checkMetaCorrect, putThumbnail };
