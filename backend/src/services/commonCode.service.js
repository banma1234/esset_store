const CommonCode = require('../models/CommonCode');
const { AppError } = require('../errors/appError');
const { ObjectId } = require('mongodb');

/**
 * @function loadParentFor
 * @description parentId 존재하면 부모 문서를 로드한다.
 * @param {string|null} parentId 검증/계산 대상 부모 코드 문자열
 * @returns {Promise<object|null>} 부모 문서(lean) 또는 null
 */
async function loadParentFor(parentId) {
  if (!parentId) return null;
  return CommonCode.findOne({ _id: new ObjectId(parentId), deletedAt: null }).lean();
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
 * @param {{ code: string, name: string, parentId?: (string|null) }} payload 생성할 코드 정보
 * @returns {Promise<object>} 생성된 문서(POJO)
 * @throws {Error} 부모 없음/삭제(400), 코드 중복(409), 서버 오류(500)
 */
async function saveCommonCode(payload) {
  const { code, name, parentId, isActive } = payload;
  const parent = await loadParentFor(parentId);
  let depth = 0;

  if (parentId && parent) {
    depth = computeDepth(parent);
  }

  try {
    const doc = await CommonCode.create({ code, name, parentId, depth, isActive });

    return doc.toObject();
  } catch (e) {
    if (e && e.code === 11000) {
      throw new AppError('해당 코드는 이미 존재합니다.', 409, 'CODE_ARLEADY_EXISTS');
    }
    throw new AppError('알 수 없는 에러', 500, 'UNKNOWN_ERROR');
  }
}

async function updateCommonCode(payload) {
  const { code, name, isActive, parentId } = payload;

  await CommonCode.updateOne({ _id: parentId }, { code, name, isActive });
}

/**
 * @function getCommonCodeByCode
 * @description 특정 code에 해당하는 공통코드를 조회한다. (GET, code 지정)
 * @param {string} code 조회할 code
 * @returns {Promise<object|null>} 문서(lean) 또는 null
 */
async function getCommonCodeByCode(code) {
  return CommonCode.findOne({ code: code, deletedAt: null }).lean();
}

/**
 * @function getAllCommonCodes
 * @description CommonCode 컬렉션에서 삭제되지 않은 공통코드를 모두 조회한 뒤
 * FIL* → filters, CAT* → categories 로 분류해서 반환한다.
 * @returns {Promise<{filters: object[], categories: object[]}>}
 */
async function getAllCommonCodes() {
  const codes = await CommonCode.find({ deletedAt: null }).sort({ depth: 1, code: 1 }).lean();

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
  updateCommonCode,
};
