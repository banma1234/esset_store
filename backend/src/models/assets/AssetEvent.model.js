const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * @typedef {'CREATE'|'UPDATE'|'DELETE'} AssetEventType
 */

/**
 * @typedef {Object} AssetEvent
 * @property {AssetEventType} eventType 이벤트 타입 (CREATE/UPDATE/DELETE)
 * @property {import('mongoose').Types.ObjectId} assetId 참조 대상 에셋 ID (assets._id)
 * @property {import('mongoose').Types.ObjectId || undefined} assetVersionsId 참조 대상 에셋 버전 ID (assetVersions._id)
 * @property {string} [fileName] 파일 이름
 * @property {string} [version] 버전 번호
 * @property {Date} updatedAt 이벤트 기록 시각
 */

const assetEventSchema = new Schema({
  eventType: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true,
  },
  assetId: {
    type: Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
  },
  assetVersionsId: {
    type: Schema.Types.ObjectId,
    ref: 'AssetVersion',
  },
  fileName: {
    type: String,
  },
  version: {
    type: String, // ✅ 이미 이렇게 바꾼 상태라고 가정
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
});

// 에셋 기준 이벤트 타임라인 조회
assetEventSchema.index({ assetId: 1, updatedAt: -1 });

const AssetEventModel = mongoose.model('AssetEvent', assetEventSchema);

module.exports = AssetEventModel;
