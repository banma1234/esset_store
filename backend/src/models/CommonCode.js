const mongoose = require('mongoose');

const CommonCodeSchema = new mongoose.Schema(
  {
    /** @type {string} 고유 코드 (전역 유니크) */
    code: { type: String, required: true, unique: true, index: true, trim: true },

    /** @type {string} 코드 표시명 (필수) */
    name: { type: String, required: true, trim: true },

    /** @type {string|null} 부모 코드의 _id (자기참조, null이면 루트) */
    parentId: { type: String, default: null, index: true },

    /** @type {number|null} 깊이(루트=0). 부모가 없으면 0, 부모가 있으면 부모.depth+1 */
    depth: { type: Number, default: null, index: true },

    /** @type {Date|null} 소프트 삭제 시각 (null이면 활성) */
    deletedAt: { type: Date, default: null, index: true },

    /** @type {Date} 문서 생성 시각 (저장 시점에 직접 기록) */
    createdAt: { type: Date },

    /** @type {Boolean} 사용 여부 */
    isActive: { type: Boolean },

    /** @type {Date} 문서 갱신 시각 (저장/갱신 시점에 직접 기록, REQUIRED by schema) */
    updatedAt: { type: Date },
  },
  {
    timestamps: false, // 직접 Date 기록
    versionKey: false,
    collection: 'commonCode',
  },
);

/**
 * @description 저장 직전(created, updated) 타임스탬프를 명시적으로 기록한다.
 */
CommonCodeSchema.pre('save', function (next) {
  const now = new Date();
  if (this.isNew) this.createdAt = now;
  this.updatedAt = now;

  next();
});

/**
 * @description findOneAndUpdate 류의 갱신에서도 updatedAt을 now로 강제한다.
 */
CommonCodeSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });

  next();
});

module.exports = mongoose.model('CommonCode', CommonCodeSchema);
