<template>
  <v-container class="py-6" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="pa-6">
          <div class="text-subtitle-1 mb-3">3D 모델 업로드 (.glb, .gltf, .stl)</div>

          <!-- 파일 선택 -->
          <input ref="fileInput" type="file" accept=".glb,.gltf,.stl,model/*" @change="onPick" />

          <!-- 액션 버튼 -->
          <div class="mt-4 d-flex">
            <v-btn color="primary" :loading="state.loading" :disabled="!state.file || state.loading" @click="onUpload">
              업로드
            </v-btn>
            <v-btn class="ml-2" text :disabled="state.loading" @click="onReset">
              초기화
            </v-btn>
          </div>

          <!-- 메시지 -->
          <v-alert v-if="state.error" type="error" dense outlined class="mt-4">
            {{ state.error }}
          </v-alert>

          <v-alert v-if="state.done" type="success" dense outlined class="mt-4">
            업로드 완료 — {{ state.meta?.fileName }}
            ({{ (state.meta?.sizeBytes / 1024 / 1024).toFixed(2) }} MB)
          </v-alert>

          <!-- 업로드 요약(옵션) -->
          <div v-if="state.meta" class="grey--text text--darken-1 mt-2">
            확장자: {{ state.meta.extension }}
            <template v-if="state.meta.version">
              / 버전: {{ state.meta.version }}
            </template>
          </div>

          <!-- ===================== -->
          <!-- 메타데이터 파일 업로드 -->
          <!-- ===================== -->
          <v-divider class="my-6" />

          <div class="text-subtitle-2 mb-2">
            사용자 지정 메타데이터 파일 (txt, json)
          </div>

          <v-alert v-if="meta.error" type="error" dense outlined class="mb-2">
            {{ meta.error }}
          </v-alert>

          <input ref="metaInput" type="file" accept=".txt,.json" @change="onMetaPick" />

          <!-- ===================== -->
          <!-- 카테고리 선택 영역   -->
          <!-- ===================== -->
          <v-divider class="my-6" />

          <div class="text-subtitle-2 mb-2">
            카테고리 선택
          </div>

          <v-card outlined class="pa-3">
            <!-- 선택된 카테고리 표시 -->
            <div v-if="selectedCategory" class="mb-2">
              <strong>선택된 카테고리:</strong>
              {{ selectedCategory.name }}
              <template v-if="selectedCategory.code">
                <small class="grey--text">
                  ({{ selectedCategory.code }})
                </small>
              </template>
            </div>

            <div style="max-height: 260px; overflow: auto;">
              <v-alert v-if="categoryTree.error" type="error" dense outlined class="mb-2">
                {{ categoryTree.error }}
              </v-alert>

              <v-treeview v-else :items="categoryTree.items" :open.sync="categoryTree.open"
                :active.sync="categoryTree.active" item-key="_id" item-children="children" activatable open-on-click
                dense transition @update:active="onCategoryActiveChange">
                <template #label="{ item }">
                  <span>
                    {{ item.name }}
                    <template v-if="item.depth > 0 && item.code">
                      <small class="grey--text"> ({{ item.code }})</small>
                    </template>
                  </span>
                </template>
              </v-treeview>
            </div>
          </v-card>

          <!-- ===================== -->
          <!-- 필터 선택 영역        -->
          <!-- ===================== -->
          <v-divider class="my-6" />

          <div class="text-subtitle-2 mb-2">
            필터 선택
          </div>

          <v-alert v-if="filtersUi.error" type="error" dense outlined class="mb-2">
            {{ filtersUi.error }}
          </v-alert>

          <v-row>
            <v-col v-for="root in filtersUi.roots" :key="root.code" cols="12" sm="6">
              <v-select :label="root.name" :items="getFilterItems(root)" item-text="text" item-value="value"
                :value="filtersUi.values[root.code] || null" @change="onFilterChange(root, $event)" outlined dense
                :menu-props="{ offsetY: true, nudgeBottom: 8 }" />
            </v-col>
          </v-row>

          <!-- ===================== -->
          <!-- 테스트 버튼           -->
          <!-- ===================== -->
          <div class="mt-4">
            <v-btn color="secondary" @click="mergeMetaData">
              테스트
            </v-btn>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { upload3DModel, DEFAULT_POLICY } from '@/utils/assets/uploadFile'
import {
  buildCategoryTree,
  buildFilterRoots,
  findTreeNodeById
} from '@/utils/commonCodes/commonCodeTree'
import { getExt, mergeUserMeta } from '@/utils/assets/getMetaData'

// ✅ 이 페이지의 POLICY (페이지마다 다르게 정의 가능)
const POLICY = { ...DEFAULT_POLICY }

export default {
  data() {
    return {
      // 업로드 상태
      state: {
        file: null,
        meta: null,
        loading: false,
        done: false,
        error: ''
      },

      // /api/v1/commonCode 응답 원본
      commonCode: {
        filters: [],
        categories: []
      },

      // 카테고리 트리 상태
      categoryTree: {
        items: [],
        open: [],
        active: [],
        error: ''
      },

      // 선택된 카테고리 노드
      selectedCategory: null,

      // 필터 UI 상태
      filtersUi: {
        roots: [],
        values: {},
        error: ''
      },

      // 메타데이터 파일 상태 (json 전용)
      meta: {
        file: null,
        error: ''
      }
    }
  },

  async mounted() {
    await this.loadCommonCodes()
  },

  methods: {
    /**
     * @function loadCommonCodes
     * @description 공통코드(filters, categories)를 조회하고 카테고리 트리/필터 셀렉트 상태를 초기화한다.
     */
    async loadCommonCodes() {
      this.categoryTree.error = ''
      this.filtersUi.error = ''

      const ok = await this.$err.guard(
        async () => {
          const list = await this.$api.get('/commoncode')
          this.commonCode = list.data || { filters: [], categories: [] }

          this.setupCategoryTree()
          this.setupFilterSelects()

          return true
        },
        { context: { where: 'UploadPage.loadCommonCodes' } }
      )

      if (!ok) {
        this.categoryTree.error = '공통코드를 불러오지 못했습니다.'
        this.filtersUi.error = '공통코드를 불러오지 못했습니다.'
      }
    },

    /**
     * @function setupCategoryTree
     * @description 카테고리 평면 데이터를 트리 구조로 변환해 v-treeview에 바인딩한다.
     */
    setupCategoryTree() {
      const rows = Array.isArray(this.commonCode.categories)
        ? this.commonCode.categories
        : []

      this.categoryTree.items = buildCategoryTree(rows)
      this.categoryTree.open = []
      this.categoryTree.active = []
      this.selectedCategory = null
    },

    /**
     * @function setupFilterSelects
     * @description 필터 평면 데이터를 트리로 변환 후,
     *              루트 개수만큼 셀렉트 박스를 만들고
     *              각 셀렉트의 옵션 목록을 구성한다.
     */
    setupFilterSelects() {
      const rows = Array.isArray(this.commonCode.filters)
        ? this.commonCode.filters
        : []

      this.filtersUi.roots = buildFilterRoots(rows)
      this.filtersUi.values = {} // 초기 선택값: 모두 null
    },

    /**
     * @function getFilterItems
     * @description v-select에 사용할 아이템 배열을 생성한다.
     *              첫 번째 아이템은 항상 '선택'(값: null) 이다.
     * @param {Object} root - 필터 루트 정보
     * @returns {Array<{text: string, value: string|null}>}
     */
    getFilterItems(root) {
      const options = Array.isArray(root.options) ? root.options : []

      const items = options.map((opt) => ({
        text: opt.name ? `${opt.name}` : opt.code,
        value: opt.code
      }))

      return [{ text: '선택', value: null }, ...items]
    },

    /**
     * @function onCategoryActiveChange
     * @description 카테고리 트리에서 활성 노드 변경 시 호출.
     *              첫 번째 활성 노드를 찾아 선택 상태로 저장한다.
     * @param {Array<string>} activeIds - 활성 노드의 id 배열
     */
    onCategoryActiveChange(activeIds) {
      if (!Array.isArray(activeIds) || activeIds.length === 0) {
        this.selectedCategory = null
        return
      }

      const id = activeIds[0]
      const node = findTreeNodeById(this.categoryTree.items, id)

      this.selectedCategory = node || null
    },

    /**
     * @function onFilterChange
     * @description 특정 필터 셀렉트 값 변경 시 호출.
     *              값이 null이면 '선택' 상태, 아니면 코드만 저장한다.
     * @param {Object} root - 필터 루트 정보
     * @param {string|null} value - 선택된 코드값 또는 null
     */
    onFilterChange(root, value) {
      this.$set(this.filtersUi.values, root.code, value || null)
    },

    /**
     * @function findFilterNodeInRoot
     * @description 주어진 필터 루트에서 코드값으로 하위 노드를 찾는다.
     * @param {Object} root - 필터 루트 정보
     * @param {string} code - 찾을 노드 code
     * @returns {Object|null} 찾은 노드 또는 null
     */
    findFilterNodeInRoot(root, code) {
      if (!root || !Array.isArray(root.options)) return null
      return root.options.find((opt) => opt.code === code) || null
    },

    /**
         * @function onMetaPick
         * @description 메타데이터 파일 선택 시 상태를 갱신하고 확장자를 검증한다.
         *              - json 파일만 허용한다.
         * @param {Event} e - input change 이벤트
         */
    onMetaPick(e) {
      this.meta.error = ''
      const f = e.target.files && e.target.files[0]
      if (!f) {
        this.meta.file = null
        return
      }

      const ext = getExt(f.name)
      if (ext !== 'json') {
        this.meta.file = null
        this.meta.error = 'json 파일만 선택할 수 있습니다.'
        return
      }

      this.meta.file = f
    },

    /**
     * @function mergeMetaData
     * @description 현재 선택된 카테고리 및 필터값을 검증하고,
     *              모두 선택된 경우 mergeUserMeta를 호출해 mergeObj를 만들어
     *              콘솔에 출력한다.
     */
    async mergeMetaData() {
      this.filtersUi.error = ''

      const category = this.selectedCategory
      const missingFilterRoots = this.filtersUi.roots.filter(
        root => !this.filtersUi.values[root.code]
      )

      if (!category || missingFilterRoots.length > 0) {
        this.filtersUi.error =
          '카테고리와 모든 필터를 선택한 후 테스트 버튼을 눌러주세요.'
        return
      }

      // 필터 선택 결과 구성(디버그용)
      const filterSelections = this.filtersUi.roots.map((root) => {
        const value = this.filtersUi.values[root.code]
        const node = this.findFilterNodeInRoot(root, value)

        return {
          groupCode: root.code,
          groupName: root.name,
          value,
          node
        }
      })

      // eslint-disable-next-line no-console
      console.log('[TEST] category:', category)
      // eslint-disable-next-line no-console
      console.log('[TEST] filters:', filterSelections)

      // 커밋용 mergeObj 생성에 사용할 필터 코드 배열
      const filterCodes = filterSelections.map(fs => fs.value || '')

      // 🔥 유틸 함수로 분리된 mergeUserMeta 호출
      const mergedObj = await mergeUserMeta(this.meta.file, {
        categoryCode: category.code || '',
        filterCodes
      })

      // ✅ 최종 병합 결과 JSON 출력
      // (향후 업로드 커밋 시 body에 그대로 실어 보내면 됨)
      // eslint-disable-next-line no-console
      // console.log(
      //   '[TEST] merged userData meta JSON:',
      //   JSON.stringify(mergedObj, null, 2)
      // )

      return mergedObj;
    },

    /**
     * @function onPick
     * @description 파일 선택 시 상태 초기화 및 선택 파일 보관
     * @param {Event} e - input change 이벤트
     */
    onPick(e) {
      this.state.error = ''
      this.state.done = false
      const f = e.target.files && e.target.files[0]
      this.state.file = f || null
    },

    /**
     * @function onUpload
     * @description 업로드 버튼 클릭 시 presign → PUT 업로드 실행
     *              (향후 커밋 요청 시 mergeUserMeta 결과를 body에 함께 실어 보낼 수 있다)
     */
    async onUpload() {
      if (!this.state.file || this.state.loading) return
      this.state.error = ''
      this.state.done = false
      this.state.meta = null
      this.state.loading = true

      const ok = await this.$err.guard(
        async () => {
          // TODO: 커밋 시점에 mergeUserMeta 결과를 body에 포함시키고 싶다면,
          // 아래와 같이 category/filter 선택 상태를 이용해 mergeObj를 만들 수 있다.
          //
          // const category = this.selectedCategory
          // const filterSelections = this.filtersUi.roots.map((root) => {
          //   const value = this.filtersUi.values[root.code]
          //   return { value }
          // })
          // const filterCodes = filterSelections.map(fs => fs.value || '')
          // const mergeObj = await mergeUserMeta(this.meta.file, {
          //   categoryCode: category?.code || '',
          //   filterCodes
          // })
          //
          // 그런 다음 upload3DModel 호출 시 body 또는 meta로 전달:
          // const { meta } = await upload3DModel({
          //   file: this.state.file,
          //   api: this.$api,
          //   policy: POLICY,
          //   userMeta: mergeObj
          // })

          const userMeta = await this.mergeMetaData();

          console.log(userMeta)
          console.log("===========================")

          const { meta } = await upload3DModel({
            file: this.state.file,
            api: this.$api,
            policy: POLICY,
            userMeta: userMeta
          })
          this.state.meta = meta
          this.state.done = true

          return true
        },
        { context: { where: 'UploadPage.onUpload' } }
      )

      if (!ok) {
        this.state.error = '업로드 중 오류가 발생했습니다.'
      }

      this.state.loading = false
    },

    /**
     * @function onReset
     * @description 화면 상태 초기화
     */
    onReset() {
      this.state.file = null
      this.state.meta = null
      this.state.error = ''
      this.state.done = false

      // 카테고리/필터 선택 초기화
      this.categoryTree.active = []
      this.selectedCategory = null
      this.filtersUi.values = {}
      this.filtersUi.error = ''

      // 메타데이터 파일 초기화
      this.meta.file = null
      this.meta.error = ''
      if (this.$refs.metaInput) this.$refs.metaInput.value = ''

      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
    }
  }
}
</script>