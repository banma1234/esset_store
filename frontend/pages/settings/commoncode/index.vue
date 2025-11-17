<template>
    <v-container fluid class="py-6">
        <v-row>
            <!-- 좌측: 공통코드 트리 (고정 높이 800px + 스크롤) -->
            <!-- 좌측: 공통코드 트리 (800px 스크롤, 기본 화살표 사용) -->
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-title class="py-3">
                        <div class="text-subtitle-1">공통코드 트리</div>
                        <v-spacer />
                        <v-btn small color="primary" @click="onAddChild">추가</v-btn>
                    </v-card-title>
                    <v-divider />

                    <v-card-text style="height: 600px; overflow: auto;">
                        <v-alert v-if="state.error" type="error" dense outlined class="ma-2">
                            {{ state.error }}
                        </v-alert>

                        <v-treeview v-else :items="tree.items" :open.sync="tree.open" :active.sync="tree.active"
                            item-key="_id" item-children="children" activatable open-on-click dense transition
                            @update:active="onActiveChange">
                            <!-- 라벨만 커스텀 (루트는 code 숨김) -->
                            <template #label="{ item }">
                                <div class="d-flex align-center" @click.stop="onNodeSelect(item)">
                                    <span>
                                        {{ item.name }}
                                        <template v-if="item.depth > 0 && item.code">
                                            <small class="grey--text"> ({{ item.code }})</small>
                                        </template>
                                    </span>
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
                        <div class="d-flex btn-group">
                            <v-btn small color="primary" :disabled="!isActionEnabled" @click="onSave">저장</v-btn>
                            <v-btn small color="primary" outlined text :disabled="!isActionEnabled"
                                @click="onCancel">취소</v-btn>
                        </div>
                    </v-card-title>
                    <v-divider />

                    <v-alert v-if="detail.error" type="error" dense outlined class="ma-4">
                        {{ detail.error }}
                    </v-alert>

                    <v-card-text style="height: 600px;">
                        <v-form ref="detailForm" v-model="detail.valid" lazy-validation>
                            <v-text-field label="코드 (code)" v-model="detail.data.code" outlined dense
                                :disabled="true" />

                            <div class="d-flex code-split">
                                <v-text-field class="mr-2 flex-major" label="대분류" v-model="detail.codeParts.major"
                                    outlined dense :disabled="true" />
                                <v-text-field class="flex-minor" label="소분류" v-model="detail.codeParts.minor" outlined
                                    dense :disabled="!isActionEnabled" />
                            </div>

                            <v-text-field label="이름 (name)" v-model="detail.data.name" outlined dense
                                :disabled="!isActionEnabled" />

                            <v-select label="사용 여부 (isActive)" v-model="detail.data.isActive" :items="isActiveItems"
                                item-text="label" item-value="value" :value-comparator="(a, b) => a === b"
                                :menu-props="{ offsetY: true, nudgeBottom: 8 }" outlined dense
                                :disabled="!isActionEnabled" />


                            <v-text-field label="수정일 (updatedAt)" :value="formattedUpdatedAt" outlined dense
                                :disabled="true" />
                        </v-form>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
// 트리 변환 유틸
import { buildTree } from '@/utils/commonCodes/buildTree'
import { findTreeNodeById } from '@/utils/commonCodes/commonCodeTree'
import { formatDate } from '@/utils/formatDate';

export default {
    data() {
        return {
            state: { error: '', raw: [] },
            tree: { items: [], open: [], active: [] },
            ui: { createMode: false },
            detail: {
                loading: false,
                error: '',
                valid: false,
                data: { _id: '', code: '', name: '', isActive: true, updatedAt: null },
                codeParts: { major: '', minor: '' }
            },
            isActiveItems: [
                { label: '사용', value: true },
                { label: '미사용', value: false }
            ],
            rules: {
                minorRequired: v => !!(v && v.length === 3) || '소분류는 3자리를 입력하세요',
                nameRequired: v => !!v || '이름은 필수입니다',
                isActiveRequired: v => (typeof v === 'boolean') || '사용 여부를 선택하세요'
            }
        }
    },

    computed: {
        formattedUpdatedAt() {
            const v = this.detail.data.updatedAt
            return v ? formatDate(v) : ''
        },
        hasActive() {
            return Array.isArray(this.tree.active) && this.tree.active.length > 0
        },
        isActionEnabled() {
            return this.hasActive || this.ui.createMode
        }
    },

    // hasActive() {
    //     return Array.isArray(this.tree.active) && this.tree.active.length > 0
    // },

    // isActionEnabled() {
    //     // 🔹 노드가 선택되어 있거나 생성 모드일 때만 활성화
    //     return this.hasActive || this.ui.createMode
    // },

    watch: {
        // 코드가 바뀌면 자동으로 대/소분류 갱신
        'detail.data.code'(val) {
            this.detail.codeParts = this.splitCode(val)
        },
    },

    mounted() {
        this.reload()
    },

    methods: {
        /** 공통코드 전체 로드 → 트리 구성 */
        async reload() {
            this.state.error = ''
            this.tree.items = []
            this.tree.open = []       // ← 초기에는 아무 노드도 열지 않음
            this.tree.active = []
            this.detail.error = ''
            this.detail.data = { _id: '', code: '', name: '', isActive: true, updatedAt: null, parentId: null }
            this.detail.codeParts = { major: '', minor: '' }
            this.ui.createMode = false

            const ok = await this.$err.guard(async () => {
                const list = await this.$api.get('/commoncode')
                const { filters, categories } = list.data;

                this.state.raw = [...filters, ...categories]
                this.tree.items = buildTree(this.state.raw)

                return true
            }, { context: { where: 'AdminCommonCode.reload' } })

            if (!ok) this.state.error = '공통코드를 불러오지 못했습니다.'
        },

        /** 라벨 클릭 시 부모/자식 모두 선택되도록 강제 */
        onNodeSelect(item) {
            // 활성 노드로 지정(뷰/하이라이트 일치)
            this.tree.active = [item._id]
            // code 없으면 스킵(루트라도 보통 code는 있음; 없을 가능성 대비)
            if (!item.code) return

            this.ui.createMode = false
            // 상세 로드
            this.loadDetailByCode(item.code)
        },

        // 뒤 3자리 = 소분류, 나머지 = 대분류
        splitCode(code) {
            const s = (code || '').toString()
            if (s.length <= 3) return { major: '', minor: s }
            return { major: s.slice(0, -3), minor: s.slice(-3) }
        },

        /** 트리 선택 변경 → 첫 번째 활성 노드로 상세 조회 */
        async onActiveChange(activeIds) {
            if (!Array.isArray(activeIds) || activeIds.length === 0) return
            const id = activeIds[0]
            const node = this.findNodeById(id)

            if (!node) {
                return;
            }
            this.ui.createMode = false

            await this.loadDetailByCode(node.code)
        },

        /** 단순 탐색(필요 최소 기능) */
        findNodeById(id) {
            return findTreeNodeById(this.tree.items, id);
        },

        /** 상세 조회: GET /api/v1/commoncode?code=TARGET */
        async loadDetailByCode(code) {
            if (!code) return
            this.detail.error = ''

            const ok = await this.$err.guard(async () => {
                const res = await this.$api.get('/commoncode', { query: { code } })
                const one = res && res.data ? res.data : null      // ✅ 응답에서 data 꺼내기
                if (!one) throw new Error('상세 응답이 비어 있습니다.')

                this.detail.data = {
                    _id: one._id || null,
                    code: one.code || '',
                    name: one.name || '',
                    isActive: typeof one.isActive === 'boolean' ? one.isActive : true,
                    updatedAt: one.updatedAt || null,
                    parentId: one.parentId || null
                }
                this.detail.codeParts = this.splitCode(this.detail.data.code)

                return true
            }, { context: { where: 'AdminCommonCode.loadDetail', code } })

            if (!ok) {
                this.detail.error = '상세 정보를 불러오지 못했습니다.'
            }
        },

        // 🔹 현재 선택 노드의 자식 노드 생성 시작
        onAddChild() {
            const parent = this.hasActive ? this.findNodeById(this.tree.active[0]) : null
            this.ui.createMode = true
            this.detail.error = ''

            // 부모가 있으면 대분류=부모 code, 없으면(루트) 대분류=''
            const major = parent?.code || ''
            const parentId = parent?._id || null
            this.detail.codeParts = { major, minor: '' }
            this.detail.data = {
                _id: null,
                parentId: parentId,
                code: major,       // 화면상 read-only 전체코드는 참고용(실제 저장은 onSave에서 합침)
                name: '',
                isActive: true,
                updatedAt: null
            }

        },

        // 🔹 저장(검증 → 콘솔 출력; API 호출 없음)
        async onSave() {
            this.detail.error = ''
            const okForm = await this.$refs.detailForm.validate()
            const minorOk = !!(this.detail.codeParts.minor && this.detail.codeParts.minor.length === 3)
            const nameOk = !!this.detail.data.name
            const activeOk = (typeof this.detail.data.isActive === 'boolean')

            if (!okForm || !minorOk || !nameOk || !activeOk) {
                this.detail.error = '필수 항목을 확인하세요: 소분류(3자리), 이름, 사용 여부.'
                return
            }

            const parentId = this.hasActive ? this.detail.data.parentId : null
            const major = (this.hasActive && this.ui.createMode) ? this.detail.codeParts.major + '-' : this.detail.codeParts.major
            const minor = this.detail.codeParts.minor
            const fullCode = major + minor  // ← 저장 시점에만 합치기 (요구사항 3 반영)

            const payload = {
                parentId,
                major,
                minor,
                code: fullCode,
                name: this.detail.data.name,
                isActive: this.detail.data.isActive
            }

            const res = await this.$err.guard(async () => {
                if (this.ui.createMode) {
                    const res = await this.$api.post('/commoncode', payload);

                    return res;
                }
                return await this.$api.put('/commoncode', payload);
            }, { context: { where: 'AdminCommonCode.loadDetail', fullCode } })

            if (!res.ok) {
                this.detail.error = '공통코드 편집에 실패했습니다.'
            }

            this.ui.createMode = false
            this.reload();
            // 필요 시 여기서 폼 초기화/선택 해제/리로드 등 처리
        },
        // 🔹 취소(생성 취소 + 선택 해제 + 상세 초기화)
        onCancel() {
            this.ui.createMode = false
            this.tree.active = []
            this.detail.error = ''
            this.detail.data = { code: '', name: '', isActive: true, updatedAt: null }
            this.detail.codeParts = { major: '', minor: '' }
        }

    }
}
</script>