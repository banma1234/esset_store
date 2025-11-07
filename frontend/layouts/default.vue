<template>
  <v-app>
    <div class="tw-min-h-screen tw-flex tw-flex-col tw-bg-gray-50 tw-text-gray-900">
      <!-- 고정 헤더 -->
      <Header></Header>
      <!-- 헤더 높이 보정 -->
      <div class="tw-h-12"></div>

      <!-- 본문: 데스크톱(>=lg) 3분할 / 태블릿 이하(md 이하) 중앙만 표시 -->
      <main class="tw-flex-1">
        <div class="tw-max-w-screen-2xl tw-mx-auto tw-px-4 tw-py-4">
          <!-- 데스크톱: 3열 -->
          <div class="tw-hidden lg:tw-flex tw-gap-4">
            <!-- 왼쪽: 공간만 차지 -->
            <section class="tw-basis-64 tw-shrink-0"></section>

            <!-- 중앙: 실제 페이지 콘텐츠 -->
            <section class="tw-flex-1 tw-min-w-0">
              <nuxt />
            </section>

            <!-- 오른쪽: 공간만 차지 -->
            <section class="tw-basis-80 tw-shrink-0"></section>
          </div>

          <!-- 태블릿/모바일: 중앙만 1열 -->
          <div class="lg:tw-hidden">
            <nuxt />
          </div>
        </div>
      </main>

      <Footer></Footer>
    </div>
  </v-app>
</template>

<script>
import Header from '~/components/layout/Header.vue'
import Footer from '~/components/layout/Footer.vue'

export default {
  name: 'DefaultLayout',
  components: { Header, Footer }
}
</script>
