// src/services/assets/injectMetaData.service.js
/**
 * @file inject-metadata.service.js
 * @description glTF(JSON, Embedded)에 썸네일/버전/업로드일/userData 주입 (gltf-transform v4)
 */
const { Buffer } = require('buffer');
const core = require('@gltf-transform/core');

const NodeIO = core?.NodeIO || core?.default?.NodeIO;
const Document = core?.Document || core?.default?.Document;

if (typeof NodeIO !== 'function' || typeof Document !== 'function') {
  throw new Error('injectMetadata: gltf-transform(NodeIO/Document) 로드 실패');
}

/**
 * @typedef {Object} InjectParams
 * @property {string} gltfJsonStr
 * @property {Buffer|Uint8Array} thumbJpeg
 * @property {string} version
 * @property {string|Date=} uploadedAt
 * @property {Record<string, any>=} userData
 */
async function injectMetadata(params) {
  const { gltfJsonStr, thumbJpeg, version, uploadedAt, userData = {} } = params;

  if (typeof gltfJsonStr !== 'string' || gltfJsonStr.length < 10) {
    throw new Error('injectMetadata: INVALID_GLTF_JSON');
  }
  if (!thumbJpeg || (thumbJpeg.length ?? 0) === 0) {
    throw new Error('injectMetadata: thumbJpeg(썸네일) 누락');
  }

  // 1) JSON → Document
  const io = new NodeIO();
  const json = JSON.parse(gltfJsonStr);
  const doc = await io.readJSON({ json, resources: new Map() });
  const root = doc.getRoot();

  // 2) 썸네일 텍스처 생성/교체 (v4: Texture만 사용)
  const THUMB_TEX_NAME = '__es_thumbnail__';
  let thumbTex = root.listTextures().find((t) => t.getName?.() === THUMB_TEX_NAME);
  if (!thumbTex) thumbTex = doc.createTexture(THUMB_TEX_NAME);

  const jpegBytes = thumbJpeg instanceof Uint8Array ? thumbJpeg : new Uint8Array(Buffer.from(thumbJpeg));

  // 핵심: setURI로 "파일명"도 지정 → writeJSON 시 images[*].uri 생성 보장
  thumbTex
    .setImage(jpegBytes) // 실제 바이트
    .setMimeType('image/jpeg') // MIME
    .setURI('es-thumb.jpg') // ★ 없으면 bufferView로 나갈 수 있음 → re-read 시 오류 유발
    .setName(THUMB_TEX_NAME);

  const textures = root.listTextures();
  const textureIndex = textures.indexOf(thumbTex);

  // 3) extras는 Root에 기록 (asset.setExtras 아님)
  const prevRootExtras = (typeof root.getExtras === 'function' && root.getExtras()) || {};
  root.setExtras({
    ...prevRootExtras,
    esThumb: { textureIndex, mimeType: 'image/jpeg' },
    esMeta: {
      version: String(version || ''),
      uploadedAt: new Date(uploadedAt || Date.now()).toISOString(),
    },
    esUserData: { ...userData },
  });

  // 4) 내보내기(분리 리소스) → data:URI 인라인
  const out = await io.writeJSON(doc);
  const outJson = out.json;
  const res = out.resources || {}; // v4는 객체(Record<string, ArrayBuffer>)

  // images[*].uri → data:URI
  if (Array.isArray(outJson.images)) {
    for (const imgDef of outJson.images) {
      const key = imgDef && imgDef.uri;
      if (!key) continue; // (bufferView 경로는 건드리지 않음)
      const bin = res[key];
      if (!bin) continue;
      const mime = imgDef.mimeType || 'image/png';
      const b64 = Buffer.from(bin).toString('base64');
      imgDef.uri = `data:${mime};base64,${b64}`;
      delete res[key];
    }
  }

  // buffers[*].uri → data:URI (있을 때만)
  if (Array.isArray(outJson.buffers)) {
    for (const bufDef of outJson.buffers) {
      const key = bufDef && bufDef.uri;
      if (!key) continue;
      const bin = res[key];
      if (!bin) continue;
      const b64 = Buffer.from(bin).toString('base64');
      bufDef.uri = `data:application/octet-stream;base64,${b64}`;
      delete res[key];
    }
  }

  // 5) 검증: 모든 image가 uri 또는 bufferView 보유
  if (Array.isArray(outJson.images)) {
    const bad = outJson.images.findIndex((img) => !img || (!img.uri && typeof img.bufferView !== 'number'));
    if (bad !== -1) {
      throw new Error(`injectMetadata: images[${bad}]가 uri/bufferView 둘 다 없습니다.`);
    }
  }

  return JSON.stringify(outJson);
}

module.exports = { injectMetadata };
