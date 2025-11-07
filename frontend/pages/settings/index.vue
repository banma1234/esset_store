<template>
  <section class="p-6">
    <nuxt-link to="/">← 홈</nuxt-link>
    <h1 class="mt-4">관리자</h1>

    <ul class="mt-6">
      <li><nuxt-link to="/categories">카테고리 관리</nuxt-link></li>
      <li><nuxt-link to="/filters">필터 관리</nuxt-link></li>
    </ul>
  </section>
</template>

<script>
export default {
  middleware: ['adminGuard'] // 선택: /middleware/adminGuard.js 로 가드 구현 가능
}
</script>
