const express = require('express');
const { handleLogEvent } = require('../utils/logEventHandler');
const { getAssetVersionGroups, searchAssetEvents } = require('../services/logWriters.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../errors/appError');

const router = express.Router();

/**
 * @function logRouter
 * @description 공통 로그 핸들러 호출(콘솔 출력)
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function logRouter(req, res) {
  await handleLogEvent(req.body);

  res.status(200).json({ ok: true, message: 'logged (console only)' });
}

/**
 * @function getAssetSnapshots
 * @description 에셋 스냅샷 각 에셋별로 그룹화 하여 반환
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getAssetSnapshots(req, res) {
  const result = await getAssetVersionGroups();

  if (!result) {
    throw new AppError('에셋 스냅샷 로그를 불러오는데 실패했습니다.', 422, 'FAILED_ASSET_SNAPSHOTS');
  }

  return res.status(200).json({ ok: true, data: result });
}

/**
 * @function getAssetEvents
 * @description 에셋 이벤트 검색 조건에 맞게 반환
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function getAssetEvents(req, res) {
  const result = await searchAssetEvents(req.query);

  if (!result) {
    throw new AppError('에셋 이벤트 로그를 불러오는데 실패했습니다.', 422, 'FAILED_ASSET_EVENTS');
  }

  return res.status(200).json({ ok: true, data: result });
}

router.post('/api/v1/_debug/log', asyncHandler(logRouter));
router.get('/api/v1/_debug/log/assetversions', asyncHandler(getAssetSnapshots));
router.get('/api/v1/_debug/log/assetevents', asyncHandler(getAssetEvents));

module.exports = router;
