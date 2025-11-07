<template>
  <section class="p-6">

    <v-card class="tw-p-6 tw-rounded-2xl">
      <v-btn color="primary" class="tw-mr-3">Vuetify 버튼</v-btn>
      <span class="tw-text-sm tw-text-gray-500">Tailwind 텍스트</span>
    </v-card>

  </section>
</template>

<script>
export default {
  data() {
    return {
      sample: [
        { _id: '64fa1', name: 'Front Bumper' },
        { _id: '64fa2', name: 'Rear Bumper' }
      ]
    }
  }
}
</script>
