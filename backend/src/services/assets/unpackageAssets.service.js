// gltf-meta.service.js (발췌: 핵심 변경만)
const core = require('@gltf-transform/core');
const NodeIO = core?.NodeIO || core?.default?.NodeIO;
const Document = core?.Document || core?.default?.Document;

async function extractGltfMetadata(gltfJsonStr) {
  if (typeof gltfJsonStr !== 'string' || gltfJsonStr.length < 10) {
    throw new Error('extractGltfMetadata: INVALID_GLTF_JSON');
  }

  const json = JSON.parse(gltfJsonStr);
  const io = new NodeIO();

  // readJSON은 Promise<Document>
  const doc = await io.readJSON({ json, resources: new Map() });
  if (!(doc && typeof doc.getRoot === 'function')) {
    throw new Error('extractGltfMetadata: NodeIO.readJSON 반환값이 Document가 아닙니다.');
  }
  const root = doc.getRoot();

  // ✅ 메서드 호출 방어 유틸
  const safeList = (obj, method) => (obj && typeof obj[method] === 'function' ? obj[method]() : []);

  // asset
  const asset = root.getAsset?.() || {};
  const assetInfo = {
    generator: asset.generator || null,
    version: asset.version || null,
    copyright: asset.copyright || null,
  };

  // ✅ list* 호출은 모두 safeList로 감싼다
  const scenes = safeList(root, 'listScenes');
  const nodes = safeList(root, 'listNodes');
  const meshes = safeList(root, 'listMeshes');
  const materials = safeList(root, 'listMaterials');
  const textures = safeList(root, 'listTextures');
  // ❗ images는 가끔 환경에 따라 listImages가 없을 수 있으므로 JSON에서 직접
  const imagesJson = Array.isArray(json.images) ? json.images : [];
  const accessors = safeList(root, 'listAccessors');
  const animations = safeList(root, 'listAnimations');
  const skins = safeList(root, 'listSkins');

  const prims = meshes.reduce(
    (n, m) => n + (typeof m.listPrimitives === 'function' ? m.listPrimitives().length : 0),
    0,
  );

  const buffers = safeList(root, 'listBuffers');
  const bufferViews = safeList(root, 'listBufferViews');
  const totalBytes = buffers.reduce(
    (sum, b) => sum + (typeof b.getByteLength === 'function' ? b.getByteLength() : 0),
    0,
  );

  // ✅ 이미지 MIME 요약: JSON 기준(URI가 data:면 파싱)
  const mimeTypes = {};
  for (const img of imagesJson) {
    let mt = img.mimeType;
    if (!mt && typeof img.uri === 'string' && img.uri.startsWith('data:')) {
      const m = img.uri.slice(5).split(';', 1)[0]; // data:image/jpeg;base64,...
      if (m) mt = m;
    }
    if (mt) mimeTypes[mt] = (mimeTypes[mt] || 0) + 1;
  }

  // 임베디드 플래그도 JSON 기준
  const isDataUri = (uri) => typeof uri === 'string' && uri.startsWith('data:');
  const embeddedBuffers =
    Array.isArray(json.buffers) && json.buffers.length ? json.buffers.every((b) => isDataUri(b.uri)) : null;
  const embeddedImages = imagesJson.length ? imagesJson.every((i) => isDataUri(i.uri)) : null;

  // ...생략...
  const out = await io.writeJSON(doc);
  const outJson = out.json;
  const res = out.resources || {}; // ← v4는 일반 객체(Map 아님)

  // 1) images[*].uri → data:URI
  if (Array.isArray(outJson.images)) {
    for (const imgDef of outJson.images) {
      const key = imgDef && imgDef.uri;
      if (!key) continue;
      const bin = res[key];
      if (!bin) continue; // data:URI이거나 외부경로가 아닐 수도 있음
      const mime = imgDef.mimeType || 'image/png'; // 없으면 합리적 기본값
      const b64 = Buffer.from(bin).toString('base64');
      imgDef.uri = `data:${mime};base64,${b64}`;
      delete res[key];
    }
  }

  // 2) buffers[*].uri → data:URI
  if (Array.isArray(outJson.buffers)) {
    for (const bufDef of outJson.buffers) {
      const key = bufDef && bufDef.uri;
      if (!key) continue;
      const bin = res[key];
      if (!bin) continue;
      const b64 = Buffer.from(bin).toString('base64');
      // glTF buffer는 MIME가 정해지지 않았으니 통상 octet-stream 사용
      bufDef.uri = `data:application/octet-stream;base64,${b64}`;
      delete res[key];
    }
  }

  // (선택) 남은 키가 있으면 진단 로그
  const leftoverKeys = Object.keys(res);
  if (leftoverKeys.length) {
    console.warn('[injectMetadata] leftover resources not inlined:', leftoverKeys);
  }

  return JSON.stringify(outJson);
}

module.exports = { extractGltfMetadata };
