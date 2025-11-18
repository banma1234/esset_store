const express = require('express');
const router = express.Router();
const { getAssetsBySearchOptions } = require('../services/assets/assets.service');

/**
 * @route GET /api/v1/assets/search
 * @description 에셋 검색 (카테고리 + 필터 + 페이지네이션)
 * @query category 카테고리 코드 (예: CAT-BDY)
 * @query filters 필터 코드들 (예: ?filters=FIL-MAT-STL,FIL-UNI-MET 또는 filters=...&filters=...)
 * @query page 페이지 번호 (1부터 시작, 기본값 1)
 */
router.get('/api/v1/assets/search', async (req, res, next) => {
  try {
    const result = await getAssetsBySearchOptions(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
