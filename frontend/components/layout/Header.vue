<template>
  <header class="tw-fixed tw-top-0 tw-inset-x-0 tw-z-40 tw-bg-primary tw-text-black">
    <div class="tw-max-w-screen-2xl tw-mx-auto tw-flex tw-items-center tw-h-12 tw-px-4">
      <button class="tw-mr-2 lg:tw-hidden" @click="$emit('toggle-left')">
        <v-icon small>mdi-menu</v-icon>
      </button>
      <h1 class="tw-font-semibold tw-tracking-tight">EssetStore</h1>
      <div class="tw-flex-1" ></div>
      <nav class="tw-hidden sm:tw-flex tw-items-center tw-gap-4">
        <nuxt-link to="/" class="tw-text-gray/90 hover:tw-text-black">홈</nuxt-link>
        <nuxt-link to="/upload" class="tw-text-gray/90 hover:tw-text-black">모델 추가</nuxt-link>
        <nuxt-link to="/admin" class="tw-text-gray/90 hover:tw-text-black">관리자</nuxt-link>
      </nav>
      <button class="tw-ml-3 lg:tw-hidden" @click="$emit('toggle-right')">
        <v-icon small>mdi-tune</v-icon>
      </button>
    </div>
  </header>
</template>

<script>
export default { name: 'Header' }
</script>
