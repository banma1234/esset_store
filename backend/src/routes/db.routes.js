const router = require('express').Router();
const Ping = require('../models/Ping');

// POST /api/v1/db/ping  -> 새 핑 생성
router.post('/ping', async (req, res, next) => {
  try {
    const doc = await Ping.create({ note: req.body?.note || '' });
    res.status(201).json({ ok: true, id: doc._id, at: doc.at });
  } catch (e) { next(e); }
});

// GET /api/v1/db/ping   -> 총 개수/최근 5개
router.get('/ping', async (req, res, next) => {
  try {
    const total = await Ping.countDocuments({});
    const recent = await Ping.find({}).sort({ at: -1 }).limit(5).lean();
    res.json({ ok: true, total, recent });
  } catch (e) { next(e); }
});

module.exports = router;
