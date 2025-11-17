<template>
    <!--
    - 기본(height): clamp(300px, 75vw, 800px)
    - xl 이상일 때: clamp(300px, 50vw, 800px)
  -->
    <div class="
      tw-w-full
      tw-bg-gray-100
      tw-max-h-[80vh]
      tw-h-[clamp(300px,75vw,800px)]
      xl:tw-h-[clamp(300px,50vw,800px)]
    ">
        <div ref="wrap" class="tw-w-full tw-h-full"></div>
    </div>
</template>



<script>
export default {
    name: 'ModelViewer',

    props: {
        /**
         * @property {string} modelUrl
         * @description 로드할 glTF 모델의 URL
         */
        modelUrl: {
            type: String,
            required: true
        }
    },

    data() {
        return {
            /** @type {THREE.WebGLRenderer|null} */
            renderer: null,
            /** @type {THREE.PerspectiveCamera|null} */
            camera: null,
            /** @type {THREE.Scene|null} */
            scene: null,
            /** @type {any|null} OrbitControls 인스턴스 */
            controls: null,
            /** @type {Function|null} 리사이즈 핸들러 */
            onResize: null
        }
    },

    mounted() {
        if (!process.client) return
        this.initThree()
    },

    beforeDestroy() {
        // 리사이즈 리스너 해제
        if (this.onResize) {
            window.removeEventListener('resize', this.onResize)
        }

        // 렌더러/컨텍스트 정리(메모리 누수 방지)
        if (this.renderer) {
            try {
                this.renderer.dispose?.()
                this.renderer.forceContextLoss?.()
                this.renderer.domElement = null
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('[renderer cleanup warning]', e)
            }
        }

        this.renderer = null
        this.camera = null
        this.scene = null
        this.controls = null
        this.onResize = null
    },

    methods: {
        /**
         * @function initThree
         * @description Three.js 장면을 초기화하고 glTF 모델을 로드한 뒤 렌더링 루프를 시작한다.
         */
        async initThree() {
            const el = /** @type {HTMLElement} */ (this.$refs.wrap)
            if (!el) return

            // 동적 import: 브라우저 전용 + 번들 최소화
            const THREE = await import('three')
            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')

            // ----- Scene / Camera / Renderer -----
            const scene = new THREE.Scene()
            scene.background = new THREE.Color(0x1f1f1f)

            const camera = new THREE.PerspectiveCamera(
                60,
                (el.clientWidth || 1) / (el.clientHeight || 1),
                0.1,
                50000
            )
            camera.position.set(0, 2, 5)

            const renderer = new THREE.WebGLRenderer({ antialias: true })
            renderer.setPixelRatio(window.devicePixelRatio || 1)
            renderer.setSize(el.clientWidth || 1, el.clientHeight || 1)
            el.appendChild(renderer.domElement)

            const controls = new OrbitControls(camera, renderer.domElement)
            controls.enableDamping = true

            // ----- Lights -----
            scene.add(new THREE.AmbientLight(0xffffff, 0.6))
            const dir = new THREE.DirectionalLight(0xffffff, 0.8)
            dir.position.set(5, 10, 7)
            scene.add(dir)

            // 인스턴스/참조 저장
            this.renderer = renderer
            this.camera = camera
            this.scene = scene
            this.controls = controls

            // glTF 모델 로드
            await this.loadGltfModel(scene, camera, controls, GLTFLoader, THREE)

            // 리사이즈 핸들러 등록
            this.setupResizeHandler(renderer, camera, el)

            // 렌더 루프 시작
            this.startRenderLoop(renderer, scene, camera, controls)
        },

        /**
         * @function loadGltfModel
         * @description GLTFLoader를 사용해 glTF 모델을 로드하고 씬에 추가한다.
         * @param {THREE.Scene} scene - Three.js 씬 객체
         * @param {THREE.PerspectiveCamera} camera - 카메라
         * @param {any} controls - OrbitControls 인스턴스
         * @param {any} GLTFLoader - three/examples 의 GLTFLoader 모듈
         * @param {any} THREE - three 메인 모듈
         */
        async loadGltfModel(scene, camera, controls, GLTFLoader, THREE) {
            const loader = new GLTFLoader()

            return new Promise((resolve) => {
                loader.load(
                    this.modelUrl,
                    (gltf) => {
                        const root = gltf.scene || gltf.scenes?.[0]
                        if (!root) {
                            // eslint-disable-next-line no-console
                            console.error('[GLTF] scene 이 존재하지 않습니다.')
                            resolve()
                            return
                        }

                        scene.add(root)

                        // 모델 크기/중심 계산 후 카메라 프레이밍
                        const box = new THREE.Box3().setFromObject(root)
                        const size = box.getSize(new THREE.Vector3()).length() || 1
                        const center = box.getCenter(new THREE.Vector3())

                        controls.target.copy(center)

                        const distance = size * 1.0
                        camera.position.copy(center).add(new THREE.Vector3(distance, distance, distance))
                        camera.near = Math.max(size / 1000, 0.1)
                        camera.far = size * 10 + 1000
                        camera.updateProjectionMatrix()

                        resolve()
                    },
                    undefined,
                    (err) => {
                        // eslint-disable-next-line no-console
                        console.error('[GLTF load error]', err)
                        resolve()
                    }
                )
            })
        },

        /**
         * @function setupResizeHandler
         * @description 윈도우 리사이즈 시 카메라/렌더러 비율을 갱신한다.
         * @param {THREE.WebGLRenderer} renderer - 렌더러
         * @param {THREE.PerspectiveCamera} camera - 카메라
         * @param {HTMLElement} el - 렌더 대상 DOM 요소
         */
        setupResizeHandler(renderer, camera, el) {
            this.onResize = () => {
                const w = el.clientWidth || 1
                const h = el.clientHeight || 1
                camera.aspect = w / h
                camera.updateProjectionMatrix()
                renderer.setSize(w, h)
            }

            window.addEventListener('resize', this.onResize)
        },

        /**
         * @function startRenderLoop
         * @description requestAnimationFrame을 사용해 렌더링 루프를 시작한다.
         * @param {THREE.WebGLRenderer} renderer - 렌더러
         * @param {THREE.Scene} scene - 씬
         * @param {THREE.PerspectiveCamera} camera - 카메라
         * @param {any} controls - OrbitControls 인스턴스
         */
        startRenderLoop(renderer, scene, camera, controls) {
            const animate = () => {
                if (!renderer) return
                requestAnimationFrame(animate)
                controls?.update()
                renderer.render(scene, camera)
            }
            animate()
        }
    }
}
</script>
