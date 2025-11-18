<template>
  <v-container fluid class="py-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h5 mb-2">
          에셋 목록
        </h1>
      </v-col>
    </v-row>

    <!-- 에러 -->
    <v-row>
      <v-col cols="12">
        <v-alert v-if="assets.error" type="error" dense outlined class="mb-4">
          {{ assets.error }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- 에셋 카드 리스트: 항상 렌더링 (에러 아닐 때) -->
    <v-row v-if="!assets.error">
      <v-col v-for="item in assets.items" :key="item._id" cols="12" sm="6" md="4" lg="3">
        <v-card outlined elevation="1" class="asset-card tw-flex tw-flex-col tw-h-full" @click="goDetail(item)">
          <div class="asset-card__thumb">
            <v-img :src="item.thumbnail" height="180" class="grey lighten-4">
              <template #placeholder>
                <div class="tw-w-full tw-h-full tw-flex tw-items-center tw-justify-center tw-text-xs tw-text-gray-500">
                  썸네일 없음
                </div>
              </template>
            </v-img>
          </div>

          <v-card-text class="py-3">
            <div class="font-weight-medium mb-1">
              {{ item.fileName }}
            </div>

            <div class="grey--text text--darken-1 text-caption mb-1">
              파일 타입: {{ (item.fileType || '').toUpperCase() }}
            </div>

            <div class="grey--text text--darken-1 text-caption">
              수정일: {{ formattedUpdatedAt(item.updatedAt) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col v-if="!assets.items.length && !assets.loading" cols="12"
        class="text-center grey--text text--darken-1 mt-6">
        표시할 에셋이 없습니다.
      </v-col>
    </v-row>

    <!-- 페이지네이션 -->
    <v-row v-if="!assets.error && assets.pagination.totalPages > 1" class="mt-6" justify="center">
      <v-col cols="12" class="text-center">
        <v-pagination v-model="assets.pagination.page" :length="assets.pagination.totalPages" :total-visible="7"
          @input="onPageChange" />
      </v-col>
    </v-row>
  </v-container>
</template>


<script>
import { formatDate } from '@/utils/formatDate'

export default {
  name: 'AssetListPage',

  data() {
    return {
      assets: {
        loading: false,
        error: '',
        items: [],
        pagination: {
          page: 1,
          pageSize: 5,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }
  },

  computed: {
    /**
     * @function currentFilename
     * @description
     *  - 현재 라우트의 쿼리스트링에서 filename을 읽어온다.
     *  - 없으면 빈 문자열을 반환한다.
     */
    currentFilename() {
      return this.$route.query.filename || ''
    }
  },

  async mounted() {
    await this.loadAssets(1)
  },

  watch: {
    /**
     * @function currentFilename
     * @description
     *  - 헤더 검색 등으로 filename 쿼리가 바뀌면
     *    1페이지부터 다시 에셋 목록을 로드한다.
     */
    currentFilename() {
      this.assets.pagination.page = 1
      this.loadAssets(1)
    }
  },

  methods: {
    /**
     * @function loadAssets
     * @description
     *  - 에셋 목록을 조회한다.
     *  - 검색어는 currentFilename(쿼리스트링 filename)을 사용한다.
     *  - GET /api/v1/assets/search?category=&filters=&page=&filename=
     * @param {number} page - 조회할 페이지 번호
     */
    async loadAssets(page = 1) {
      this.assets.loading = true
      this.assets.error = ''

      const filename = this.currentFilename

      const ok = await this.$err.guard(
        async () => {
          const data = await this.$api.get('/assets/search', {
            query: {
              category: '',
              filters: '',
              page,
              filename
            }
          })

          this.assets.items = Array.isArray(data.items) ? data.items : []
          this.assets.pagination = {
            page: data.pagination?.page || page,
            pageSize: data.pagination?.pageSize || this.assets.pagination.pageSize,
            totalItems: data.pagination?.totalItems || 0,
            totalPages: data.pagination?.totalPages || 0,
            hasNextPage: !!data.pagination?.hasNextPage,
            hasPrevPage: !!data.pagination?.hasPrevPage
          }

          return true
        },
        { context: { where: 'AssetListPage.loadAssets', page, filename } }
      )

      if (!ok) {
        this.assets.error = '에셋 목록을 불러오지 못했습니다.'
      }

      this.assets.loading = false
    },

    /**
     * @function onPageChange
     * @description v-pagination에서 페이지 변경 시 호출된다.
     * @param {number} page - 변경된 페이지 번호
     */
    async onPageChange(page) {
      if (this.assets.loading) return
      this.assets.pagination.page = page
      await this.loadAssets(page)
    },

    formattedUpdatedAt(value) {
      if (!value) return ''
      return formatDate(value)
    },

    goDetail(item) {
      if (!item || !item.fileName) return
      this.$router.push(`/assets/${item.fileName}`)
    }
  }
}
</script>


<style scoped>
.asset-card {
  cursor: pointer;
}

/* 썸네일 영역: 고정 높이 + overflow hidden */
.asset-card__thumb {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

/* v-img 내부 실제 이미지에 트랜지션/스케일 효과 적용 */
/* Nuxt2 + Vuetify에서 scoped 스타일로 deep 선택자 사용 */
.asset-card__thumb ::v-deep .v-image__image {
  transition: transform 0.25s ease-out;
  transform-origin: center center;
}

/* 카드 호버 시 이미지 살짝 확대 */
.asset-card:hover .asset-card__thumb ::v-deep .v-image__image {
  transform: scale(1.2);
}
</style>
