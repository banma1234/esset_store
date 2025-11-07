<template>
  <v-container class="py-8" style="max-width: 880px;">
    <v-card>
      <!-- 헤더 -->
      <v-card-title class="justify-space-between">
        <div class="text-h6">3D 모델 업로드</div>
        <nuxt-link to="/">← 홈</nuxt-link>
      </v-card-title>

      <!-- 본문 -->
      <v-card-text>
        <v-alert type="info" dense class="mb-4">
          지원 확장자: <code>.glb</code>, <code>.gltf</code>, <code>.stl</code>.
          단일 파일 업로드는 <strong>.glb</strong> 권장.
        </v-alert>

        <v-form ref="form" v-model="isValid" lazy-validation>
          <!-- 표시 이름 -->
          <v-text-field label="표시 이름" v-model="form.name" :rules="[(v) => !!v || '이름은 필수입니다']" outlined dense />

          <!-- 파일 선택 -->
          <v-file-input label="3D 모델 파일" v-model="form.file" :rules="fileRules"
            accept=".glb,.gltf,.stl,model/gltf-binary,model/gltf+json,model/stl" show-size truncate-length="64" outlined
            dense prepend-icon="mdi-file-upload" @change="onFileChange" />

          <!-- 감지된 확장자/크기 -->
          <div class="mt-2 grey--text text--darken-1">
            감지된 형식: <strong>{{ form.ext || '-' }}</strong>
            <span v-if="form.file"> • {{ formatBytes(form.file.size) }}</span>
          </div>

          <!-- 액션 -->
          <div class="mt-6 d-flex align-center">
            <v-btn color="primary" :disabled="!isValid || !form.file || state.submitting" @click="onSubmit">
              업로드
            </v-btn>

            <v-btn class="ml-3" text :disabled="state.submitting" @click="onReset">
              리셋
            </v-btn>
          </div>

          <!-- 성공 -->
          <v-alert v-if="state.result" type="success" class="mt-6" border="left">
            업로드 완료: <strong>{{ state.result.filename }}</strong>
            ({{ formatBytes(state.result.size) }})
            <div class="mt-2">
              <nuxt-link :to="`/assets/${state.result.id}`">모델 보기로 이동</nuxt-link>
            </div>
          </v-alert>

          <!-- 에러 -->
          <v-alert v-if="state.error" type="error" class="mt-6" border="left">
            {{ state.error }}
          </v-alert>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
// 표시용 유틸
import { formatBytes, getExt } from '@/utils/assets/getMetaData'
// 서비스(검증은 서비스에서 POLICY로 수행)
import { uploadModelWithAutoMeta, DEFAULT_POLICY } from '@/utils/assets/uploadFile'

// ✅ 이 페이지의 POLICY (페이지마다 다르게 정의 가능)
const POLICY = {
  ...DEFAULT_POLICY,
  // 필요 시 오버라이드:
  // allowedExts: ['glb', 'gltf'],          // 예: 이 페이지는 stl 금지
  // maxSizeBytes: 300 * 1024 * 1024        // 예: 관리자 페이지는 300MB 허용
}

export default {
  data() {

    return {
      isValid: false,
      form: { name: '', file: null, ext: '' },
      state: {
        submitting: false,
        result: null,
        error: ''
      }
    }
  },

  computed: {
    // UX를 위한 1차 뷰 검증(서비스 검증과 중복이지만 즉시 피드백 목적)
    fileRules() {
      const maxMB = Math.round(POLICY.maxSizeBytes / 1024 / 1024)

      return [
        v => !!v || '파일은 필수입니다',
        v => !v || POLICY.allowedExts.includes(this.getExt(v.name)) ||
          `허용되지 않는 확장자입니다 (${POLICY.allowedExts.map(x => '.' + x).join(', ')})`,
        v => !v || v.size <= POLICY.maxSizeBytes || `파일 용량이 너무 큽니다 (≤ ${maxMB}MB)`,
      ]
    }
  },

  methods: {
    // ----- 표시 유틸 -----
    formatBytes,
    getExt(name = '') {
      const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
      return m ? m[1] : ''
    },

    // ----- 이벤트 -----
    onFileChange(file) {
      this.state.error = ''
      this.state.result = null
      this.form.ext = file ? this.getExt(file.name) : ''
    },

    onReset() {
      this.$refs.form.reset()
      this.form.ext = ''
      this.state.submitting = false
      this.state.result = null
      this.state.error = ''
    },

    // ----- 제출: POLICY만 넘기면 서비스가 validate+메타추출+업로드 -----
    async onSubmit() {
      this.state.error = ''
      this.state.result = null

      const ok = await this.$refs.form.validate()
      if (!ok || !this.form.file) return

      const success = await this.$err.guard(async () => {
        this.state.submitting = true

        const json = await uploadModelWithAutoMeta(this.$api, {
          file: this.form.file,
          displayName: this.form.name,
          policy: POLICY       // ← 핵심: 페이지 정책만 전달
        })

        this.state.result = json
        this.state.submitting = false

        return true
      }, { context: { where: 'UploadPage.onSubmit', filename: this.form.file?.name } })

      if (!success) {
        this.state.submitting = false
        this.state.error = '업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      }
    }
  }
}
</script>
