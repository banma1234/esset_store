const express = require('express');
const { issuePresignedPut, issuePresignedGet } = require('../services/assets/presigned.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../errors/appError');

const router = express.Router();

/**
 * @function presignHandler
 * @description presigned URL 발급 핸들러
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function presignHandler(req, res) {
  /** @type {{ key: string, contentType: string, expiresSec?: number }} */
  const { key, contentType, expiresSec } = req.body;

  if (req.method === 'GET') {
    const data = await issuePresignedGet({ key, expiresSec });

    return res.status(200).json({ ok: true, data });
  }

  if (req.method === 'POST') {
    const data = await issuePresignedPut({ key, contentType, expiresSec });

    return res.status(201).json({ ok: true, data: data });
  }

  throw new AppError('허용되지 않는 method 입니다.', 405, 'INVALID_METHOD');
}

/**
 * 프리사인 URL 발급
 */
router.post('/api/v1/storage/presign', asyncHandler(presignHandler));

module.exports = router;
