const router = require('express').Router();
const { extractGltfMetadata } = require('../services/assets/unpackageAssets.service');
const { getSafeObjectBuffer } = require('../services/assets/assets.service');
const { injectMetadata } = require('../services/assets/injectMetaData.service');

// GET /api/v1/db/ping   -> 총 개수/최근 5개
router.get('/api/v1/test2', async (req, res, next) => {
  try {
    const gltfBuffer = await getSafeObjectBuffer('assets/final/wheel_ferari/1.0.0/wheel_ferari.gltf');
    const target = gltfBuffer.toString('utf8');

    const metaData = await extractGltfMetadata(target);
    console.log('=====================');
    console.log('[thumb-worker] glTF meta:', JSON.stringify(metaData, null, 2));
    console.log('=====================');

    return { ok: true };
  } catch (e) {
    next(e);
  }
});

module.exports = router;
