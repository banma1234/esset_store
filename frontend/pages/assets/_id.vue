<template>
  <!--
    WebGL(Three.js)은 브라우저 API가 필요하므로
    SSR 단계에서는 렌더링하지 않도록 <client-only>로 감쌉니다.
  -->
  <client-only>
    <div class="page">
      <header class="bar">
        <div class="left">
          <h1 class="title">3D 모델 뷰어</h1>
          <p class="desc">
            <!-- 항상 동일 URL을 사용(하드코딩) -->
            소스: <code class="code">{{ MODEL_URL }}</code>
          </p>
        </div>
      </header>

      <!-- Three.js가 붙을 컨테이너 -->
      <div ref="wrap" class="viewer"></div>
    </div>
  </client-only>
</template>

<script>
/**
 * /assets/_id.vue
 *
 * 요구사항:
 *  - 라우트 파라미터(_id)와 무관하게, 항상 특정 URL의 STL만 로드.
 *  - URL 검증 및 디코딩 로직 제거.
 *  - 이후 서버 연동 시, MODEL_URL만 서버에서 받은 값으로 교체하면 됨.
 */
export default {
  name: 'AssetViewerHardcoded',

  data() {
    return {
      // ↓ 여기만 나중에 서버에서 받은 URL로 교체하면 됩니다.
      MODEL_URL: '/cdn/assets/124wheel.stl',

      // Three.js 참조(정리용)
      renderer: null,
      camera: null,
      scene: null,
      controls: null,
      onResize: null
    };
  },

  mounted() {
    if (!process.client) return; // 클라이언트 전용
    this.initThree();
  },

  beforeDestroy() {
    // 리사이즈 리스너 해제
    window.removeEventListener('resize', this.onResize);

    // 렌더러/컨텍스트 정리(메모리 누수 방지)
    if (this.renderer) {
      try {
        this.renderer.dispose?.();
        this.renderer.forceContextLoss?.();
        this.renderer.domElement = null;
        this.renderer.context = null;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[renderer cleanup warning]', e);
      }
    }
    this.renderer = this.camera = this.scene = this.controls = null;
  },

  methods: {
    /**
     * Three.js 초기화 + STL 로드(하드코딩 URL)
     */
    async initThree() {
      // 동적 import: 번들 최소화 & 브라우저 전용
      const THREE = await import('three');
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');

      const el = this.$refs.wrap;

      // ----- Scene / Camera / Renderer -----
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(
        60,
        (el.clientWidth || 1) / (el.clientHeight || 1),
        0.1,
        50000
      );
      camera.position.set(100, 80, 120);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(el.clientWidth || 1, el.clientHeight || 1);
      el.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;

      // ----- Lights -----
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(50, 100, 50);
      scene.add(dir);

      // ----- STL Loading (하드코딩 URL 사용) -----
      const loader = new STLLoader();
      loader.load(
        this.MODEL_URL,
        (geometry) => {
          // 표면 노멀 계산 → 음영 품질 향상
          geometry.computeVertexNormals?.();

          // 메시 생성
          const material = new THREE.MeshPhongMaterial({ color: 0x8fb3ff, shininess: 40 });
          const mesh = new THREE.Mesh(geometry, material);

          // STL 축 보정(필요 시)
          mesh.rotation.x = -Math.PI / 2;

          // 원점 기준 정렬 후 씬 추가
          geometry.center();
          scene.add(mesh);

          // 카메라 프레이밍(모델 전체가 보이도록)
          const box = new THREE.Box3().setFromObject(mesh);
          const size = box.getSize(new THREE.Vector3()).length() || 100;
          const center = box.getCenter(new THREE.Vector3());
          controls.target.copy(center);
          camera.position.copy(center).add(new THREE.Vector3(size, size * 0.7, size));
          camera.near = Math.max(size / 1000, 0.1);
          camera.far = size * 10 + 1000;
          camera.updateProjectionMatrix();
        },
        undefined, // onProgress (옵션)
        (err) => {
          // eslint-disable-next-line no-console
          console.error('[STL load error]', err);
        }
      );

      // ----- Resize -----
      this.onResize = () => {
        const w = el.clientWidth || 1;
        const h = el.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', this.onResize);

      // ----- Render Loop -----
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 참조 저장
      this.renderer = renderer;
      this.camera = camera;
      this.scene = scene;
      this.controls = controls;
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 상단 바 */
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #222;
  background: #0f0f10;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #eaeaea;
}

.desc {
  margin: 4px 0 0;
  color: #9aa0a6;
  font-size: 12px;
}

.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  background: #1a1a1b;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 뷰어 영역 */
.viewer {
  width: 100%;
  flex: 1 1 auto;
  height: calc(100vh - 74px);
  /* 상단 바 높이 고려 */
  background: #111111;
}
</style>
