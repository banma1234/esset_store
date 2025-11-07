const express = require('express');
const { validateCreate } = require('../middlewares/validateCommonCode');
const { saveCommonCode, getAllCommonCodes, getCommonCodeByCode } = require('../services/commonCode.service');

const router = express.Router();

/**
 * @function conditionalValidator
 * @description 특정 메서드(POST)에만 밸리데이터를 적용한다.
 * @param {'POST'} method 적용할 HTTP 메서드
 * @param {import('express').RequestHandler} validator 미들웨어
 * @returns {import('express').RequestHandler}
 */
function conditionalValidator(method, validator) {
  return (req, res, next) => (req.method === method ? validator(req, res, next) : next());
}

/**
 * @function commonCodeHandler
 * @description 하나의 핸들러에서 GET/POST를 분기하여 각 서비스 호출
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function commonCodeHandler(req, res, next) {
  try {
    // GET: 전체 또는 단일
    if (req.method === 'GET') {
      const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';

      if (code) {
        const target = await getCommonCodeByCode(code);

        if (!target) {
          return res.status(404).json({ ok: false, message: 'commonCode not target' });
        }

        return res.status(200).json({ ok: true, data: target });
      }
      const items = await getAllCommonCodes();

      return res.status(200).json({ ok: true, data: items });
    }

    // POST: 생성
    if (req.method === 'POST') {
      const created = await saveCommonCode(req.validatedBody);

      return res.status(201).json({ ok: true, data: created });
    }

    // 허용되지 않은 메서드
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  } catch (err) {
    next(err);
  }
}

/**
 * @route /api/v1/commonCode
 * @summary 단일 엔드포인트 + 단일 핸들러(GET/POST)
 * @description
 * - POST만 validateCreate 적용
 */
router.all('/api/v1/commonCode', conditionalValidator('POST', validateCreate), commonCodeHandler);

module.exports = router;
