const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * @typedef {Object} AssetVersion
 * @property {import('mongoose').Types.ObjectId} assetId 참조 대상 에셋 ID (assets._id)
 * @property {string} version 버전 문자열 (예: "1.0.0")
 * @property {string} fileName 파일 이름
 * @property {string} fileType 파일 형식 (예: "gltf", "stl")
 * @property {number} sizeBytes 파일 크기(바이트)
 * @property {string} url 해당 버전 파일의 CDN/S3 URL
 * @property {string} thumbnail 썸네일 URL
 * @property {Date} updatedAt 최근 갱신 시각
 */

// models/assets/AssetVersions.model.js

const assetVersionSchema = new Schema({
  assetId: {
    type: Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  sizeBytes: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
});

// 에셋별 버전 중복 방지
assetVersionSchema.index({ assetId: 1, version: -1 }, { unique: true });

const AssetVersionsModel = mongoose.model('AssetVersions', assetVersionSchema);

module.exports = AssetVersionsModel;
