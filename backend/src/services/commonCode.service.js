const CommonCode = require('../models/CommonCode');
const { AppError } = require('../errors/appError');

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
    throw new AppError('부모 코드를 찾을 수 없습니다.', 400, 'PARENT_REQUIRED');
  }
  const depth = computeDepth(parent);

  try {
    const doc = await CommonCode.create({ code, name, parentCode: normalizedParent, depth });

    return doc.toObject();
  } catch (e) {
    if (e && e.code === 11000) {
      throw new AppError('해당 코드는 이미 존재합니다.', 409, 'CODE_ARLEADY_EXISTS');
    }
    throw new AppError('알 수 없는 에러', 500, 'UNKNOWN_ERROR');
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
 * @function getAllCommonCodes
 * @description CommonCode 컬렉션에서 삭제되지 않은 공통코드를 모두 조회한 뒤
 * FIL* → filters, CAT* → categories 로 분류해서 반환한다.
 * @returns {Promise<{filters: object[], categories: object[]}>}
 */
async function getAllCommonCodes() {
  const codes = await CommonCode
    .find({ deletedAt: null })
    .sort({ depth: 1, code: 1 })
    .lean();

  /** @type {object[]} */
  const filters = [];
  /** @type {object[]} */
  const categories = [];

  for (const code of codes) {
    const value = code.code || '';

    if (value.startsWith('FIL')) {
      filters.push(code);
    } else if (value.startsWith('CAT')) {
      categories.push(code);
    }
  }

  return { filters, categories };
}

module.exports = {
  saveCommonCode,
  getAllCommonCodes,
  getCommonCodeByCode,
};
