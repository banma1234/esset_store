/**
 * @typedef {Object} CommonCodeResponse
 * @property {Array} filters    - 필터용 공통코드 목록
 * @property {Array} categories - 카테고리용 공통코드 목록
 */

/**
 * @function getAllCommonCodes
 * @description /api/v1/commonCode 에서 공통코드(filters, categories)를 조회한다.
 * @param {import('axios').AxiosInstance} api - Nuxt에서 주입된 Axios 인스턴스(this.$api)
 * @returns {Promise<CommonCodeResponse>} 공통코드 응답 데이터
 */
export async function getAllCommonCodes(api) {
  return await api.get('/api/v1/commonCode')
}
