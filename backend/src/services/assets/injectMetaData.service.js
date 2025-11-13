/**
 * @file inject-metadata.service.js
 * @description glTF(JSON, Embedded)에 썸네일/버전/업로드일/userData 주입 (glTF-Transform v4)
 * - v4: Image는 별도 리스트가 아닌 Texture에 통합됨. (root.listImages() 없음)
 * - 썸네일은 Texture로 생성하고 setURI(data:)로 바로 임베드 → writeJSON 후처리 불필요
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
 * @property {string} gltfJsonStr      - glTF(JSON) 문자열(Embedded 전제)
 * @property {Buffer|Uint8Array} thumbJpeg - JPEG 썸네일 바이트
 * @property {string} version          - 예: "1.0.0"
 * @property {string|Date=} uploadedAt - 업로드일(ISO 권장)
 * @property {Record<string, any>=} userData - 임의 사용자 데이터
 */

/**
 * @function injectMetadata
 * @description glTF 본문에 메타데이터(썸네일/버전/업로드일/userData)를 주입한다.
 * @param {InjectParams} params
 * @returns {Promise<string>} 메타 주입이 반영된 glTF(JSON) 문자열
 */
async function injectMetadata(params) {
  const { gltfJsonStr, thumbJpeg, version, uploadedAt, userData = {} } = params;

  if (typeof gltfJsonStr !== 'string' || gltfJsonStr.length < 10) {
    throw new Error('injectMetadata: INVALID_GLTF_JSON');
  }
  const jpegBytes = thumbJpeg instanceof Uint8Array ? thumbJpeg : new Uint8Array(Buffer.from(thumbJpeg));
  if (!jpegBytes.length) throw new Error('injectMetadata: thumbJpeg(썸네일) 누락');

  // 1) JSON → Document
  const io = new NodeIO();
  const json = JSON.parse(gltfJsonStr);
  const doc = await io.readJSON({ json, resources: {} }); // v4: 객체 매핑 사용
  const root = doc.getRoot();

  // 2) 썸네일 텍스처 생성/교체 (v4: Texture가 이미지+텍스처 역할)
  const THUMB_NAME = '__es_thumbnail__';
  let thumbTex = root.listTextures().find((t) => t.getName?.() === THUMB_NAME);
  if (!thumbTex) thumbTex = doc.createTexture(THUMB_NAME);

  // (A) setURI(data:)만으로 임베드 — resources 후처리 불필요
  const dataUri = `data:image/jpeg;base64,${Buffer.from(jpegBytes).toString('base64')}`;
  thumbTex.setURI(dataUri).setMimeType('image/jpeg');

  // 텍스처 인덱스(= 추후 내보낸 glTF의 images[] 인덱스와 일치하도록 보장됨)
  const textures = root.listTextures();
  const textureIndex = textures.indexOf(thumbTex);

  // 3) 최상위 Root.extras에 메타 저장 (asset.extras가 아님)
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

  // 4) Document → JSON (Embedded 유지)
  const out = await io.writeJSON(doc); // { json, resources }
  // dataURI를 사용했으므로 out.resources에 썸네일 바이트는 남지 않음.
  return JSON.stringify(out.json);
}

module.exports = { injectMetadata };
