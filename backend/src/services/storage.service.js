const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createS3Client } = require('../utils/s3');
const { AppError } = require('../errors/appError');

const s3 = createS3Client();
const S3_BUCKET = process.env.S3_BUCKET;

/**
 * @function clampExpires
 * @description 만료 입력을 안전 범위(1초 ~ 604,800초)로 제한한다.
 * @param {number|undefined} s 입력값(초)
 * @returns {number} 안전 범위로 조정된 초 단위 만료값
 */
function clampExpires(s) {
  const v = Number.isFinite(s) ? Math.floor(s) : 600;

  return Math.min(Math.max(v, 1), 600);
}

/**
 * @function ensureBucket
 * @description 버킷 환경변수가 없으면 500 에러로 처리
 */
function ensureBucket() {
  if (!S3_BUCKET) {
    throw new AppError('S3_BUCKET 환경변수가 설정되지 않았습니다.', 500, 'CONFIG_MISSING');
  }
}

/**
 * @function issuePresignedPut
 * @description 업로드용 프리사인(PUT) 발급
 * @param {{ contentType?:string, expiresSec?:number }} input
 * @returns {Promise<{ url:string, method:'PUT', headers:Record<string,string> }>}
 */
async function issuePresignedPut({ key, contentType, expiresSec }) {
  ensureBucket();
  const expiresIn = clampExpires(expiresSec);
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn });

  return {
    url,
    method: 'PUT',
    headers: contentType ? { 'Content-Type': contentType } : {},
  };
}

/**
 * @function issuePresignedGet
 * @description 다운로드용 프리사인(GET) 발급
 * @param {{ key:string, expiresSec?:number }} input
 * @returns {Promise<{ url:string, method:'GET' }>}
 */
async function issuePresignedGet({ key, expiresSec }) {
  ensureBucket();
  const expiresIn = clampExpires(expiresSec);
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const url = await getSignedUrl(s3, cmd, { expiresIn });

  return { url, method: 'GET' };
}

module.exports = { issuePresignedPut, issuePresignedGet };
