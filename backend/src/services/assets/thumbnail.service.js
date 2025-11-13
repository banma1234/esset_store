const puppeteer = require('puppeteer');

let _browser = null;

/** @returns {Promise<import('puppeteer').Browser>} */
async function getBrowser() {
  if (_browser?.isConnected()) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-angle=d3d11',
    ],
  });
  return _browser;
}

/** @returns {Promise<import('puppeteer').Page>} */
async function newPage({ width = 200, height = 200, scale = 1 } = {}) {
  const p = await (await getBrowser()).newPage();
  await p.setViewport({ width, height, deviceScaleFactor: scale });
  p.on('console', (m) => console.log('[thumb/console]', m.type(), m.text()));
  p.on('pageerror', (e) => console.error('[thumb/pageerror]', e));
  p.on('requestfailed', (r) => console.error('[thumb/requestfailed]', r.url(), r.failure()?.errorText));
  return p;
}

/**
 * @typedef {Object} RenderSize
 * @property {number} width
 * @property {number} height
 */

/**
 * @function renderGltfToJpeg
 * @param {string} gltfStr  glTF JSON 문자열(Embedded)
 * @param {RenderSize} size
 * @returns {Promise<Buffer>}
 */
async function renderGltfToJpeg(gltfStr, { width, height }) {
  if (typeof gltfStr !== 'string' || gltfStr.length < 10) {
    throw new Error('INVALID_GLTF_JSON: input is not a non-empty string');
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('INVALID_SIZE');
  }

  let page;
  try {
    page = await newPage({ width, height });
    await page.setContent(`<html><head><meta charset="utf-8"></head>
      <body style="margin:0;background:#fff"><div id="app"></div></body></html>`);

    await page.addScriptTag({
      type: 'module',
      content: `
        import * as THREE_MOD from 'https://esm.sh/three@0.158.0';
        import { GLTFLoader } from 'https://esm.sh/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
        window.THREE = THREE_MOD;
        window.GLTFLoader = GLTFLoader;
      `,
    });
    await page.waitForFunction(() => typeof window.THREE !== 'undefined' && typeof window.GLTFLoader !== 'undefined', {
      timeout: 15000,
    });

    // 브리지 함수: 서비스에서 받은 문자열을 그대로 반환
    await page.exposeFunction('getGltfJson', () => gltfStr);
    await page.exposeFunction('getRenderConfig', () => ({ W: width, H: height }));

    const ok = await page.evaluate(async () => {
      const { THREE, GLTFLoader } = window;
      const { W, H } = await window.getRenderConfig();

      // 어떤 형태로 오든 문자열로 강제(coerce)
      const payload = await window.getGltfJson();
      let jsonStr;

      if (typeof payload === 'string') {
        jsonStr = payload;
      } else if (payload && payload.byteLength !== undefined) {
        // ArrayBuffer 또는 TypedArray
        const buf = payload instanceof ArrayBuffer ? payload : payload.buffer;
        jsonStr = new TextDecoder('utf-8').decode(new Uint8Array(buf));
      } else {
        // 그 외(객체 등)
        try {
          jsonStr = JSON.stringify(payload);
        } catch (e) {
          throw new Error('INVALID_GLTF_JSON: cannot stringify payload');
        }
      }

      // 진단 로그 (필요 시 제거 가능)
      console.log('[gltf/debug] typeof payload =', typeof payload);
      console.log('[gltf/debug] typeof jsonStr =', typeof jsonStr, 'len=', jsonStr?.length);
      console.log('[gltf/debug] head =', jsonStr?.slice?.(0, 60) || '(no slice)');

      if (!jsonStr || jsonStr.length < 10) throw new Error('INVALID_GLTF_JSON: empty after coerce');

      // 사전 검증: 실제로 JSON인지 확인 (여기서 실패하면 GLTFLoader까지 가지 않음)
      try {
        JSON.parse(jsonStr);
      } catch (e) {
        throw new Error('INVALID_GLTF_JSON: JSON.parse failed');
      }

      // === 렌더러 생성 ===
      const canvas = document.createElement('canvas');
      document.getElementById('app').appendChild(canvas);
      const ctxOpts = { alpha: false, antialias: true, depth: true, stencil: false, preserveDrawingBuffer: true };

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, ...ctxOpts });
        renderer.getContext();
      } catch (e) {
        if (THREE.WebGL1Renderer) {
          renderer = new THREE.WebGL1Renderer({ canvas, ...ctxOpts });
          renderer.getContext();
        } else {
          throw e;
        }
      }
      renderer.setSize(W, H);
      renderer.setPixelRatio(1);
      renderer.setClearColor('#ffffff', 1);

      // === 씬 구성 ===
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 10000);
      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(1, 1, 1);
      scene.add(dir);

      // === glTF 파싱 ===
      const loader = new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        try {
          loader.parse(jsonStr, '', resolve, reject);
        } catch (e) {
          reject(e);
        }
      });

      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error('GLTF_NO_SCENE');
      scene.add(root);

      // === 프레이밍 ===
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (!isFinite(size.x + size.y + size.z)) throw new Error('GLTF_EMPTY_GEOMETRY');
      root.position.sub(center);

      const fov = camera.fov * (Math.PI / 180);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = (maxDim / 2 / Math.tan(fov / 2)) * 0.9;
      camera.position.set(dist, dist, dist);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      return true;
    });

    if (!ok) throw new Error('RENDER_FAILED');

    const jpeg = await page.screenshot({
      type: 'jpeg',
      quality: 80,
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    });
    return jpeg;
  } finally {
    try {
      if (page) await page.close();
    } catch {}
  }
}

module.exports = { getBrowser, newPage, renderGltfToJpeg };
