// utils/uploadFile.js
// 목적: 페이지가 POLICY를 넘기면, 서비스가 그 POLICY로 검증(validate) → 메타추출 → FormData → 업로드까지 수행
// - validateByPolicy: POLICY를 이용한 공통 검증 로직(확장자/용량)
// - buildModelFormData: 파일 + 표시이름 + 확장자 + (선택)메타 → FormData
// - uploadModelWithAutoMeta: (가장 흔함) 검증 → 메타 자동 추출 → 업로드
// - uploadModelWithGivenMeta: (메타를 이미 가진 경우) 검증 → 업로드
// - extractOnly / uploadOnly: 단계별 사용이 필요할 때

import { extract3DMetadata, getExt } from "./getMetaData";

/** 기본 POLICY (페이지에서 오버라이드 가능) */
export const DEFAULT_POLICY = {
  allowedExts: ["glb", "gltf", "stl"],
  maxSizeBytes: 200 * 1024 * 1024, // 200MB
};

/**
 * POLICY 기반 공통 검증 로직
 * - 파일 존재
 * - 확장자 화이트리스트
 * - 최대 크기 제한
 * 성공 시 { ext } 반환
 */
export function validateByPolicy(file, policy = DEFAULT_POLICY) {
  if (!file) throw new Error("파일이 존재하지 않습니다.");

  const merged = { ...DEFAULT_POLICY, ...(policy || {}) };
  const ext = getExt(file.name);

  if (merged.allowedExts?.length && !merged.allowedExts.includes(ext)) {
    throw new Error(`허용되지 않는 확장자입니다: .${ext}`);
  }
  if (merged.maxSizeBytes && file.size > merged.maxSizeBytes) {
    const mb = Math.round(merged.maxSizeBytes / 1024 / 1024);

    throw new Error(`파일 용량 초과(≤ ${mb}MB)`);
  }

  return { ext };
}

/** 파일 + 표시이름 + 확장자 + (선택)메타 → FormData */
export function buildModelFormData({ file, displayName, ext, clientMeta }) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("displayName", displayName || file.name);
  fd.append("ext", ext || getExt(file.name));
  if (clientMeta) fd.append("clientMeta", JSON.stringify(clientMeta));

  return fd;
}

/**
 * 메타 자동 추출 + 업로드
 * - 페이지가 POLICY만 넘기면 여기서 validate 수행
 * - 반환: 서버 응답 JSON({ id, filename, size, mime, ext, ... })
 */
export async function uploadModelWithAutoMeta(
  $api,
  { file, displayName, policy = DEFAULT_POLICY } = {}
) {
  const { ext } = validateByPolicy(file, policy);
  const clientMeta = await extract3DMetadata(file);
  const fd = buildModelFormData({ file, displayName, ext, clientMeta });

  return await $api.post("/uploads/raw", fd);
}

/**
 * 메타를 이미 가진 경우의 업로드
 * - 여전히 POLICY로 validate 수행
 */
export async function uploadModelWithGivenMeta(
  $api,
  { file, displayName, clientMeta, policy = DEFAULT_POLICY } = {}
) {
  const { ext } = validateByPolicy(file, policy);
  const fd = buildModelFormData({ file, displayName, ext, clientMeta });

  return await $api.post("/uploads/raw", fd);
}

/** 단계별로만 쓰고 싶을 때 */
export async function extractOnly(file) {
  return await extract3DMetadata(file);
}

export async function uploadOnly(
  $api,
  { file, displayName, ext, clientMeta, policy = DEFAULT_POLICY }
) {
  // 업로드 전에도 POLICY 검증은 동일 적용
  validateByPolicy(file, policy);
  const fd = buildModelFormData({ file, displayName, ext, clientMeta });

  return await $api.post("/uploads/raw", fd);
}
