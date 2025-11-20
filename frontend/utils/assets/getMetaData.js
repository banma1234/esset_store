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
 * @function mergeGltfExtrasForEsset
 * @description .gltf의 루트 extras에서 esMeta/esUserData/esThumb를 읽고,
 *              selection(category/filters)을 반영해 userMeta를 생성한다.
 *              - version: extras.esMeta.version을 읽어 bump 후 덮어쓰기
 *              - uploadedAt 등 시간 필드는 클라이언트에서 무시(세팅/변경 안 함)
 *              - esThumb는 서버 담당: 있으면 보존, 없으면 생성하지 않음
 * @param {File} gltfFile - .gltf(Embedded)
 * @param {MergeSelection} selection
 * @returns {Promise<Object>} userMeta  // upload3DModel의 userMeta로 그대로 전달
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
  // extras.esMeta.uploadedAt: 클라이언트에서 세팅/수정하지 않음(무시)

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

  // 6) esThumb는 서버 책임 → 존재 시 그대로 보존, 없으면 생성하지 않음
  // if (!extras.esThumb) { /* do nothing */ }

  // 7) 최종 userMeta(서버 커밋 바디에 실릴 객체)
  //    필요하면 서버에서 extras.esMeta.uploadedAt/썸네일 생성 후 갱신
  return {
    extras: {
      esMeta: { version: extras.esMeta.version }, // uploadedAt은 명시적으로 싣지 않음(서버에서 처리)
      esUserData: {
        rigs: userData.rigs,
        links: userData.links,
        category: userData.category,
        filters: userData.filters,
      },
      // esThumb는 있으면 포함하고, 없으면 생략
      ...(extras.esThumb ? { esThumb: extras.esThumb } : {}),
    },
  };
}
