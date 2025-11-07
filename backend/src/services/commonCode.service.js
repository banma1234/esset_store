const CommonCode = require('../models/CommonCode');

/**
 * @function loadParentFor
 * @description parentCode가 존재하면 부모 문서를 로드한다.
 * @param {string|null} parentCode 검증/계산 대상 부모 코드 문자열
 * @returns {Promise<object|null>} 부모 문서(lean) 또는 null
 */
async function loadParentFor(parentCode) {
  if (!parentCode) return null;
  return CommonCode.findOne({ code: parentCode, deletedAt: null }).lean();
}

/**
 * @function computeDepth
 * @description 부모를 기준으로 depth 값을 계산한다.
 * @param {object|null} parent 부모 문서(lean) 또는 null
 * @returns {number} 계산된 depth (루트=0)
 */
function computeDepth(parent) {
  if (!parent) return 0;
  const pDepth = typeof parent.depth === 'number' ? parent.depth : 0;
  return pDepth + 1;
}

/**
 * @function saveCommonCode
 * @description 공통코드를 생성한다. (POST)
 * @param {{ code: string, name: string, parentCode?: (string|null) }} payload 생성할 코드 정보
 * @returns {Promise<object>} 생성된 문서(POJO)
 * @throws {Error} 부모 없음/삭제(400), 코드 중복(409), 서버 오류(500)
 */
async function saveCommonCode(payload) {
  const { code, name, parentCode } = payload;
  const normalizedParent = parentCode && String(parentCode).trim() !== '' ? parentCode : null;

  const parent = await loadParentFor(normalizedParent);
  if (normalizedParent && !parent) {
    const err = new Error('parentCode not found or deleted');
    err.status = 400;
    throw err;
  }
  const depth = computeDepth(parent);

  try {
    const doc = await CommonCode.create({ code, name, parentCode: normalizedParent, depth });
    return doc.toObject();
  } catch (e) {
    if (e && e.code === 11000) {
      const err = new Error('code already exists');
      err.status = 409;
      throw err;
    }
    e.status = 500;
    throw e;
  }
}

/**
 * @function getAllCommonCodes
 * @description 공통코드 전체 목록을 조회한다. (GET, code 미지정)
 * @returns {Promise<object[]>} 문서 배열(lean)
 */
async function getAllCommonCodes() {
  return CommonCode.find({ deletedAt: null }).sort({ depth: 1, code: 1 }).lean();
}

/**
 * @function getCommonCodeByCode
 * @description 특정 code에 해당하는 공통코드를 조회한다. (GET, code 지정)
 * @param {string} code 조회할 code
 * @returns {Promise<object|null>} 문서(lean) 또는 null
 */
async function getCommonCodeByCode(code) {
  return CommonCode.findOne({ code, deletedAt: null }).lean();
}

module.exports = {
  saveCommonCode,
  getAllCommonCodes,
  getCommonCodeByCode,
};
