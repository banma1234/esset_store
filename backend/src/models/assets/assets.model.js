const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * @typedef {Object} LatestVersionInfo
 * @property {string} version 버전 문자열 (예: "1.0.0")
 * @property {string} url 해당 버전의 파일 URL
 */

/**
 * @typedef {Object} Asset
 * @property {string} fileName 파일 이름
 * @property {string} fileType 파일 형식 (예: "gltf", "stl")
 * @property {number} sizeBytes 파일 크기(바이트)
 * @property {string} thumbnail 썸네일
 * @property {Object} category 카테고리 정보 객체
 * @property {Object[]} filters 필터 정보 배열
 * @property {LatestVersionInfo} latestVersion 최신 버전 정보
 * @property {Date} updatedAt 최근 갱신 시각
 * @property {Date|null} deletedAt 삭제 시각(소프트 삭제용, 미삭제 시 null)
 * @property {boolean} isActive 활성/비활성 플래그
 */

const latestVersionSchema = new Schema(
  {
    /** 버전 문자열 (예: "1.0.0") */
    version: { type: String },
    /** 해당 버전의 파일 URL */
    url: { type: String },
  },
  { _id: false }, // 서브도큐먼트에 별도 _id 생성하지 않음
);

const assetSchema = new Schema({
  /** 파일 이름 */
  fileName: { type: String },

  /** 파일 형식 (예: "gltf", "stl") */
  fileType: { type: String },

  /** 파일 크기(바이트) */
  sizeBytes: { type: Number },

  thumbnail: { type: String },

  /** 카테고리 정보 객체 */
  category: {
    type: Schema.Types.Mixed,
    default: null,
  },

  /** 필터 정보 배열 */
  filters: {
    type: [Schema.Types.Mixed],
    default: [],
  },

  /** 최신 버전 정보 */
  latestVersion: {
    type: latestVersionSchema,
    default: undefined,
  },

  /** 최근 갱신 시각 (자동 생성, 기본값 = 현재 시각) */
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },

  /** 삭제 시각 (소프트 삭제용, 기본값 = null) */
  deletedAt: {
    type: Date,
    default: null,
  },

  /** 활성 여부 (기본값 = true) */
  isActive: {
    type: Boolean,
    default: true,
  },
});

// 필요 시 인덱스 추가 예시
// assetSchema.index({ fileName: 1 });

const AssetModel = mongoose.model('Asset', assetSchema);

module.exports = AssetModel;
