const express = require('express');
const { checkMetaCorrect, promoteStagingToFinal } = require('../services/assets/assets.service');
const { enqueueThumbnailJob } = require('../services/enque.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { getSafeObjectBuffer } = require('../services/assets/assets.service');

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
    await checkMetaCorrect(req.body);
    await promoteStagingToFinal(req.body).then((res) => {
      enqueueThumbnailJob(res);
    });

    return res.status(200).json({ ok: true });
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
