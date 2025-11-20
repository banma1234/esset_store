<template>
    <v-container fluid class="py-6">
        <v-row>
            <!-- 좌측: 스냅샷 트리 -->
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-title class="py-3">
                        <div class="text-subtitle-1">에셋 스냅샷 로그</div>
                        <v-spacer />
                        <v-btn small color="primary" :loading="state.loading" @click="reload">
                            새로고침
                        </v-btn>
                    </v-card-title>
                    <v-divider />

                    <v-card-text style="height: 600px; overflow: auto;">
                        <v-alert v-if="state.error" type="error" dense outlined class="ma-2">
                            {{ state.error }}
                        </v-alert>

                        <v-treeview v-else :items="tree.items" :active.sync="tree.active" item-key="id"
                            item-children="children" activatable open-on-click dense transition
                            @update:active="onActiveChange">
                            <!-- 라벨만 커스텀 -->
                            <template #label="{ item }">
                                <!-- 루트: 파일 이름 -->
                                <div v-if="item.type === 'asset'" class="d-flex align-center">
                                    <span class="font-weight-medium">
                                        {{ item.fileName }}
                                    </span>
                                </div>

                                <!-- 버전 노드 -->
                                <div v-else-if="item.type === 'version'" class="d-flex flex-column">
                                    <div class="d-flex align-center">
                                        <span class="font-weight-medium">
                                            v{{ item.version }}
                                        </span>
                                        <span class="grey--text text--darken-1 ml-2 text-caption">
                                            {{ formatBytes(item.sizeBytes) }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                        </v-treeview>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- 우측: 상세 보기 -->
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-title class="py-3">
                        <div class="text-subtitle-1">상세 보기</div>
                        <v-spacer />
                    </v-card-title>
                    <v-divider />

                    <v-alert v-if="detail.error" type="error" dense outlined class="ma-4">
                        {{ detail.error }}
                    </v-alert>

                    <v-card-text style="height: 600px; overflow: auto;">
                        <!-- 아무 것도 선택 안 한 경우 -->
                        <div v-if="!hasActiveVersion" class="grey--text text--darken-1">
                            좌측에서 파일의 버전 노드를 선택하면 상세 정보가 여기 표시됩니다.
                        </div>

                        <!-- 상세 정보 -->
                        <div v-else>
                            <!-- 썸네일 -->
                            <div class="mb-4">
                                <v-img v-if="detail.data.thumbnail" :src="detail.data.thumbnail" height="180" contain
                                    class="grey lighten-4" />
                            </div>

                            <v-list dense>
                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            파일명
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ detail.data.fileName }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            버전
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ detail.data.version }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            파일 형식
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ detail.data.fileType }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            파일 크기
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ formatBytes(detail.data.sizeBytes) }}
                                            <span class="grey--text text--darken-1">
                                                ({{ detail.data.sizeBytes }} B)
                                            </span>
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            수정일 (updatedAt)
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ formatUpdatedAt(detail.data.updatedAt) }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            assetId
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            {{ detail.data.assetId }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            다운로드 URL
                                        </v-list-item-title>
                                        <v-list-item-subtitle>
                                            <a v-if="detail.data.url" :href="detail.data.url" target="_blank"
                                                rel="noopener noreferrer">
                                                {{ detail.data.url }}
                                            </a>
                                            <span v-else class="grey--text">없음</span>
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>
                            </v-list>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { formatDate } from '@/utils/formatDate'

/** 스냅샷 로그 API 엔드포인트(백엔드 라우트에 맞게 수정) */
export default {
    name: 'AssetSnapshotLogPage',

    data() {
        return {
            /** 전체 상태 */
            state: {
                loading: false,
                error: '',
                raw: [] // API에서 받은 data 배열
            },
            /** 트리 상태 */
            tree: {
                items: [],
                open: [],
                active: []
            },
            /** 상세 패널 상태 */
            detail: {
                error: '',
                data: {
                    assetId: '',
                    fileName: '',
                    version: '',
                    fileType: '',
                    sizeBytes: 0,
                    url: '',
                    thumbnail: '',
                    updatedAt: null
                }
            }
        }
    },

    computed: {
        /**
         * @computed hasActive
         * @description 현재 트리에서 어떤 노드든 선택되어 있는지 여부
         */
        hasActive() {
            return Array.isArray(this.tree.active) && this.tree.active.length > 0
        },

        /**
         * @computed hasActiveVersion
         * @description 상세 패널에 보여줄 버전 노드가 선택되어 있는지 여부
         */
        hasActiveVersion() {
            return !!(this.detail.data && this.detail.data.version)
        }
    },

    async mounted() {
        await this.reload()
    },

    methods: {
        /**
         * @function reload
         * @description 스냅샷 로그를 다시 불러와 트리 구조로 변환한다.
         */
        async reload() {
            this.state.loading = true
            this.state.error = ''
            this.state.raw = []
            this.tree.items = []
            this.tree.active = []
            this.detail.error = ''
            this.detail.data = {
                assetId: '',
                fileName: '',
                version: '',
                fileType: '',
                sizeBytes: 0,
                url: '',
                thumbnail: '',
                updatedAt: null
            }

            const ok = await this.$err.guard(
                async () => {
                    const res = await this.$api.get('/_debug/log/assetversions')

                    if (!res.ok || !Array.isArray(res.data)) {
                        throw new Error('유효하지 않은 스냅샷 로그 응답입니다.')
                    }

                    this.state.raw = res.data
                    this.tree.items = this.buildSnapshotTree(this.state.raw)

                    return true
                },
                { context: { where: 'AssetSnapshotLogPage.reload' } }
            )

            if (!ok) {
                this.state.error = '에셋 스냅샷 로그를 불러오지 못했습니다.'
            }

            this.state.loading = false
        },

        /**
         * @function buildSnapshotTree
         * @description 스냅샷 로그 배열을 v-treeview용 트리 데이터로 변환한다.
         *              - 루트: 파일 단위(asset)
         *              - 자식: 각 버전(files 배열의 원소)
         * @param {Array<Object>} rows - API에서 받은 data 배열
         * @returns {Array<Object>} v-treeview items
         */
        buildSnapshotTree(rows = []) {
            return rows.map((asset, assetIndex) => {
                const assetId = asset.assetId || asset._id || `asset-${assetIndex}`
                const fileName = asset.fileName || '(no name)'
                const files = Array.isArray(asset.files) ? asset.files : []

                return {
                    id: assetId,
                    type: 'asset',
                    assetId,
                    fileName,
                    children: files.map((file, i) => ({
                        id: `${assetId}:${file.version || i}`,
                        type: 'version',
                        assetId,
                        fileName,
                        version: file.version || '',
                        fileType: file.fileType || '',
                        sizeBytes: file.sizeBytes || 0,
                        url: file.url || '',
                        thumbnail: file.thumbnail || '',
                        updatedAt: file.updatedAt || null
                    }))
                }
            })
        },

        /**
         * @function findNodeById
         * @description 트리에서 id로 노드를 찾는다(BFS).
         *              공통코드 페이지의 findTreeNodeById 패턴을 재사용.
         * @param {string} id - 찾을 노드 id
         * @returns {Object|null} 찾은 노드 또는 null
         */
        findNodeById(id) {
            const queue = [...this.tree.items]
            while (queue.length) {
                const cur = queue.shift()
                if (cur.id === id) return cur
                if (cur.children && cur.children.length) {
                    queue.push(...cur.children)
                }
            }
            return null
        },

        /**
         * @function onActiveChange
         * @description 트리의 활성 노드가 변경되었을 때 호출된다.
         *              - 버전 노드(type === 'version')를 선택하면 우측 상세를 갱신한다.
         * @param {Array<string>} activeIds - 활성 노드 id 배열
         */
        onActiveChange(activeIds) {
            if (!Array.isArray(activeIds) || activeIds.length === 0) {
                this.detail.data = {
                    assetId: '',
                    fileName: '',
                    version: '',
                    fileType: '',
                    sizeBytes: 0,
                    url: '',
                    thumbnail: '',
                    updatedAt: null
                }
                return
            }

            const id = activeIds[0]
            const node = this.findNodeById(id)
            if (!node) return

            // 버전 노드만 상세에 반영
            if (node.type === 'version') {
                this.detail.data = {
                    assetId: node.assetId || '',
                    fileName: node.fileName || '',
                    version: node.version || '',
                    fileType: node.fileType || '',
                    sizeBytes: node.sizeBytes || 0,
                    url: node.url || '',
                    thumbnail: node.thumbnail || '',
                    updatedAt: node.updatedAt || null
                }
            }
        },

        /**
         * @function formatBytes
         * @description 바이트 수를 사람이 읽기 쉬운 단위(예: 1.23 MB)로 변환한다.
         * @param {number} n - 바이트 수
         * @returns {string} 포맷팅된 문자열
         */
        formatBytes(n) {
            const bytes = Number(n) || 0
            if (bytes < 1024) return `${bytes} B`
            const kb = bytes / 1024
            if (kb < 1024) return `${kb.toFixed(1)} KB`
            const mb = kb / 1024
            return `${mb.toFixed(2)} MB`
        },

        /**
         * @function formatUpdatedAt
         * @description updatedAt ISO 문자열을 공통 포맷 함수로 보기 좋게 변환한다.
         * @param {string|null} v - ISO 날짜 문자열
         * @returns {string} 포맷팅된 날짜 문자열
         */
        formatUpdatedAt(v) {
            if (!v) return ''
            return formatDate(v)
        }
    }
}
</script>
