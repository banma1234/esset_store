const { S3Client } = require('@aws-sdk/client-s3');

/**
 * @function createS3Client
 * @description S3/MinIO 호환 클라이언트를 생성한다.
 * @returns {import('@aws-sdk/client-s3').S3Client}
 */
function createS3Client() {
  const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY } = process.env;

  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined, // MinIO면 http(s)://host:9000
    // forcePathStyle: S3_FORCE_PATH_STYLE === 'true', // MinIO면 true 권장
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    signatureVersion: 'v4',
    // tls: S3_USE_SSL === 'true',
    // applyMd5BodyChecksum: true,
  });
}

module.exports = { createS3Client };
