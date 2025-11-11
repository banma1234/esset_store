const express = require('express');
const { checkMetaCorrect } = require('../services/assets.service');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

/**
 * @function commitHandler
 * @description commit 요청 핸들러
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function commitHandler(req, res, next) {
  try {
    const data = await checkMetaCorrect(req.body);

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * @route POST /api/v1/assets/commit
 * @summary 커밋 액션
 */
router.post('/api/v1/assets/commit', asyncHandler(commitHandler));

module.exports = router;
