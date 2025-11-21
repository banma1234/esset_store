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

      <!-- 뷰어 + 바텀 네비 영역 -->
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

        <!-- 하단: 다운로드 / 공유 Bottom Navigation -->
        <v-bottom-navigation grow height="56" class="tw-border-t tw-border-gray-200 tw-bg-white">
          <v-btn :disabled="!canDownload" @click="onClickDownload">
            <v-icon large>mdi-download</v-icon>
            <span>download</span>
          </v-btn>

          <v-btn :disabled="!canShare" @click="onClickShare">
            <v-icon large>mdi-share-variant</v-icon>
            <span>share</span>
          </v-btn>

          <!-- <v-btn>
            <v-icon large>mdi-trash-can</v-icon>
            <span>delete</span>
          </v-btn> -->
        </v-bottom-navigation>
      </main>
    </div>
  </client-only>
</template>

<script>
import ModelViewer from '~/components/3Dviewer.vue'

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
       * @property {Object.<string, {code:string,name:string,parentCode:string|null}>} state.commonCodes
       */
      state: {
        loading: false,
        error: '',
        asset: null,
        modelUrl: '',
        commonCodes: {}
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

    /** 다운로드 / 공유 가능 여부 */
    canDownload() {
      return !!(this.state.asset && this.state.asset._id && this.state.asset.fileName)
    },
    canShare() {
      return !!this.state.modelUrl || !!this.fileName
    },

    /**
     * @computed categoryBreadcrumbItems
     * @description 카테고리를 '부모 > 자식' 형태로 v-breadcrumbs용 아이템으로 반환한다.
     * @returns {Array<{text:string,disabled:boolean}>}
     */
    categoryBreadcrumbItems() {
      const asset = this.state.asset
      if (!asset || !asset.category) return []

      const code = asset.category
      const meta = this.state.commonCodes[code]
      if (!meta) return []

      const items = []
      // 부모
      if (meta.parentCode && this.state.commonCodes[meta.parentCode]) {
        const parentMeta = this.state.commonCodes[meta.parentCode]
        items.push({ text: parentMeta.name || parentMeta.code, disabled: true })
      }
      // 자식(자기 자신)
      items.push({ text: meta.name || meta.code, disabled: true })

      return items
    },

    /**
     * @computed filterTreeDisplayList
     * @description 필터를 '부모 : 자식' 형태의 라벨로 변환한다.
     * @returns {Array<{code:string,label:string}>}
     */
    filterTreeDisplayList() {
      const asset = this.state.asset
      const codes = Array.isArray(asset?.filters) ? asset.filters : []

      return codes.map((code) => {
        const meta = this.state.commonCodes[code]
        if (!meta) return { code, label: code }

        const parentMeta = meta.parentCode
          ? this.state.commonCodes[meta.parentCode]
          : null

        const parentName =
          (parentMeta && parentMeta.name) ||
          parentMeta?.code ||
          meta.parentCode ||
          ''

        const childName = meta.name || meta.code || code
        const label = parentName ? `${parentName} : ${childName}` : childName

        return { code, label }
      })
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

  beforeDestroy() {
    // 페이지를 떠날 때 메타 정보 초기화
    this.emitMetaToLayout(null)
  },

  methods: {
    /**
     * @function fetchAsset
     * @description fileName으로 에셋 검색 API 호출.
     */
    async fetchAsset() {
      const fileName = this.fileName

      if (!fileName) {
        this.state.error = '유효하지 않은 파일 이름입니다.'
        this.state.asset = null
        this.state.modelUrl = ''
        this.state.commonCodes = {}
        this.emitMetaToLayout(null)
        return
      }

      this.state.loading = true
      this.state.error = ''
      this.state.asset = null
      this.state.modelUrl = ''
      this.state.commonCodes = {}
      this.emitMetaToLayout(null)

      const ok = await this.$err.guard(
        async () => {
          const { data } = await this.$api.get('/assets', {
            query: { filename: fileName }
          })

          this.state.asset = data
          this.state.modelUrl = data.latestVersion.url

          await this.loadCommonCodesForAsset(data)

          return true
        },
        { context: { where: 'AssetViewerByFileName.fetchAsset', fileName } }
      )

      if (!ok && !this.state.error) {
        this.state.error = '모델 정보를 불러오지 못했습니다.'
        this.emitMetaToLayout(null)
      }

      this.state.loading = false
    },

    /**
     * @function loadCommonCodesForAsset
     * @description 에셋에 사용된 카테고리/필터 코드 및 그 부모 코드를 조회해 트리화 메타를 구성한다.
     * @param {Object} asset - 에셋 데이터
     * @returns {Promise<void>}
     */
    async loadCommonCodesForAsset(asset) {
      if (!asset) {
        this.state.commonCodes = {}
        this.emitMetaToLayout(null)
        return
      }

      const codes = []
      if (asset.category) codes.push(asset.category)
      if (Array.isArray(asset.filters)) {
        asset.filters.forEach((c) => c && codes.push(c))
      }

      const uniqueCodes = Array.from(new Set(codes))
      if (!uniqueCodes.length) {
        this.state.commonCodes = {}
        this.emitMetaToLayout({
          asset: this.state.asset,
          categoryBreadcrumbItems: [],
          filterTreeDisplayList: []
        })
        return
      }

      const fetchOne = async (code) => {
        try {
          const res = await this.$api.get('/commoncode', { query: { code } })
          return res && res.data ? res.data : null
        } catch (e) {
          return null
        }
      }

      const loadedMap = {}

      // 1차: 직접 사용된 코드들 조회
      const docs = await Promise.all(uniqueCodes.map(fetchOne))
      const parentCodes = new Set()

      docs.forEach((doc) => {
        if (!doc || !doc.code) return
        loadedMap[doc.code] = {
          code: doc.code,
          name: doc.name || doc.code,
          parentCode: doc.parentCode || null
        }
        if (doc.parentCode) {
          parentCodes.add(doc.parentCode)
        }
      })

      // 2차: 부모 코드들 중 아직 없는 것 조회
      const missingParents = Array.from(parentCodes).filter(
        (pc) => !loadedMap[pc]
      )
      if (missingParents.length) {
        const parentDocs = await Promise.all(missingParents.map(fetchOne))
        parentDocs.forEach((doc) => {
          if (!doc || !doc.code) return
          loadedMap[doc.code] = {
            code: doc.code,
            name: doc.name || doc.code,
            parentCode: doc.parentCode || null
          }
        })
      }

      this.state.commonCodes = loadedMap

      // 🔹 공통코드까지 로드가 끝난 뒤, 레이아웃으로 메타 정보 전달
      this.emitMetaToLayout({
        asset: this.state.asset,
        categoryBreadcrumbItems: this.categoryBreadcrumbItems,
        filterTreeDisplayList: this.filterTreeDisplayList
      })
    },

    /**
     * @function emitMetaToLayout
     * @description 레이아웃(DefaultLayout)으로 메타 정보를 전달한다.
     * @param {Object|null} payload - 메타 정보 또는 null(초기화)
     */
    emitMetaToLayout(payload) {
      if (!process.client) return
      this.$root.$emit('viewer:meta', payload)
    },

    /**
     * @function onClickDownload
     * @description 현재 에셋 다운로드.
     */
    async onClickDownload() {
      const asset = this.state.asset
      if (!asset || !asset._id) {
        this.state.error = '다운로드할 모델 정보가 없습니다.'
        return
      }

      await this.$err.guard(
        async () => {
          const { url } = await this.$api.get('/assets/download', {
            query: {
              assetid: asset._id,
              filename: encodeURIComponent(asset.fileName),
              version: asset.latestVersion.version
            }
          })

          window.location.href = url

          return true
        },
        { context: { where: 'AssetViewerByFileName.onClickDownload' } }
      )
    },

    /**
     * @function onClickShare
     * @description 클립보드 링크 복사.
     */
    async onClickShare() {
      const shareUrl = window.location.href

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareUrl)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = shareUrl
          textarea.style.position = 'fixed'
          textarea.style.left = '-9999px'
          document.body.appendChild(textarea)
          textarea.focus()
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }

        // eslint-disable-next-line no-alert
        alert('링크가 클립보드에 복사되었습니다.')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[share error]', e)
        // eslint-disable-next-line no-alert
        alert('링크 복사에 실패했습니다.')
      }
    }
  }
}
</script>
