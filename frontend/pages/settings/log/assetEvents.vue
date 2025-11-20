<template>
    <v-container fluid class="py-6">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <!-- ====================== -->
                    <!-- 타이틀 + CSV 버튼       -->
                    <!-- ====================== -->
                    <v-card-title class="py-3 d-flex align-center justify-space-between">
                        <div class="text-subtitle-1">
                            Asset Events 로그
                        </div>
                        <v-btn small color="primary" @click="exportCsv">
                            CSV 다운로드
                        </v-btn>
                    </v-card-title>
                    <v-divider />

                    <v-card-text>
                        <!-- ====================== -->
                        <!-- 검색 필터 그룹          -->
                        <!-- ====================== -->
                        <v-row dense class="mb-4">
                            <!-- 최대 개수(pageSize) -->
                            <v-col cols="12" sm="4" md="3">
                                <v-select v-model="filters.pageSize" :items="pageSizeItems" label="최대 개수" dense outlined
                                    :menu-props="{ offsetY: true, nudgeBottom: 8 }" @change="onFilterChange" />
                            </v-col>

                            <!-- 이벤트 타입 -->
                            <v-col cols="12" sm="4" md="3">
                                <v-select v-model="filters.eventType" :items="eventTypeItems" label="이벤트 타입" dense
                                    outlined :menu-props="{ offsetY: true, nudgeBottom: 8 }" @change="onFilterChange" />
                            </v-col>

                            <!-- 날짜 범위: 시작일 -->
                            <v-col cols="12" sm="4" md="3">
                                <v-menu v-model="menus.start" :close-on-content-click="false"
                                    transition="scale-transition" offset-y min-width="auto">
                                    <template #activator="{ on, attrs }">
                                        <v-text-field v-model="filters.startDate" label="시작일"
                                            prepend-icon="mdi-calendar" readonly dense outlined v-bind="attrs"
                                            v-on="on" />
                                    </template>
                                    <v-date-picker v-model="filters.startDate" @input="onStartDatePicked"
                                        :max="filters.endDate || undefined" />
                                </v-menu>
                            </v-col>

                            <!-- 날짜 범위: 종료일 -->
                            <v-col cols="12" sm="4" md="3">
                                <v-menu v-model="menus.end" :close-on-content-click="false"
                                    transition="scale-transition" offset-y min-width="auto">
                                    <template #activator="{ on, attrs }">
                                        <v-text-field v-model="filters.endDate" label="종료일" prepend-icon="mdi-calendar"
                                            readonly dense outlined v-bind="attrs" v-on="on" />
                                    </template>
                                    <v-date-picker v-model="filters.endDate" @input="onEndDatePicked"
                                        :min="filters.startDate || undefined" />
                                </v-menu>
                            </v-col>
                        </v-row>

                        <!-- 날짜/필터 에러 -->
                        <v-alert v-if="ui.dateError" type="error" dense outlined class="mb-2">
                            {{ ui.dateError }}
                        </v-alert>

                        <v-alert v-if="state.error" type="error" dense outlined class="mb-2">
                            {{ state.error }}
                        </v-alert>

                        <!-- ====================== -->
                        <!-- 테이블                 -->
                        <!-- ====================== -->
                        <v-simple-table>
                            <thead>
                                <tr>
                                    <th class="text-left">이벤트 타입</th>
                                    <th class="text-left">파일 이름</th>
                                    <th class="text-left">버전</th>
                                    <th class="text-left">Asset ID</th>
                                    <th class="text-left">AssetVersion ID</th>
                                    <th class="text-left">수정일</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="!state.loading && state.items.length === 0">
                                    <td colspan="6" class="text-center grey--text">
                                        데이터가 없습니다.
                                    </td>
                                </tr>

                                <tr v-for="row in state.items" :key="row._id">
                                    <!-- 이벤트 타입: 색상 구분 -->
                                    <td>
                                        <v-chip small label dark :color="getEventColor(row.eventType)">
                                            {{ row.eventType }}
                                        </v-chip>
                                    </td>
                                    <td>{{ row.fileName }}</td>
                                    <td>{{ row.version }}</td>
                                    <td>{{ row.assetId }}</td>
                                    <td>{{ row.assetVersionsId }}</td>
                                    <td>{{ formatDate(row.updatedAt) }}</td>
                                </tr>
                            </tbody>
                        </v-simple-table>

                        <!-- ====================== -->
                        <!-- 페이지네이션           -->
                        <!-- ====================== -->
                        <div v-if="pagination.totalPages > 1" class="mt-4 d-flex justify-center">
                            <v-pagination v-model="pagination.page" :length="pagination.totalPages" :total-visible="5"
                                @input="onPageChange" />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
import { formatDate } from '@/utils/formatDate'

export default {
    name: 'AssetEventsLogPage',

    data() {
        return {
            /** @type {{ loading: boolean, error: string, items: Array }} */
            state: {
                loading: false,
                error: '',
                items: []
            },

            /** @type {{ page: number, pageSize: number, totalItems: number, totalPages: number }} */
            pagination: {
                page: 1,
                pageSize: 10,
                totalItems: 0,
                totalPages: 1
            },

            /** 검색 필터 상태 */
            filters: {
                pageSize: 10,
                eventType: '',   // '' = 선택(전체)
                startDate: '',   // 'YYYY-MM-DD'
                endDate: ''      // 'YYYY-MM-DD'
            },

            /** 날짜 피커 메뉴 상태 */
            menus: {
                start: false,
                end: false
            },

            /** UI 에러 상태(날짜 범위 등) */
            ui: {
                dateError: ''
            },

            /** pageSize 선택 옵션 */
            pageSizeItems: [10, 20, 30],

            /** 이벤트 타입 선택 옵션 */
            eventTypeItems: [
                { text: '전체', value: '' },
                { text: 'CREATE', value: 'CREATE' },
                { text: 'UPDATE', value: 'UPDATE' },
                { text: 'DELETE', value: 'DELETE' }
            ]
        }
    },

    mounted() {
        this.fetchLogs()
    },

    methods: {
        formatDate,

        /**
         * @function getEventColor
         * @description 이벤트 타입별 색상 반환
         * @param {string} type - 이벤트 타입(CREATE/UPDATE/DELETE)
         * @returns {string} Vuetify 색상명
         */
        getEventColor(type) {
            if (type === 'CREATE') return 'green'
            if (type === 'UPDATE') return 'amber'
            if (type === 'DELETE') return 'red'
            return 'grey'
        },

        /**
         * @function validateDateRange
         * @description 날짜 범위 유효성 검사 (시작일 ≤ 종료일, 최대 6개월)
         * @returns {boolean} 유효하면 true, 아니면 false
         */
        validateDateRange() {
            this.ui.dateError = ''
            const { startDate, endDate } = this.filters

            // 둘 다 비어 있으면 필터 미사용
            if (!startDate && !endDate) return true

            // 한쪽만 선택된 경우
            if ((startDate && !endDate) || (!startDate && endDate)) {
                this.ui.dateError = '시작일과 종료일을 모두 선택해주세요.'
                return false
            }

            const s = new Date(startDate)
            const e = new Date(endDate)

            if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
                this.ui.dateError = '유효한 날짜를 선택해주세요.'
                return false
            }

            if (s > e) {
                this.ui.dateError = '시작일은 종료일보다 이후일 수 없습니다.'
                return false
            }

            // 최대 6개월 제한
            const maxEnd = new Date(s)
            maxEnd.setMonth(maxEnd.getMonth() + 6)
            if (e > maxEnd) {
                this.ui.dateError = '날짜 범위는 최대 6개월까지만 선택할 수 있습니다.'
                return false
            }

            return true
        },

        /**
         * @function buildQuery
         * @description 현재 필터/페이지 상태를 기반으로 API 쿼리 객체를 생성한다.
         * @returns {Object} 쿼리 파라미터 객체
         */
        buildQuery() {
            const query = {
                page: this.pagination.page,
                pageSize: this.filters.pageSize
            }

            if (this.filters.eventType) {
                query.eventType = this.filters.eventType
            }

            if (this.filters.startDate && this.filters.endDate) {
                query.startDate = this.filters.startDate
                query.endDate = this.filters.endDate
            }

            return query
        },

        /**
         * @function fetchLogs
         * @description 현재 필터/페이지 상태로 assetEvents 로그를 조회한다.
         */
        async fetchLogs() {
            // 날짜 범위 검증 실패 시 API 호출하지 않음
            if (!this.validateDateRange()) return

            this.state.loading = true
            this.state.error = ''
            this.state.items = []

            const query = this.buildQuery()

            const ok = await this.$err.guard(
                async () => {
                    const res = await this.$api.get('/_debug/log/assetevents', { query })

                    if (!res || !res.ok) {
                        throw new Error('유효하지 않은 응답입니다.')
                    }

                    const { items, pagination } = res.data

                    this.state.items = items || []
                    if (pagination) {
                        this.pagination.page = pagination.page || 1
                        this.pagination.pageSize = pagination.pageSize || this.filters.pageSize
                        this.pagination.totalItems = pagination.totalItems || 0
                        this.pagination.totalPages = pagination.totalPages || 1
                    } else {
                        this.pagination.totalItems = this.state.items.length
                        this.pagination.totalPages = 1
                    }

                    // pageSize는 서버 응답 기준으로 동기화
                    this.filters.pageSize = this.pagination.pageSize

                    return true
                },
                { context: { where: 'AssetEventsLogPage.fetchLogs', query } }
            )

            if (!ok) {
                this.state.error = '이벤트 로그를 불러오지 못했습니다.'
            }

            this.state.loading = false
        },

        /**
         * @function onFilterChange
         * @description 필터(최대 개수 / 이벤트 타입) 변경 시 호출,
         *              페이지를 1로 리셋한 뒤 다시 조회한다.
         */
        onFilterChange() {
            this.pagination.page = 1
            this.fetchLogs()
        },

        /**
         * @function onStartDatePicked
         * @description 시작일을 선택했을 때 호출된다.
         * @param {string} value - YYYY-MM-DD
         */
        onStartDatePicked(value) {
            this.filters.startDate = value
            this.menus.start = false
            this.pagination.page = 1
            this.fetchLogs()
        },

        /**
         * @function onEndDatePicked
         * @description 종료일을 선택했을 때 호출된다.
         * @param {string} value - YYYY-MM-DD
         */
        onEndDatePicked(value) {
            this.filters.endDate = value
            this.menus.end = false
            this.pagination.page = 1
            this.fetchLogs()
        },

        /**
         * @function onPageChange
         * @description 페이지네이션에서 페이지가 변경되었을 때 호출된다.
         * @param {number} page - 선택된 페이지 번호
         */
        onPageChange(page) {
            this.pagination.page = page
            this.fetchLogs()
        },

        /**
         * @function exportCsv
         * @description 현재 필터/페이지 상태로 화면에 표시된 items를 CSV로 다운로드한다.
         *              (필터링 옵션이 적용된 현재 페이지 데이터 기준)
         */
        exportCsv() {
            if (!process.client) return

            const items = this.state.items || []
            if (items.length === 0) {
                // eslint-disable-next-line no-console
                console.warn('[AssetEventsLogPage.exportCsv] 내보낼 데이터가 없습니다.')
                return
            }

            const headers = [
                'eventType',
                'fileName',
                'version',
                'assetId',
                'assetVersionsId',
                'updatedAt'
            ]

            const rows = items.map(row => [
                row.eventType || '',
                row.fileName || '',
                row.version || '',
                row.assetId || '',
                row.assetVersionsId || '',
                row.updatedAt ? this.formatDate(row.updatedAt) : ''
            ])

            /**
             * @function escapeCsv
             * @description CSV 셀 값 이스케이프
             * @param {string} value
             * @returns {string}
             */
            const escapeCsv = (value) => {
                const s = String(value).replace(/"/g, '""')
                // 콤마/따옴표/줄바꿈이 있으면 따옴표로 감싼다.
                if (/[",\n]/.test(s)) {
                    return `"${s}"`
                }
                return s
            }

            const csvLines = []
            csvLines.push(headers.join(','))
            rows.forEach(row => {
                csvLines.push(row.map(escapeCsv).join(','))
            })

            const csvContent = csvLines.join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')

            const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
            a.href = url
            a.download = `asset-events_${today}_page${this.pagination.page}.csv`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
    }
}
</script>
