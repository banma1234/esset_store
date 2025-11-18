// utils/assets/getMetaData.js

/**
 * @function getExt
 * @description 파일명에서 확장자를 소문자로 추출한다.
 * @param {string} [filename=""] - 파일명
 * @returns {string} 추출된 확장자(마침표 제외), 없으면 빈 문자열
 */
export function getExt(filename = "") {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

/**
 * @function formatBytes
 * @description 바이트 크기를 사람이 읽기 쉬운 단위(B, KB, MB)로 변환한다.
 * @param {number} [n=0] - 바이트 크기
 * @returns {string} 변환된 문자열
 */
export function formatBytes(n = 0) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * @function bumpVersion
 * @description 버전 1 증가시키는 함수.
 * @param {string} versionStr - "1.0.5" 형식의 버전 문자열
 * @returns {string} - 1 증가된 버전 문자열 (예: "1.0.6")
 */
function bumpVersion(versionStr) {
  if (typeof versionStr !== "string") {
    throw new Error("bumpVersion: versionStr 는 문자열이어야 합니다.");
  }

  const parts = versionStr.split(".");

  // "x.y.z" 형태인지 체크
  if (parts.length !== 3) {
    throw new Error('bumpVersion: "x.y.z" 형식의 버전만 지원합니다.');
  }

  // 각 파트가 한 자리 숫자인지 체크
  if (!parts.every((p) => /^[0-9]$/.test(p))) {
    throw new Error(
      "bumpVersion: 각 버전 파트는 한 자리 숫자(0~9)여야 합니다."
    );
  }

  // 1) "1.0.5" → ["1","0","5"] → "105"
  const compactStr = parts.join("");
  const num = Number(compactStr);

  if (!Number.isFinite(num)) {
    throw new Error("bumpVersion: 숫자 변환에 실패했습니다.");
  }

  // 2) 105 + 1 → 106
  const bumped = num + 1;

  // 3) 다시 문자열로 변환 후, 원래 자릿수(3자리)를 유지
  const bumpedStr = String(bumped).padStart(parts.length, "0");

  // 4) "106" → ["1","0","6"] → "1.0.6"
  const nextParts = bumpedStr.split("");
  const nextVersion = nextParts.join(".");

  return nextVersion;
}

/**
 * @function getMetaData
 * @description json 메타데이터 파일의 기본 정보와 텍스트 내용을 추출한다.
 *              - json 이 아닌 확장자는 unsupported 로 처리한다.
 * @param {File} file - 업로드된 파일 객체
 * @returns {Promise<Object>} 메타데이터 정보 객체
 */
export async function getMetaData(file) {
  const ext = getExt(file.name);
  const base = {
    filename: file.name,
    ext,
    mime: file.type || null,
    size: file.size,
    sizeHuman: formatBytes(file.size),
  };

  if (ext !== "json") {
    return {
      ...base,
      type: "unsupported",
    };
  }

  try {
    const text = await file.text();
    return {
      ...base,
      type: "json",
      text,
    };
  } catch (e) {
    return {
      ...base,
      type: "error",
      parseError: e?.message || String(e),
    };
  }
}

/**
 * @typedef {Object} MergeSelection
 * @property {string} categoryCode      - 선택된 카테고리 코드
 * @property {string[]} filterCodes     - 선택된 필터 코드 배열
 */

/**
 * @function mergeUserMeta
 * @description 기존 메타데이터 파일에 입력한 메타데이터 덮어씌우기 *
 * @param {File|null|undefined} metaFile - 사용자 메타데이터 json 파일
 * @param {MergeSelection} selection      - 선택된 카테고리/필터 코드 정보
 * @returns {Promise<Object>} 병합된 최종 메타데이터 객체(mergeObj)
 */
export async function mergeUserMeta(metaFile, selection) {
  const categoryCode = (selection && selection.categoryCode) || "";
  const filterCodes = Array.isArray(selection?.filterCodes)
    ? selection.filterCodes
    : [];

  // json 파일이 주어진 경우 → 기존 JSON에 병합 시도
  if (metaFile) {
    const metaInfo = await getMetaData(metaFile);

    if (metaInfo.type === "json" && metaInfo.text) {
      let parsed;
      try {
        parsed = JSON.parse(metaInfo.text);
      } catch (e) {
        parsed = {};
      }

      if (typeof parsed !== "object" || parsed === null) {
        parsed = {};
      }

      // userData 보장
      if (!parsed.userData || typeof parsed.userData !== "object") {
        parsed.userData = {};
      }

      // 옛날 오타 필드(catergory)는 있으면 제거
      if (Object.prototype.hasOwnProperty.call(parsed.userData, "catergory")) {
        delete parsed.userData.catergory;
      }

      // 🔥 version 처리
      // - 기존 userData.version 이 있으면 bumpVersion 적용
      // - 없거나 에러 시 "1.0.0" 으로 설정
      const prevVersion = parsed.version;
      let nextVersion = "1.0.0";

      if (typeof prevVersion === "string" && prevVersion.trim()) {
        try {
          nextVersion = bumpVersion(prevVersion.trim());
        } catch (e) {
          // bump 실패 시에도 1.0.0 으로 초기화
          nextVersion = "1.0.0";
        }
      }
      parsed.version = nextVersion;

      // 🔥 category / filters 는 기존 값을 버리고, 선택 값을 기준으로 강제 덮어쓰기
      parsed.userData.category = categoryCode;
      parsed.userData.filters = filterCodes;

      return parsed;
    }
  }

  // metaFile 이 없거나, json 이 아니거나, 파싱 실패/unsupported 인 경우
  return {
    version: "1.0.0",
    userData: {
      category: categoryCode,
      filters: filterCodes,
      links: {},
      rigs: {},
    },
  };
}
