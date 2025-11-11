const express = require('express');
const { issuePresignedPut, issuePresignedGet, applyBucketCors } = require('../services/presigned.service');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * @function presignHandler
 * @description presigned URL 발급 핸들러
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function presignHandler(req, res, next) {
  /** @type {{ key: string, contentType: string, expiresSec?: number }} */
  const { key, contentType, expiresSec } = req.body;

  try {
    if (req.method === 'GET') {
      const data = await issuePresignedGet({ key, expiresSec });

      return res.status(200).json({ ok: true, data });
    }

    // 2) 분기 처리
    if (req.method === 'POST') {
      const data = await issuePresignedPut({ key, contentType, expiresSec });

      return res.status(201).json({ ok: true, data: data });
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
 */
router.post('/api/v1/storage/presign', asyncHandler(presignHandler));

module.exports = router;
