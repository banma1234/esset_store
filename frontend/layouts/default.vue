<template>
  <v-app>
    <div class="tw-min-h-screen tw-flex tw-flex-col tw-bg-gray-50 tw-text-gray-900">
      <!-- 고정 헤더 -->
      <Header />
      <!-- 헤더 높이 보정 -->
      <div class="tw-h-12"></div>

      <!-- 본문: 데스크톱(>=xl) 3분할 / 태블릿 이하(md 이하) -->
      <main class="tw-flex-1">
        <div class="tw-max-w-screen-2xl tw-mx-auto tw-px-4 tw-py-4">
          <!-- 데스크톱: 3열 -->
          <div class="tw-hidden xl:tw-flex tw-gap-4">
            <!-- 왼쪽: 메인페이지에서는 NavBar, 뷰어 페이지에서는 메타 카드 -->
            <section class="tw-basis-64 tw-shrink-0">
              <NavBar v-if="isHome" />
              <AssetMetaCard v-else-if="isViewer" :meta="viewerMeta" />
            </section>

            <!-- 중앙: 실제 페이지 콘텐츠 -->
            <section class="tw-flex-1 tw-min-w-0">
              <nuxt />
            </section>

            <!-- 오른쪽: 공간만 차지 (향후 확장용) -->
            <section class="tw-basis-80 tw-shrink-0"></section>
          </div>

          <!-- 태블릿/모바일: 1열 -->
          <div class="xl:tw-hidden">
            <!-- 메인페이지: 기존처럼 NavBar가 카드 위 -->
            <template v-if="isHome">
              <section class="tw-mb-4">
                <NavBar />
              </section>
              <section>
                <nuxt />
              </section>
            </template>

            <!-- 뷰어 페이지: 뷰어가 먼저, 그 아래 메타 카드 -->
            <template v-else-if="isViewer">
              <section>
                <nuxt />
              </section>
              <section class="tw-mt-4">
                <AssetMetaCard :meta="viewerMeta" />
              </section>
            </template>

            <!-- 그 외 페이지: 그냥 콘텐츠만 -->
            <template v-else>
              <section>
                <nuxt />
              </section>
            </template>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  </v-app>
</template>

<script>
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'
import NavBar from '~/components/layout/navBar.vue'
import AssetMetaCard from '~/components/layout/AssetMetaCard.vue'

export default {
  name: 'DefaultLayout',
  components: { Header, Footer, NavBar, AssetMetaCard },

  data() {
    return {
      /**
       * @property {Object|null} viewerMeta
       * @description 뷰어 페이지에서 전달한 메타 정보(에셋 + 카테고리/필터 트리)
       */
      viewerMeta: null
    }
  },

  computed: {
    /**
     * @computed isHome
     * @description 현재 라우트가 메인 페이지(/)인지 여부
     */
    isHome() {
      return this.$route.name === 'index' || this.$route.path === '/'
    },

    /**
     * @computed isViewer
     * @description 현재 라우트가 에셋 뷰어 페이지(/assets/:fileName)인지 여부
     */
    isViewer() {
      return (
        this.$route.name === 'assets-fileName' ||
        this.$route.path.startsWith('/assets/')
      )
    }
  },

  created() {
    // 뷰어 페이지에서 쏘는 메타 이벤트 수신
    if (process.client) {
      this.$root.$on('viewer:meta', this.onViewerMetaUpdate)
    }
  },

  beforeDestroy() {
    if (process.client) {
      this.$root.$off('viewer:meta', this.onViewerMetaUpdate)
    }
  },

  methods: {
    /**
     * @function onViewerMetaUpdate
     * @description 뷰어 페이지에서 전달한 메타 정보를 저장한다.
     * @param {Object|null} payload - 메타 정보 또는 null
     */
    onViewerMetaUpdate(payload) {
      this.viewerMeta = payload
    }
  }
}
</script>
