<template>
    <v-card outlined class="tw-w-full">
        <v-card-title class="tw-text-xs tw-font-semibold tw-py-2">
            에셋 네비게이션
        </v-card-title>

        <v-divider />

        <v-card-text class="tw-py-3 tw-space-y-4">

            <!-- 카테고리 -->
            <section>
                <div class="tw-text-xs tw-font-medium tw-mb-1.5">
                    카테고리
                </div>
                <div v-if="selectedCategory" class="tw-text-xs tw-mb-1">
                    <strong>선택:</strong>
                    {{ selectedCategory.name }}
                    <template v-if="selectedCategory.code">
                        <span class="tw-text-gray-500">
                            ({{ selectedCategory.code }})
                        </span>
                    </template>
                </div>

                <v-alert v-if="categoryTree.error" type="error" dense outlined class="mb-2">
                    {{ categoryTree.error }}
                </v-alert>

                <div v-else style="max-height: 500px; overflow: auto;">
                    <v-treeview :items="categoryTree.items" :open.sync="categoryTree.open"
                        :active.sync="categoryTree.active" item-key="_id" item-children="children" activatable
                        open-on-click dense transition @update:active="onCategoryActiveChange">
                        <template #label="{ item }">
                            <span>{{ item.name }}
                            </span>
                        </template>
                    </v-treeview>
                </div>
            </section>

            <!-- 필터 -->
            <section>
                <div class="tw-text-xs tw-font-medium tw-mb-1.5">
                    필터
                </div>

                <v-alert v-if="filtersUi.error" type="error" dense outlined class="mb-2">
                    {{ filtersUi.error }}
                </v-alert>

                <v-row dense>
                    <v-col v-for="root in filtersUi.roots" :key="root.code" cols="12">
                        <v-select :label="root.name" :items="getFilterItems(root)" item-text="text" item-value="value"
                            :value="filtersUi.values[root.code] || null" @change="onFilterChange(root, $event)" outlined
                            dense :menu-props="{ offsetY: true, nudgeBottom: 8 }" />
                    </v-col>
                </v-row>
            </section>
        </v-card-text>
    </v-card>
</template>

<script>
import {
    buildCategoryTree,
    buildFilterRoots,
    findTreeNodeById,
    buildFilterSelectItems
} from '@/utils/commonCodes/commonCodeTree'

export default {
    name: 'NavBar',

    data() {
        return {
            commonCode: {
                filters: [],
                categories: []
            },
            categoryTree: {
                items: [],
                open: [],
                active: [],
                error: ''
            },
            selectedCategory: null,
            filtersUi: {
                roots: [],
                values: {},
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
         * @description 공통코드(filters, categories)를 조회 후 트리/필터 상태 초기화
         */
        async loadCommonCodes() {
            this.categoryTree.error = ''
            this.filtersUi.error = ''

            const ok = await this.$err.guard(
                async () => {
                    const res = await this.$api.get('/commoncode')
                    this.commonCode = res.data || { filters: [], categories: [] }

                    this.setupCategoryTree()
                    this.setupFilterSelects()

                    return true
                },
                { context: { where: 'NavBar.loadCommonCodes' } }
            )

            if (!ok) {
                this.categoryTree.error = '공통코드를 불러오지 못했습니다.'
                this.filtersUi.error = '공통코드를 불러오지 못했습니다.'
            }
        },

        /**
         * @function setupCategoryTree
         * @description 카테고리 평면 데이터를 트리뷰용 구조로 변환
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
         * @description 필터 평면 데이터를 필터 루트 목록으로 변환
         */
        setupFilterSelects() {
            const rows = Array.isArray(this.commonCode.filters)
                ? this.commonCode.filters
                : []

            this.filtersUi.roots = buildFilterRoots(rows)
            this.filtersUi.values = {}
        },

        /**
         * @function getFilterItems
         * @description 공통 유틸을 사용해 v-select 아이템 리스트 생성
         */
        getFilterItems(root) {
            return buildFilterSelectItems(root)
        },

        /**
         * @function onCategoryActiveChange
         * @description 카테고리 트리 선택 변경 시 선택 노드 갱신 + 검색 쿼리 업데이트
         * @param {Array<string>} activeIds - 활성 노드 _id 배열
         */
        onCategoryActiveChange(activeIds) {
            if (!Array.isArray(activeIds) || activeIds.length === 0) {
                this.selectedCategory = null
                this.updateAssetSearchQuery()
                return
            }

            const id = activeIds[0]
            const node = findTreeNodeById(this.categoryTree.items, id)

            this.selectedCategory = node || null
            this.updateAssetSearchQuery()
        },

        /**
         * @function onFilterChange
         * @description 필터 셀렉트 값 변경 시 선택값 갱신 + 검색 쿼리 업데이트
         * @param {Object} root - 필터 루트 정보
         * @param {string|null} value - 선택된 코드값 또는 null
         */
        onFilterChange(root, value) {
            this.$set(this.filtersUi.values, root.code, value || null)
            this.updateAssetSearchQuery()
        },

        /**
         * @function updateAssetSearchQuery
         * @description
         *  현재 선택된 카테고리/필터 값을 기준으로
         *  라우터 쿼리(category, filters)를 갱신한다.
         *  - 메인페이지 index.vue 에서 이 쿼리를 감지해 /assets/search 를 다시 호출한다.
         */
        updateAssetSearchQuery() {
            // 카테고리 코드 (없으면 빈 문자열)
            const categoryCode = this.selectedCategory?.code || ''

            // 선택된 필터 코드들만 추출 후 ',' 로 join
            const selectedFilterCodes = Object.values(this.filtersUi.values)
                .filter(Boolean) // null / '' 제거
            const filtersStr = selectedFilterCodes.join(',')

            const currentQuery = this.$route.query || {}

            this.$router.push({
                path: '/',
                query: {
                    // 기존 쿼리는 유지하되, category/filters/page만 덮어쓴다.
                    ...currentQuery,
                    category: categoryCode,
                    filters: filtersStr,
                    page: 1 // 필터/카테고리 바뀌면 항상 1페이지부터
                }
            })
        }
    }
}
</script>
