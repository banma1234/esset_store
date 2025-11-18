<template>
  <v-app>
    <div class="tw-min-h-screen tw-flex tw-flex-col tw-bg-gray-50 tw-text-gray-900">
      <!-- 고정 헤더 -->
      <Header />
      <!-- 헤더 높이 보정 -->
      <div class="tw-h-12"></div>

      <!-- 본문: 데스크톱(>=xl) 3분할 / 태블릿 이하(md 이하) 중앙만 표시 -->
      <main class="tw-flex-1">
        <div class="tw-max-w-screen-2xl tw-mx-auto tw-px-4 tw-py-4">
          <!-- 데스크톱: 3열 -->
          <div class="tw-hidden xl:tw-flex tw-gap-4">
            <!-- 왼쪽: 메인페이지에서만 사이드바 노출 -->
            <section class="tw-basis-64 tw-shrink-0">
              <NavBar v-if="isHome" />
            </section>

            <!-- 중앙: 실제 페이지 콘텐츠 -->
            <section class="tw-flex-1 tw-min-w-0">
              <nuxt />
            </section>

            <!-- 오른쪽: 공간만 차지 (향후 확장용) -->
            <section class="tw-basis-80 tw-shrink-0"></section>
          </div>

          <!-- 태블릿/모바일: 중앙만 1열 -->
          <div class="xl:tw-hidden">
            <!-- 뷰포트가 작아지면 사이드바를 카드 위로 이동 (메인페이지에서만) -->
            <section v-if="isHome" class="tw-mb-4">
              <NavBar />
            </section>

            <section>
              <nuxt />
            </section>
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

export default {
  name: 'DefaultLayout',
  components: { Header, Footer, NavBar },

  computed: {
    /**
     * @function isHome
     * @description 현재 라우트가 메인 페이지(/)인지 여부
     */
    isHome() {
      // Nuxt 2 기본 라우트 이름: index
      return this.$route.name === 'index' || this.$route.path === '/'
    }
  }
}
</script>
