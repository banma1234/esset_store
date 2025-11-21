<template>
    <!-- meta.asset 이 있을 때만 카드 렌더링 -->
    <v-card v-if="asset" outlined class="tw-w-full tw-px-4 tw-py-3 tw-bg-[#111111] tw-text-gray-100">
        <!-- ======================= -->
        <!-- 1. 기본 메타 정보       -->
        <!-- ======================= -->
        <div class="tw-text-sm tw-space-y-1">
            <div>
                <span class="tw-font-semibold">파일명:</span>
                <span class="tw-ml-2">{{ asset.fileName }}</span>
            </div>

            <div>
                <span class="tw-font-semibold">버전:</span>
                <span class="tw-ml-2">
                    {{ asset.latestVersion?.version || '-' }}
                </span>
            </div>

            <div>
                <span class="tw-font-semibold">파일 타입:</span>
                <span class="tw-ml-2">
                    {{ (asset.fileType || '').toUpperCase() }}
                </span>
            </div>

            <div>
                <span class="tw-font-semibold">파일 크기:</span>
                <span class="tw-ml-2">
                    {{ formatSizeMB(asset.sizeBytes) }}
                </span>
            </div>
        </div>

        <!-- 🔹 구분선 1: 기본 메타 / 카테고리+필터 -->
        <v-divider class="tw-my-4 tw-border-gray-700" />

        <!-- ======================= -->
        <!-- 2. 카테고리              -->
        <!-- ======================= -->
        <div>
            <div class="tw-font-semibold tw-text-sm">카테고리</div>
            <div class="tw-mt-1 tw-text-sm">
                <template v-if="categoryText">
                    {{ categoryText }}
                </template>
                <template v-else>
                    <span class="tw-text-gray-400">-</span>
                </template>
            </div>
        </div>

        <v-divider class="tw-my-4 tw-border-gray-700" />

        <!-- ======================= -->
        <!--    필터 (chips)         -->
        <!-- ======================= -->
        <div class="tw-mt-4">
            <div class="tw-font-semibold tw-text-sm">필터</div>
            <div class="tw-mt-1">
                <template v-if="filterItems.length">
                    <v-chip-group column>
                        <v-chip v-for="f in filterItems" :key="f.code" small outlined class="tw-mr-1 tw-mb-1">
                            {{ f.label }}
                        </v-chip>
                    </v-chip-group>
                </template>
                <template v-else>
                    <span class="tw-text-sm tw-text-gray-400">-</span>
                </template>
            </div>
        </div>

        <!-- 🔹 구분선 2: 카테고리+필터 / counts+buffers -->
        <v-divider v-if="hasCounts || hasBuffers" class="tw-my-4 tw-border-gray-700" />

        <!-- ======================= -->
        <!-- 3. counts / buffers     -->
        <!-- ======================= -->
        <div v-if="hasCounts || hasBuffers">
            <v-expansion-panels flat accordion>
                <!-- counts 드롭다운 -->
                <v-expansion-panel v-if="hasCounts">
                    <v-expansion-panel-header class="tw-text-xs tw-font-medium">
                        지오메트리 통계
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-list dense>
                            <v-list-item v-for="(value, key) in counts" :key="`counts-${key}`">
                                <v-list-item-content>
                                    <v-list-item-title class="tw-text-xs">
                                        <span class="tw-font-medium">{{ key }}</span>:
                                        <span class="tw-font-mono tw-ml-1">{{ value }}</span>
                                    </v-list-item-title>
                                </v-list-item-content>
                            </v-list-item>
                        </v-list>
                    </v-expansion-panel-content>
                </v-expansion-panel>

                <!-- buffers 드롭다운 -->
                <v-expansion-panel v-if="hasBuffers">
                    <v-expansion-panel-header class="tw-text-xs tw-font-medium">
                        버퍼 정보
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-list dense>
                            <v-list-item v-for="(value, key) in buffers" :key="`buffers-${key}`">
                                <v-list-item-content>
                                    <v-list-item-title class="tw-text-xs">
                                        <span class="tw-font-medium">{{ key }}</span>:
                                        <span class="tw-font-mono tw-ml-1">{{ value }}</span>
                                    </v-list-item-title>
                                </v-list-item-content>
                            </v-list-item>
                        </v-list>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </v-expansion-panels>
        </div>
    </v-card>
</template>

<script>
export default {
    name: 'AssetMetaCard',

    props: {
        meta: {
            type: Object,
            default: null
        }
    },

    computed: {
        asset() {
            return this.meta && this.meta.asset ? this.meta.asset : null
        },

        categoryText() {
            if (!this.meta || !Array.isArray(this.meta.categoryBreadcrumbItems)) {
                return ''
            }
            const items = this.meta.categoryBreadcrumbItems
            if (!items.length) return ''
            return items.map(i => i.text).join(' > ')
        },

        filterItems() {
            return this.meta && Array.isArray(this.meta.filterTreeDisplayList)
                ? this.meta.filterTreeDisplayList
                : []
        },

        counts() {
            const a = this.asset
            const raw = a && a.counts
            return raw && typeof raw === 'object' ? raw : {}
        },

        buffers() {
            const a = this.asset
            const raw = a && a.buffers
            return raw && typeof raw === 'object' ? raw : {}
        },

        hasCounts() {
            return Object.keys(this.counts).length > 0
        },

        hasBuffers() {
            return Object.keys(this.buffers).length > 0
        }
    },

    methods: {
        /**
         * @function formatSizeMB
         * @description 바이트 크기를 X.XX MB 문자열로 변환한다.
         * @param {number} bytes - 파일 크기(바이트)
         * @returns {string}
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
