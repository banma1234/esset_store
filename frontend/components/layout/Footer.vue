<template>
  <v-footer
    dark
    class="tw-bg-gray-100 tw-text-gray-600"
>
    <div class="tw-max-w-screen-2xl tw-mx-auto tw-h-12 tw-flex tw-items-center tw-justify-center tw-text-sm">
      © {{ new Date().getFullYear() }} EssetStore · All rights reserved
    </div>
  </v-footer>
</template>

<script>
export default { name: 'Footer' }
</script>
