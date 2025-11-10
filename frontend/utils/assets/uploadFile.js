/** 기본 POLICY (페이지에서 오버라이드 가능) */
export const DEFAULT_POLICY = {
  allowedExts: ["glb", "gltf", "stl"],
  maxSizeBytes: 200 * 1024 * 1024, // 200MB
};

/**
 * @typedef {Object} UploadPolicy
 * @property {number=} maxSizeBytes 허용 최대 바이트(옵션)
 * @property {string[]=} allowExt 허용 확장자 목록(소문자, 점 제외) 예: ['glb','gltf','stl']
 */

/**
 * @typedef {Object} FileMeta
 * @property {string} fileName 파일명(확장자 포함)
 * @property {string} extension 확장자(소문자, 점 제외)
 * @property {number} sizeBytes 바이트
 * @property {string|null} version 파일명에서 추정된 버전(없으면 null)
 * @property {string} contentType MIME 타입(비어있으면 'application/octet-stream')
 */

/**
 * 파일에서 메타데이터를 추출한다.
 * - 확장자, 파일명, 용량, (가능하면) 버전(파일명 패턴에서만 유추)
 * @param {File} file
 * @returns {FileMeta}
 */
export function extractMeta(file) {
  const fileName = file.name || "unnamed";
  const dot = fileName.lastIndexOf(".");
  const extension = dot > -1 ? fileName.slice(dot + 1).toLowerCase() : "";
  const sizeBytes = typeof file.size === "number" ? file.size : 0;
  const contentType = file.type || "application/octet-stream";

  // (가능하면) 파일명에서 버전 추정: name_v12, name-v1.2, name_v1_2 등 흔한 패턴만
  const base = dot > -1 ? fileName.slice(0, dot) : fileName;
  const verMatch =
    base.match(/[_\-\.]v(\d+(?:[\._]\d+)*)$/i) /* _v1, -v1.2, .v2_0 등 */ ||
    base.match(/[_\-\.](\d{8})$/); /* 뒤에 날짜형(예: _20250101) */
  const version = verMatch ? "v." + verMatch[1].replace(/_/g, ".") + " " : "";

  return { fileName, extension, sizeBytes, version, contentType };
}

/**
 * POLICY 기반 유효성 검증(옵션): 확장자/사이즈 체크
 * @param {FileMeta} meta
 * @param {UploadPolicy=} policy
 * @throws {Error} 검증 실패 시 에러
 */
export function validateByPolicy(meta, policy) {
  if (!policy) return;
  if (policy.allowExt && policy.allowExt.length) {
    const ok = policy.allowExt.includes(meta.extension);
    if (!ok) throw new Error(`허용되지 않은 확장자입니다: .${meta.extension}`);
  }
  if (typeof policy.maxSizeBytes === "number") {
    if (meta.sizeBytes > policy.maxSizeBytes) {
      throw new Error(
        `파일 용량이 큽니다: ${(meta.sizeBytes / 1024 / 1024).toFixed(2)} MB`
      );
    }
  }
}

/**
 * 서버로 presign 요청(POST /api/v1/storage/presign)
 * 서버는 presigned PUT URL을 발급해줘야 한다.
 * @param {$api} api Nuxt 전역 API 헬퍼(this.$api)
 * @param {FileMeta} meta
 * @returns {{ url: string, headers?: Record<string,string>, key?: string }}
 */
export async function requestPresign(api, meta, key) {
  // 서버가 원하는 스키마에 맞춰 전달(예시)
  const res = await api.post("/storage/presign", {
    fileName: meta.fileName,
    contentType: meta.contentType,
    sizeBytes: meta.sizeBytes,
    extension: meta.extension,
    version: meta.version,
    key: key,
  });
  // 기대 응답 예시: { url, headers?, key? }
  if (!res || !res.url)
    throw new Error("presigned URL 응답이 올바르지 않습니다.");
  return { url: res.url, headers: res.headers || {}, key: res.key };
}

/**
 * presigned URL로 파일 PUT 업로드
 * @param {string} url
 * @param {File} file
 * @param {Record<string,string>=} headers
 */
export async function uploadViaPresignedPut(url, file, headers = {}) {
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      ...headers,
    },
    body: file,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`업로드 실패(${resp.status}) ${text && "- " + text}`);
  }
}

/**
 * 3D 모델 업로드 전체 파이프라인
 * 1) 메타 추출 → 2) 정책검증(옵션) → 3) presign 요청 → 4) presigned PUT 업로드
 *
 * @param {Object} params
 * @param {File} params.file 업로드할 파일
 * @param {$api} params.api 전역 API 헬퍼(this.$api)
 * @param {UploadPolicy=} params.policy 유효성 검사 정책(옵션)
 * @returns {Promise<{ meta: FileMeta, presign: any, result: { ok: true, key?: string } }>}
 */
export async function upload3DModel({ file, api, policy }) {
  if (!file) throw new Error("업로드할 파일이 없습니다.");
  if (!api) throw new Error("API 헬퍼가 필요합니다.");

  const meta = extractMeta(file);
  validateByPolicy(meta, policy);

  const key = `assets/staging/${meta.fileName}/${meta.version}${meta.fileName}`;

  await requestPresign(api, meta, key).then((res) => {
    const { url, headers } = res.data;

    uploadViaPresignedPut(url, file, headers);
  });

  return { meta, presign, result: { ok: true, key: presign.key } };
}
