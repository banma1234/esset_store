<template>
  <v-container class="py-6" fluid>
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card class="pa-6">
          <div class="text-subtitle-1 mb-3">3D 모델 업로드 (.glb, .gltf, .stl)</div>

          <!-- 파일 선택 -->
          <input ref="fileInput" type="file" accept=".glb,.gltf,.stl,model/*" @change="onPick" />

          <!-- 액션 버튼 -->
          <div class="mt-4 d-flex">
            <v-btn color="primary" :loading="state.loading" :disabled="!state.file || state.loading" @click="onUpload">
              업로드
            </v-btn>
            <v-btn class="ml-2" text :disabled="state.loading" @click="onReset">초기화</v-btn>
          </div>

          <!-- 메시지 -->
          <v-alert v-if="state.error" type="error" dense outlined class="mt-4">
            {{ state.error }}
          </v-alert>

          <v-alert v-if="state.done" type="success" dense outlined class="mt-4">
            업로드 완료 — {{ state.meta?.fileName }}
            ({{ (state.meta?.sizeBytes / 1024 / 1024).toFixed(2) }} MB)
          </v-alert>

          <!-- 업로드 요약(옵션) -->
          <div v-if="state.meta" class="grey--text text--darken-1 mt-2">
            확장자: {{ state.meta.extension }}
            <template v-if="state.meta.version"> / 버전: {{ state.meta.version }}</template>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { upload3DModel, DEFAULT_POLICY } from '@/utils/assets/uploadFile'

// ✅ 이 페이지의 POLICY (페이지마다 다르게 정의 가능)
const POLICY = { ...DEFAULT_POLICY, }

export default {
  data() {
    return {
      state: {
        file: null,
        meta: null,
        loading: false,
        done: false,
        error: ''
      }
    }
  },

  methods: {
    /**
     * @function onPick
     * @description 파일 선택 시 상태 초기화 및 선택 파일 보관
     * @param {Event} e - input change 이벤트
     */
    onPick(e) {
      this.state.error = ''
      this.state.done = false
      const f = e.target.files && e.target.files[0]
      this.state.file = f || null
      // 버튼은 v-bind로 자동 활성/비활성 처리됨
    },

    /**
     * @function onUpload
     * @description 업로드 버튼 클릭 시 presign → PUT 업로드 실행
     */
    async onUpload() {
      if (!this.state.file || this.state.loading) return
      this.state.error = ''
      this.state.done = false
      this.state.meta = null
      this.state.loading = true

      const ok = await this.$err.guard(async () => {
        const { meta } = await upload3DModel({
          file: this.state.file,
          api: this.$api,
          policy: POLICY
        })
        this.state.meta = meta
        this.state.done = true

        return true
      }, { context: { where: 'UploadPage.onUpload' } })

      if (!ok) {
        this.state.error = '업로드 중 오류가 발생했습니다.'
      }

      this.state.loading = false
    },

    /**
     * @function onReset
     * @description 화면 상태 초기화
     */
    onReset() {
      this.state.file = null
      this.state.meta = null
      this.state.error = ''
      this.state.done = false
      // input 값을 지워 다음에 같은 파일도 다시 선택 가능
      if (this.$refs.fileInput) this.$refs.fileInput.value = ''
    }
  }
}
</script>