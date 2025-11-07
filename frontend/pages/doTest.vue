<template>
  <div class="min-h-screen flex items-center justify-center p-8">
    <div class="max-w-md w-full bg-white shadow rounded-2xl p-6 space-y-4">
      <h1 class="text-2xl font-bold">Do Test</h1>

      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" @click="callTest">
        서버에 테스트 요청 보내기
      </button>

      <div v-if="loading" class="text-gray-500">요청 중...</div>
      <div v-if="error" class="text-red-600">오류: {{ error }}</div>
      <div v-if="message" class="text-green-700 font-semibold">
        응답: {{ message }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return { message: '', loading: false, error: '' }
  },
  methods: {
    async callTest() {
      this.loading = true
      this.error = ''
      this.message = ''
      try {
        // 도커 미사용 단계: 프런트(:3000) -> 백엔드(:4000) 직접 호출
        const res = await fetch('/api/v1/test')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        this.message = data.message || ''
      } catch (e) {
        this.error = e.message || 'request failed'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style>
html,
body,
#__nuxt,
#__layout {
  height: 100%;
}
</style>
