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
                                        <span class="font-weight-medium"
                                            :class="{ 'red--text text--darken-2': item.isActive === false }">
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
                        </div>

                        <!-- 상세 정보 -->
                        <div v-else>
                            <!-- 썸네일 -->
                            <div class="mb-4">
                                <v-img v-if="detail.data.thumbnail" :src="detail.data.thumbnail" height="180" contain
                                    class="grey lighten-4" />
                            </div>

                            <!-- 🔹 아주 컴팩트한 counts / buffers 토글 -->
                            <div v-if="hasCounts || hasBuffers" class="mt-1">
                                <!-- counts 섹션 -->
                                <div v-if="hasCounts" class="mb-2">
                                    <div class="d-flex align-center mb-1">
                                        <span class="tw-text-xs tw-font-medium">
                                            지오메트리 통계 (counts)
                                        </span>
                                        <v-spacer />
                                        <v-btn icon x-small @click="ui.showCounts = !ui.showCounts">
                                            <v-icon small>
                                                {{ ui.showCounts ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                                            </v-icon>
                                        </v-btn>
                                    </div>

                                    <v-expand-transition>
                                        <div v-show="ui.showCounts">
                                            <v-simple-table dense>
                                                <tbody>
                                                    <tr v-for="(value, key) in detail.data.counts"
                                                        :key="`counts-${key}`">
                                                        <td class="tw-text-xs tw-font-medium">
                                                            {{ key }}
                                                        </td>
                                                        <td class="tw-text-xs tw-font-mono">
                                                            {{ value }}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </v-simple-table>
                                        </div>
                                    </v-expand-transition>
                                </div>

                                <!-- buffers 섹션 -->
                                <div v-if="hasBuffers">
                                    <div class="d-flex align-center mb-1">
                                        <span class="tw-text-xs tw-font-medium">
                                            버퍼 정보 (buffers)
                                        </span>
                                        <v-spacer />
                                        <v-btn icon x-small @click="ui.showBuffers = !ui.showBuffers">
                                            <v-icon small>
                                                {{ ui.showBuffers ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                                            </v-icon>
                                        </v-btn>
                                    </div>

                                    <v-expand-transition>
                                        <div v-show="ui.showBuffers">
                                            <v-simple-table dense>
                                                <tbody>
                                                    <tr v-for="(value, key) in detail.data.buffers"
                                                        :key="`buffers-${key}`">
                                                        <td class="tw-text-xs tw-font-medium">
                                                            {{ key }}
                                                        </td>
                                                        <td class="tw-text-xs tw-font-mono">
                                                            {{ value }}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </v-simple-table>
                                        </div>
                                    </v-expand-transition>
                                </div>
                            </div>

                            <v-divider v-if="hasCounts || hasBuffers" class="my-3" />

                            <!-- 기본 정보 리스트 -->
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
                                            {{ detail.data.updatedAt }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            사용 여부 (isActive)
                                        </v-list-item-title>
                                        <v-list-item-subtitle
                                            :class="{ 'red--text text--darken-2': detail.data.isActive === false }">
                                            {{ detail.data.isActive }}
                                        </v-list-item-subtitle>
                                    </v-list-item-content>
                                </v-list-item>

                                <v-list-item>
                                    <v-list-item-content>
                                        <v-list-item-title class="font-weight-medium">
                                            삭제일 (deletedAt)
                                        </v-list-item-title>
                                        <v-list-item-subtitle
                                            :class="{ 'red--text text--darken-2': detail.data.isActive === false }">
                                            {{ detail.data.deletedAt }}
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

                            <v-divider />

                            <!-- 활성/비활성 버튼 -->
                            <div class="mt-4 d-flex justify-end">
                                <v-btn small color="success" class="mr-2" :disabled="detail.data.isActive !== false"
                                    @click="onEnable">
                                    활성화
                                </v-btn>

                                <v-btn small color="error" :disabled="detail.data.isActive !== true" @click="onDisable">
                                    비활성화
                                </v-btn>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
export default {
    name: 'AssetSnapshotLogPage',

    data() {
        return {
            state: {
                loading: false,
                error: '',
                raw: []
            },
            tree: {
                items: [],
                open: [],
                active: []
            },
            detail: {
                error: '',
                data: {
                    _id: '',
                    assetId: '',
                    fileName: '',
                    version: '',
                    fileType: '',
                    sizeBytes: 0,
                    url: '',
                    thumbnail: '',
                    updatedAt: null,
                    isActive: true,
                    deletedAt: null,
                    counts: {},
                    buffers: {}
                }
            },
            ui: {
                showCounts: false,
                showBuffers: false
            }
        }
    },

    computed: {
        hasActive() {
            return Array.isArray(this.tree.active) && this.tree.active.length > 0
        },

        hasActiveVersion() {
            return !!(this.detail.data && this.detail.data.version)
        },

        hasCounts() {
            const c = this.detail.data.counts
            return c && typeof c === 'object' && Object.keys(c).length > 0
        },

        hasBuffers() {
            const b = this.detail.data.buffers
            return b && typeof b === 'object' && Object.keys(b).length > 0
        }
    },

    async mounted() {
        await this.reload()
    },

    methods: {
        async reload() {
            this.state.loading = true
            this.state.error = ''
            this.state.raw = []
            this.tree.items = []
            this.tree.active = []
            this.detail.error = ''
            this.detail.data = {
                _id: '',
                assetId: '',
                fileName: '',
                version: '',
                fileType: '',
                sizeBytes: 0,
                url: '',
                thumbnail: '',
                updatedAt: null,
                isActive: true,
                deletedAt: null,
                counts: {},
                buffers: {}
            }
            this.ui.showCounts = false
            this.ui.showBuffers = false

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

        buildSnapshotTree(rows = []) {
            return rows.map((asset, assetIndex) => {
                const assetId = asset.assetId || asset._id || `asset-${assetIndex}`
                const fileName = asset.fileName || '(no name)'
                const files = Array.isArray(asset.files) ? asset.files : []

                const assetIsActive =
                    asset.isActive
                        ? asset.isActivate
                        : files.some(f => (f.isActive ? f.isActivate : true) === true)

                return {
                    id: assetId,
                    type: 'asset',
                    assetId,
                    fileName,
                    isActive: assetIsActive,
                    children: files.map((file, i) => ({
                        id: `${assetId}:${file.version || i}`,
                        type: 'version',
                        _id: file._id || null,
                        assetId,
                        fileName,
                        version: file.version || '',
                        fileType: file.fileType || '',
                        sizeBytes: file.sizeBytes || 0,
                        url: file.url || '',
                        thumbnail: file.thumbnail || '',
                        updatedAt: file.updatedAt || null,
                        isActive: file.isActive,
                        deletedAt: file.deletedAt || null,
                        counts: file.counts || {},
                        buffers: file.buffers || {}
                    }))
                }
            })
        },

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

        onActiveChange(activeIds) {
            if (!Array.isArray(activeIds) || activeIds.length === 0) {
                this.detail.data = {
                    _id: '',
                    assetId: '',
                    fileName: '',
                    version: '',
                    fileType: '',
                    sizeBytes: 0,
                    url: '',
                    thumbnail: '',
                    updatedAt: null,
                    isActive: true,
                    deletedAt: null,
                    counts: {},
                    buffers: {}
                }
                this.ui.showCounts = false
                this.ui.showBuffers = false
                return
            }

            const id = activeIds[0]
            const node = this.findNodeById(id)
            if (!node) return

            // 새 노드 선택시 토글 상태 초기화
            this.ui.showCounts = false
            this.ui.showBuffers = false

            if (node.type === 'version') {
                this.detail.data = {
                    _id: node._id || '',
                    assetId: node.assetId || '',
                    fileName: node.fileName || '',
                    version: node.version || '',
                    fileType: node.fileType || '',
                    sizeBytes: node.sizeBytes || 0,
                    url: node.url || '',
                    thumbnail: node.thumbnail || '',
                    updatedAt: node.updatedAt || null,
                    isActive: node.isActive,
                    deletedAt: node.deletedAt || null,
                    counts: node.counts || {},
                    buffers: node.buffers || {}
                }
            }
        },

        formatBytes(n) {
            const bytes = Number(n) || 0
            if (bytes < 1024) {
                return `${bytes} B`
            }

            const kb = bytes / 1024
            if (kb < 1024) {
                `${kb.toFixed(1)} KB`
            }
            const mb = kb / 1024

            return `${mb.toFixed(2)} MB`
        },

        async onEnable() {
            if (!this.detail.data || !this.detail.data.version) {
                return
            }

            const body = {
                _id: this.detail.data._id,
                assetId: this.detail.data.assetId,
                fileName: this.detail.data.fileName,
                version: this.detail.data.version
            }

            const { ok } = await this.$err.guard(
                async () => {
                    await this.$api.put('/assets/activate', body)
                    return true
                },
                {
                    context: {
                        where: 'AssetSnapshotLogPage.onDisable',
                        assetId: this.detail.data.assetId,
                        fileName: this.detail.data.fileName,
                        version: this.detail.data.version
                    }
                }
            )

            if (ok) {
                reload()
            }

        },

        async onDisable() {
            if (!this.detail.data || !this.detail.data.version) {
                return
            }

            const body = {
                _id: this.detail.data._id,
                assetId: this.detail.data.assetId,
                fileName: this.detail.data.fileName,
                version: this.detail.data.version
            }

            const { ok } = await this.$err.guard(
                async () => {
                    await this.$api.put('/assets/delete', body)
                    return true
                },
                {
                    context: {
                        where: 'AssetSnapshotLogPage.onDisable',
                        assetId: this.detail.data.assetId,
                        fileName: this.detail.data.fileName,
                        version: this.detail.data.version
                    }
                }
            )

            if (ok) {
                reload()
            }
        }
    }
}
</script>
