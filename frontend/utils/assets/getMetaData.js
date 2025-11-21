/**
 * @function bumpVersion
 * @description "x.y.z" (각 자리 한 자리 숫자 0~9) 형태의 버전을 +1 한다.
 * @example "1.0.0" -> "1.0.1"
 */
function bumpVersion(versionStr) {
  if (typeof versionStr !== "string") {
    throw new Error("bumpVersion: versionStr 는 문자열이어야 합니다.");
  }
  const parts = versionStr.split(".");
  if (parts.length !== 3) {
    throw new Error('bumpVersion: "x.y.z" 형식만 지원합니다.');
  }
  if (!parts.every((p) => /^[0-9]$/.test(p))) {
    throw new Error("bumpVersion: 각 파트는 한 자리 숫자(0~9)여야 합니다.");
  }
  const num = Number(parts.join(""));
  if (!Number.isFinite(num)) throw new Error("bumpVersion: 숫자 변환 실패");
  const bumped = String(num + 1).padStart(parts.length, "0"); // 길이 유지
  return bumped.split("").join("."); // "106" -> "1.0.6"
}

/**
 * @typedef {Object} MergeSelection
 * @property {string} categoryCode
 * @property {string[]} filterCodes
 */

/** 내부: 브라우저 File → UTF-8 텍스트 */
async function readFileAsText(file) {
  const text = await file.text();
  return String(text || "");
}

/** 내부: buffers/images가 모두 data: 인지 (Embedded 확인) */
function isEmbeddedGltfJSON(gltf) {
  const isData = (u) => typeof u === "string" && u.startsWith("data:");
  if (Array.isArray(gltf?.buffers)) {
    for (const b of gltf.buffers) {
      if (b?.uri && !isData(b.uri)) return false;
    }
  }
  if (Array.isArray(gltf?.images)) {
    for (const i of gltf.images) {
      if (i?.uri && !isData(i.uri)) return false;
    }
  }
  return true;
}

/**
 * @function computeGltfCounts
 * @description 메쉬 카운트 등 집계
 * @param {Object} gltf - 파싱된 glTF JSON
 * @returns {Object} counts 객체

 */
function computeGltfCounts(gltf) {
  const len = (v) => (Array.isArray(v) ? v.length : 0);

  // primitives 개수 합산
  let primCount = 0;
  if (Array.isArray(gltf.meshes)) {
    for (const m of gltf.meshes) {
      if (Array.isArray(m.primitives)) {
        primCount += m.primitives.length;
      }
    }
  }

  const scenesCount = len(gltf.scenes);
  const hasSceneIndex = typeof gltf.scene === "number";

  return {
    scene: scenesCount || (hasSceneIndex ? 1 : 0),
    scenes: scenesCount,
    nodes: len(gltf.nodes),
    meshes: len(gltf.meshes),
    materials: len(gltf.materials),
    skins: len(gltf.skins),
    textures: len(gltf.textures),
    accessors: len(gltf.accessors),
    prims: primCount,
  };
}

/**
 * @function computeBufferStats
 * @description 버퍼 카운트 집계
 * @param {Object} gltf - 파싱된 glTF JSON
 * @returns {{buffers:number, bufferViews:number, totalBytes:number}}
 */
function computeBufferStats(gltf) {
  const buffersArr = Array.isArray(gltf.buffers) ? gltf.buffers : [];
  const bufferViewsArr = Array.isArray(gltf.bufferViews)
    ? gltf.bufferViews
    : [];

  let totalBytes = 0;
  for (const b of buffersArr) {
    const len = typeof b?.byteLength === "number" ? b.byteLength : 0;
    totalBytes += len;
  }

  return {
    buffers: buffersArr.length,
    bufferViews: bufferViewsArr.length,
    totalBytes,
  };
}

/**
 * @function mergeGltfExtrasForEsset
 * @description 집계한 메타데이터들 병합
 * @param {MergeSelection} selection
 * @returns {Promise<{
 *   extras: Object,
 *   counts: Object,
 *   buffers: {buffers:number, bufferViews:number, totalBytes:number}
 * }>} userMeta
 */
export async function mergeGltfExtrasForEsset(gltfFile, selection) {
  if (!gltfFile)
    throw new Error("mergeGltfExtrasForEsset: gltfFile이 없습니다.");

  // 1) 파싱
  let gltf;
  try {
    const text = await readFileAsText(gltfFile);
    gltf = JSON.parse(text);
  } catch {
    throw new Error("INVALID_GLTF_JSON");
  }

  // 2) Embedded만 허용
  if (!isEmbeddedGltfJSON(gltf)) {
    throw new Error("내장형(Embedded) glTF만 업로드할 수 있습니다.");
  }

  // 3) 루트 extras 확보
  if (!gltf.extras || typeof gltf.extras !== "object") gltf.extras = {};
  const extras = gltf.extras;

  // 4) esMeta 보장 + version bump (uploadedAt은 무시)
  if (!extras.esMeta || typeof extras.esMeta !== "object") extras.esMeta = {};

  const prevVer =
    typeof extras.esMeta.version === "string"
      ? extras.esMeta.version.trim()
      : "";
  let nextVersion = "1.0.0";
  if (prevVer) {
    try {
      nextVersion = bumpVersion(prevVer);
    } catch {
      nextVersion = "1.0.0";
    }
  }
  extras.esMeta.version = nextVersion;

  // 4-1) glTF 구조 counts / buffers 요약 계산
  const counts = computeGltfCounts(gltf);
  const buffers = computeBufferStats(gltf);

  // 5) esUserData 보장 + 선택값 반영
  if (!extras.esUserData || typeof extras.esUserData !== "object")
    extras.esUserData = {};
  const userData = extras.esUserData;

  const categoryCode = (selection && selection.categoryCode) || "";
  const filterCodes = Array.isArray(selection?.filterCodes)
    ? selection.filterCodes
    : [];

  // 필수 구조 보장
  if (typeof userData.links !== "object" || userData.links === null)
    userData.links = {};
  if (typeof userData.rigs !== "object" || userData.rigs === null)
    userData.rigs = {};

  // 선택값이 우선(강제 덮어쓰기)
  userData.category = categoryCode;
  userData.filters = filterCodes;

  return {
    extras: {
      esMeta: {
        version: extras.esMeta.version,
      },
      esUserData: {
        rigs: userData.rigs,
        links: userData.links,
        category: userData.category,
        filters: userData.filters,
      },
      esStats: {
        counts,
        buffers,
      },
      ...(extras.esThumb ? { esThumb: extras.esThumb } : {}),
    },
  };
}
