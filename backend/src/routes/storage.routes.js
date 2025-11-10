const express = require('express');
const { issuePresignedPut, issuePresignedGet } = require('../services/storage.service');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * @function presignHandler
 * @description presigned URL 발급 핸들러 (예외는 throw하여 에러 핸들러로 위임)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function presignHandler(req, res, next) {
  /** @type {{ type?: string, contentType?: string, expiresSec?: number }} */
  const { key, contentType, expiresSec } = req.body;

  console.log(contentType);
  console.log(key);
  console.log(req.body);
  console.log('\n\n\n\n');

  try {
    if (req.method === 'GET') {
      const data = await issuePresignedGet({ key, expiresSec });

      return res.json({ ok: true, data });
    }

    // 2) 분기 처리
    if (req.method === 'POST') {
      const data = await issuePresignedPut({ key, contentType, expiresSec });

      return res.json({ ok: true, data });
    }

    // 허용되지 않은 메서드
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/v1/storage/presign
 * @summary 프리사인 URL 발급
 * @description asyncHandler로 감싸 예외를 글로벌 에러 핸들러로 전달한다.
 */
router.post('/api/v1/storage/presign', asyncHandler(presignHandler));

module.exports = router;
