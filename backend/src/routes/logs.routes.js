/**
 * @file 로그 디버그 라우트(선택)
 * @description
 * - POST /api/v1/_debug/log : 공통 로그 핸들러를 호출하여 콘솔 출력만 수행
 * - 실제 서비스 코드에서는 이 라우트가 아니라, 도메인 로직 내에서 handleLogEvent를 직접 호출하세요.
 */

const express = require('express');
const { handleLogEvent } = require('../utils/logEventHandler');

const router = express.Router();

/**
 * @route POST /api/v1/_debug/log
 * @summary 공통 로그 핸들러 호출(콘솔 출력)
 * @requestBody { type: 'DOWNLOAD'|'ASSET_EVENT'|'ASSET_SNAPSHOT', payload: object }
 */
router.post('/api/v1/_debug/log', async (req, res, next) => {
  try {
    await handleLogEvent(req.body);
    res.status(200).json({ ok: true, message: 'logged (console only)' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
