/**
 * @file gltf-meta.service.js
 * @description glTF(JSON)을 gltf-transform(NodeIO)로 읽어 메타데이터만 추출 (v4)
 */
const core = require('@gltf-transform/core');
const NodeIO = core?.NodeIO || core?.default?.NodeIO;
const Document = core?.Document || core?.default?.Document;

async function extractGltfMetadata(gltfJsonStr) {
  if (typeof gltfJsonStr !== 'string' || gltfJsonStr.length < 10) {
    throw new Error('extractGltfMetadata: INVALID_GLTF_JSON');
  }
  const json = JSON.parse(gltfJsonStr);

  const io = new NodeIO();
  const doc = await io.readJSON({ json, resources: new Map() });
  if (!(doc && typeof doc.getRoot === 'function')) {
    throw new Error('extractGltfMetadata: NodeIO.readJSON 반환값이 Document가 아닙니다.');
  }
  const root = doc.getRoot();

  const safeList = (obj, method) => (obj && typeof obj[method] === 'function' ? obj[method]() : []);

  const asset = root.getAsset?.() || {};
  const scenes = safeList(root, 'listScenes');
  const nodes = safeList(root, 'listNodes');
  const meshes = safeList(root, 'listMeshes');
  const materials = safeList(root, 'listMaterials');
  const textures = safeList(root, 'listTextures');
  const accessors = safeList(root, 'listAccessors');
  const animations = safeList(root, 'listAnimations');
  const skins = safeList(root, 'listSkins');

  const prims = meshes.reduce(
    (n, m) => n + (typeof m.listPrimitives === 'function' ? m.listPrimitives().length : 0),
    0,
  );

  // images는 Root에 listImages가 없을 수 있으므로 JSON에서만 카운트
  const imagesJson = Array.isArray(json.images) ? json.images : [];
  const mimeTypes = {};
  for (const img of imagesJson) {
    let mt = img.mimeType;
    if (!mt && typeof img.uri === 'string' && img.uri.startsWith('data:')) {
      const m = img.uri.slice(5).split(';', 1)[0];
      if (m) mt = m;
    }
    if (mt) mimeTypes[mt] = (mimeTypes[mt] || 0) + 1;
  }

  const isDataUri = (uri) => typeof uri === 'string' && uri.startsWith('data:');
  const embeddedBuffers =
    Array.isArray(json.buffers) && json.buffers.length ? json.buffers.every((b) => isDataUri(b.uri)) : null;
  const embeddedImages = imagesJson.length ? imagesJson.every((i) => isDataUri(i.uri)) : null;

  const buffers = safeList(root, 'listBuffers');
  const bufferViews = safeList(root, 'listBufferViews');
  const totalBytes = buffers.reduce(
    (sum, b) => sum + (typeof b.getByteLength === 'function' ? b.getByteLength() : 0),
    0,
  );

  // root.extras 수집
  const rootExtras = typeof root.getExtras === 'function' ? root.getExtras() : null;

  return {
    counts: {
      scenes: scenes.length,
      nodes: nodes.length,
      meshes: meshes.length,
      prims,
      materials: materials.length,
      textures: textures.length,
      images: imagesJson.length,
      accessors: accessors.length,
      animations: animations.length,
      skins: skins.length,
    },
    buffers: { buffers: buffers.length, bufferViews: bufferViews.length, totalBytes },
    images: { mimeTypes },
    flags: {
      embeddedBuffers,
      embeddedImages,
      hasExtras: Boolean(rootExtras && Object.keys(rootExtras).length),
    },
    extras: {
      root: rootExtras || null,
    },
  };
}

module.exports = { extractGltfMetadata };
