<template>
  <!-- WebGL은 브라우저 전용이므로 client-only -->
  <client-only>
    <div class="tw-flex tw-flex-col tw-w-full tw-bg-black">
      <!-- 상단 바 -->
      <header
        class="tw-flex tw-items-center tw-justify-between tw-py-3 tw-px-4 tw-border-b tw-border-gray-800 tw-bg-[#0f0f10]">
        <div class="tw-flex tw-flex-col">
          <h1 class="tw-text-lg tw-font-bold tw-text-gray-100">
            3D 모델 뷰어
          </h1>
          <p class="tw-mt-1 tw-text-xs tw-text-gray-400">
            소스:
            <code class="tw-font-mono tw-bg-[#1a1a1b] tw-px-1.5 tw-py-0.5 tw-rounded">
              {{ MODEL_URL }}
            </code>
          </p>
        </div>
      </header>

      <!-- 뷰어 영역 -->
      <main class="tw-w-full tw-flex tw-items-stretch tw-justify-center tw-bg-black tw-p-4">
        <!-- 높이는 ModelViewer 내부에서 h-[800px] + max-h-[80vh] 로 관리 -->
        <ModelViewer :model-url="MODEL_URL" />
      </main>


    </div>
  </client-only>
</template>

<script>
import ModelViewer from '~/components/3Dviewer.vue'

/**
 * /assets/_id.vue
 *
 * 요구사항:
 *  - 라우트 파라미터(_id)와 무관하게, 항상 특정 URL의 glTF만 로드.
 *  - 이후 서버 연동 시, MODEL_URL만 서버에서 받은 값으로 교체하면 됨.
 */
export default {
  name: 'AssetViewerHardcoded',
  components: { ModelViewer },

  data() {
    return {
      /**
       * @property {string} MODEL_URL
       * @description 현재는 하드코딩된 glTF URL (추후 서버 연동 시 교체)
       */
      MODEL_URL: '/cdn/assets/final/wheel_ferari/1.0.0/wheel_ferari.gltf'
    }
  }
}
</script>
