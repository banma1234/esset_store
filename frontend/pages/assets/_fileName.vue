<template>
  <!-- WebGL은 브라우저 전용이므로 client-only -->
  <client-only>
    <div class="tw-flex tw-flex-col tw-w-full tw-bg-black">
      <!-- 상단 바 -->
      <header
        class="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-border-b tw-border-gray-800 tw-bg-[#0f0f10]">
        <div class="tw-flex tw-flex-col tw-min-w-0">
          <h1 class="tw-text-lg tw-font-bold tw-text-gray-100 tw-truncate">
            3D 모델 뷰어 — {{ fileName }}
          </h1>
          <p class="tw-mt-1 tw-text-xs tw-text-gray-400 tw-break-all">
            소스:
            <code class="tw-font-mono tw-bg-[#1a1a1b] tw-px-1.5 tw-py-0.5 tw-rounded">
              {{ state.modelUrl || '로딩 중…' }}
            </code>
          </p>
        </div>
      </header>

      <!-- 뷰어 + 메타 정보 영역 -->
      <main class="tw-w-full tw-flex tw-flex-col tw-items-stretch tw-justify-start tw-bg-black tw-p-4 tw-space-y-4">
        <!-- 뷰어 영역 -->
        <div class="tw-w-full tw-flex tw-items-center tw-justify-center">
          <!-- 에러 메시지 -->
          <v-alert v-if="state.error" type="error" dense outlined class="tw-w-full tw-max-w-xl">
            {{ state.error }}
          </v-alert>

          <!-- 로딩 인디케이터 -->
          <v-progress-circular v-else-if="state.loading || !state.modelUrl" indeterminate color="primary" size="40" />

          <!-- 모델 뷰어 -->
          <ModelViewer v-else :model-url="state.modelUrl" />
        </div>

        <!-- 메타 정보 카드 -->
        <v-card v-if="state.asset" outlined
          class="tw-w-full tw-max-w-3xl tw-mx-auto tw-px-4 tw-py-3 tw-bg-[#111111] tw-text-gray-100">
          <div class="tw-text-sm tw-space-y-1">
            <div>
              <span class="tw-font-semibold">파일명:</span>
              <span class="tw-ml-2">{{ state.asset.fileName }}</span>
            </div>

            <div>
              <span class="tw-font-semibold">버전:</span>
              <span class="tw-ml-2">
                {{ state.asset.latestVersion?.version || '-' }}
              </span>
            </div>

            <div>
              <span class="tw-font-semibold">파일 타입:</span>
              <span class="tw-ml-2">
                {{ (state.asset.fileType || '').toUpperCase() }}
              </span>
            </div>

            <div>
              <span class="tw-font-semibold">파일 크기:</span>
              <span class="tw-ml-2">
                {{ formatSizeMB(state.asset.sizeBytes) }}
              </span>
            </div>

            <div>
              <span class="tw-font-semibold">카테고리:</span>
              <span class="tw-ml-2">
                <template v-if="categoryDisplay">
                  {{ categoryDisplay.name }}
                  <span class="tw-text-gray-400">
                    ({{ categoryDisplay.code }})
                  </span>
                </template>
                <template v-else>
                  -
                </template>
              </span>
            </div>

            <div>
              <span class="tw-font-semibold">필터:</span>
              <span class="tw-ml-2">
                <template v-if="filterDisplayList.length">
                  {{filterDisplayList.map(f => f.name).join(', ')}}
                </template>
                <template v-else>
                  -
                </template>
              </span>
            </div>
          </div>
        </v-card>
      </main>
    </div>
  </client-only>
</template>

<script>
import ModelViewer from '~/components/3Dviewer.vue'

/**
 * /assets/_fileName.vue
 *
 * 요구사항:
 *  - 라우트 파라미터(fileName)으로 에셋 검색 API를 호출한다.
 *  - 응답에서 latestVersion.url 로 glTF 모델을 렌더링한다.
 *  - 뷰어 하단에 파일 메타 정보 및 카테고리/필터를 출력한다.
 *  - 카테고리/필터는 공통코드 API로 이름을 조회해 표시한다.
 */
export default {
  name: 'AssetViewerByFileName',
  components: { ModelViewer },

  data() {
    return {
      /**
       * @property {Object} state
       * @property {boolean} state.loading - 에셋 정보 로딩 여부
       * @property {string} state.error - 에러 메시지
       * @property {Object|null} state.asset - 검색된 에셋 전체 데이터
       * @property {string} state.modelUrl - glTF 모델 URL (latestVersion.url)
       * @property {Object.<string, string>} state.codeNames - 공통코드(code → name) 매핑
       */
      state: {
        loading: false,
        error: '',
        asset: null,
        modelUrl: '',
        codeNames: {}
      }
    }
  },

  computed: {
    /**
     * @function fileName
     * @description 라우트 파라미터에서 fileName을 추출한다.
     * @returns {string} 파일 이름
     */
    fileName() {
      return this.$route.params.fileName || ''
    },

    /**
     * @function categoryDisplay
     * @description 카테고리 코드와 이름을 반환한다.
     * @returns {{code: string, name: string}|null}
     */
    categoryDisplay() {
      const asset = this.state.asset
      if (!asset || !asset.category) return null
      const code = asset.category
      const name = this.state.codeNames[code] || code
      return { code, name }
    },

    /**
     * @function filterDisplayList
     * @description 필터 코드와 이름 목록을 반환한다.
     * @returns {Array<{code: string, name: string}>}
     */
    filterDisplayList() {
      const asset = this.state.asset
      const codes = Array.isArray(asset?.filters) ? asset.filters : []
      return codes.map(code => ({
        code,
        name: this.state.codeNames[code] || code
      }))
    }
  },

  async mounted() {
    if (!process.client) return
    await this.fetchAsset()
  },

  watch: {
    /**
     * @function fileName
     * @description 라우트 파라미터가 변경되면 에셋 정보를 다시 로드한다.
     */
    fileName(next, prev) {
      if (next && next !== prev) {
        this.fetchAsset()
      }
    }
  },

  methods: {
    /**
     * @function fetchAsset
     * @description
     *  - fileName 기준으로 에셋 검색 API를 호출한다.
     *  - 응답에서 해당 에셋을 찾아 latestVersion.url을 modelUrl 에 세팅한다.
     *  - 이후 카테고리/필터 코드에 대한 공통코드 이름을 조회한다.
     *
     * API: GET /api/v1/assets/search?category=&filters=&page=&filename=
     */
    async fetchAsset() {
      const fileName = this.fileName

      if (!fileName) {
        this.state.error = '유효하지 않은 파일 이름입니다.'
        this.state.asset = null
        this.state.modelUrl = ''
        this.state.codeNames = {}
        return
      }

      this.state.loading = true
      this.state.error = ''
      this.state.asset = null
      this.state.modelUrl = ''
      this.state.codeNames = {}

      const ok = await this.$err.guard(
        async () => {
          const data = await this.$api.get('/assets/search', {
            query: {
              category: '',
              filters: '',
              page: 1,
              filename: fileName
            }
          })

          const items = Array.isArray(data.items) ? data.items : []

          // fileName이 정확히 일치하는 항목 우선, 없으면 첫 번째 항목
          const asset =
            items.find(it => it.fileName === fileName) ||
            items[0] ||
            null

          if (
            !asset ||
            !asset.latestVersion ||
            !asset.latestVersion.url
          ) {
            throw new Error('모델 URL을 찾을 수 없습니다.')
          }

          this.state.asset = asset
          // 서버에서 내려준 URL을 그대로 사용
          this.state.modelUrl = asset.latestVersion.url

          // 카테고리/필터 코드 이름 로드
          await this.loadCodeNames(asset)

          return true
        },
        { context: { where: 'AssetViewerByFileName.fetchAsset', fileName } }
      )

      if (!ok && !this.state.error) {
        this.state.error = '모델 정보를 불러오지 못했습니다.'
      }

      this.state.loading = false
    },

    /**
     * @function loadCodeNames
     * @description
     *  - 에셋 내 category, filters 코드들을 수집해 공통코드 API로 이름을 조회한다.
     *  - 결과는 state.codeNames 맵(code → name)에 저장한다.
     * @param {Object} asset - 에셋 데이터
     * @returns {Promise<void>}
     */
    async loadCodeNames(asset) {
      if (!asset) {
        this.state.codeNames = {}
        return
      }

      const codes = []
      if (asset.category) codes.push(asset.category)
      if (Array.isArray(asset.filters)) {
        asset.filters.forEach(c => {
          if (c) codes.push(c)
        })
      }

      const uniqueCodes = Array.from(new Set(codes))
      if (!uniqueCodes.length) {
        this.state.codeNames = {}
        return
      }

      const ok = await this.$err.guard(
        async () => {
          const entries = await Promise.all(
            uniqueCodes.map(async (code) => {
              try {
                const res = await this.$api.get('/commoncode', {
                  query: { code }
                })
                const one = res && res.data ? res.data : null
                const name = one && one.name ? one.name : code
                return [code, name]
              } catch (e) {
                // 실패 시 코드 자체를 이름으로 사용
                return [code, code]
              }
            })
          )

          const map = {}
          entries.forEach(([code, name]) => {
            map[code] = name
          })
          this.state.codeNames = map

          return true
        },
        { context: { where: 'AssetViewerByFileName.loadCodeNames', codes: uniqueCodes } }
      )

      if (!ok && !this.state.error) {
        // 공통코드 조회 실패해도 뷰어는 동작해야 하므로
        // 여기서는 치명적 에러로 처리하지 않고, 코드만 표시되도록 둔다.
      }
    },

    /**
     * @function formatSizeMB
     * @description 바이트 크기를 "X.XX MB" 형식으로 변환한다.
     * @param {number} bytes - 파일 크기(바이트)
     * @returns {string} 포매팅된 문자열
     */
    formatSizeMB(bytes) {
      const n = Number(bytes)
      if (!Number.isFinite(n) || n < 0) return ''
      const mb = n / (1024 * 1024)
      return `${mb.toFixed(2)} MB`
    }
  }
}
</script>
