const Joi = require('joi');
const S = Joi.string().trim();

/** @type {Joi.ObjectSchema} 공통코드 생성 스키마 */
const createSchema = Joi.object({
  code: S.required(),
  name: S.required(),
  parentCode: S.allow('', null),

  // 서버 관리/미사용 필드 금지
  _id: Joi.forbidden(),
  createdAt: Joi.forbidden(),
  updatedAt: Joi.forbidden(), // 모델 훅에서 기록됨(필드 자체는 필수지만 클라이언트 입력 금지)
  deletedAt: Joi.forbidden(),
  depth: Joi.forbidden(),
});

/**
 * @function validateCreate
 * @description 공통코드 생성 바디를 검증하고 정규화한다.
 * @returns {import('express').RequestHandler} 미들웨어
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateCreate(req, res, next) {
  const { error, value } = createSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      ok: false,
      message: 'Validation error',
      details: error.details.map((d) => d.message),
    });
  }

  if (value.parentCode === '') value.parentCode = null;
  req.validatedBody = value;

  next();
}

module.exports = { validateCreate };
