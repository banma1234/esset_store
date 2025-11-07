// utils/upload/metadata.js
// 3D 파일(.glb, .gltf, .stl)의 "가벼운" 메타데이터를 추출한다.
// - GLB: 매직/버전/총 길이
// - GLTF: asset.version, scene/node/mesh/buffer 수(텍스트 JSON 파싱)
// - STL: 바이너리/ASCII 추정, 삼각형(face) 개수(바이너리 시)
// 주의: 대용량 .gltf(텍스트)를 전부 읽고 JSON.parse 하므로, 실제 서비스에서는 별도 업로드 파이프라인(예: 서버측 분석)을 권장.

export function getExt(filename = "") {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function formatBytes(n = 0) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/** GLB 헤더(12바이트) 파싱: magic(0-3), version(4-7), length(8-11) */
async function parseGlb(file) {
  const header = await file.slice(0, 12).arrayBuffer();
  const dv = new DataView(header);
  const magic = dv.getUint32(0, true); // 'glTF' = 0x46546C67 (리틀엔디안)
  const version = dv.getUint32(4, true); // 보통 2
  const length = dv.getUint32(8, true); // 파일 총 길이
  return {
    magicHex: "0x" + magic.toString(16),
    version,
    declaredLength: length,
  };
}

/** GLTF 텍스트 JSON 파싱(간단 요약) */
async function parseGltf(file) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { jsonParseError: true };
  }
  const asset = data.asset || {};
  return {
    assetVersion: asset.version || null,
    scenes: Array.isArray(data.scenes) ? data.scenes.length : null,
    nodes: Array.isArray(data.nodes) ? data.nodes.length : null,
    meshes: Array.isArray(data.meshes) ? data.meshes.length : null,
    buffers: Array.isArray(data.buffers) ? data.buffers.length : null,
  };
}

/** STL: 바이너리/ASCII 추정 + faceCount(바이너리) */
async function parseStl(file) {
  // 빠른 ASCII 판별: 시작부에 "solid"가 있고, 어딘가에 "facet"가 자주 등장한다면 ASCII일 가능성
  const start = await file.slice(0, 512).text();
  const looksAscii = /^\s*solid\s/i.test(start);
  if (!looksAscii) {
    // 바이너리 STL 가정: 80바이트 헤더 + 4바이트 uint32(face count)
    const head = await file.slice(80, 84).arrayBuffer();
    const dv = new DataView(head);
    const faceCount = dv.getUint32(0, true);
    return { isBinary: true, faceCount };
  }

  // ASCII STL은 faceCount를 빠르게 얻기 어렵다(전체 텍스트 스캔 필요).
  // 간단히 ASCII 플래그만 반환.
  return { isAscii: true };
}

/** 메타데이터 추출 엔트리 */
export async function extract3DMetadata(file) {
  const ext = getExt(file.name);
  const base = {
    filename: file.name,
    ext,
    mime: file.type || null, // 브라우저가 감지한 MIME
    size: file.size, // 바이트
    sizeHuman: formatBytes(file.size),
  };

  try {
    if (ext === "glb") {
      return { ...base, type: "glb", glb: await parseGlb(file) };
    }
    if (ext === "gltf") {
      return { ...base, type: "gltf", gltf: await parseGltf(file) };
    }
    if (ext === "stl") {
      return { ...base, type: "stl", stl: await parseStl(file) };
    }

    return { ...base, type: "unknown" };
  } catch (e) {
    return { ...base, type: "unknown", parseError: e?.message || String(e) };
  }
}
