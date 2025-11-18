<template>
    <v-card outlined class="tw-w-full">
        <v-card-title class="tw-text-xs tw-font-semibold tw-py-2">
            에셋 네비게이션
        </v-card-title>

        <v-divider />

        <v-card-text class="tw-py-3 tw-space-y-4">
            <!-- ===================== -->
            <!-- 카테고리 트리          -->
            <!-- ===================== -->
            <section>
                <div class="tw-text-xs tw-font-medium tw-mb-1.5">
                    카테고리
                </div>

                <!-- 선택된 카테고리 표시 -->
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

                <div v-else style="max-height: 260px; overflow: auto;">
                    <v-treeview :items="categoryTree.items" :open.sync="categoryTree.open"
                        :active.sync="categoryTree.active" item-key="_id" item-children="children" activatable
                        open-on-click dense transition @update:active="onCategoryActiveChange">
                        <template #label="{ item }">
                            <span>
                                {{ item.name }}
                                <template v-if="item.depth > 0 && item.code">
                                    <small class="grey--text">
                                        ({{ item.code }})
                                    </small>
                                </template>
                            </span>
                        </template>
                    </v-treeview>
                </div>
            </section>

            <!-- ===================== -->
            <!-- 필터 셀렉트 박스들     -->
            <!-- ===================== -->
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
            }
        }
    },

    async mounted() {
        await this.loadCommonCodes()
    },

    methods: {
        /**
         * @function loadCommonCodes
         * @description 공통코드(filters, categories)를 조회하고
         *              카테고리 트리/필터 셀렉트 상태를 초기화한다.
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
         * @description 필터 평면 데이터를 필터 루트 목록으로 변환한다.
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
         * @description 공통 유틸(buildFilterSelectItems)을 사용해 v-select 아이템 배열을 반환한다.
         * @param {Object} root - 필터 루트 정보
         */
        getFilterItems(root) {
            return buildFilterSelectItems(root)
        },

        /**
         * @function onCategoryActiveChange
         * @description 카테고리 트리에서 활성 노드 변경 시 호출.
         * @param {Array<string>} activeIds - 활성 노드의 _id 배열
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
         * @param {Object} root - 필터 루트 정보
         * @param {string|null} value - 선택된 코드값 또는 null
         */
        onFilterChange(root, value) {
            this.$set(this.filtersUi.values, root.code, value || null)
        }
    }
}
</script>
