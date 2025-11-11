/**
 * @file thumb.routes.js
 * @description Three.js 미니 뷰어로 모델 로드 → 200x200 JPEG 캡처 → S3 업로드
 *
 * @requires puppeteer, @aws-sdk/client-s3
 */

const express = require('express');
const router = express.Router();
const { newPage } = require('../services/thumbnail.service');
const { putThumbnail } = require('../services/assets.service');

/**
 * @typedef {Object} GenerateThumbBody
 * @property {string=} fileBase - 썸네일 파일명 베이스(미지정 시 타임스탬프)
 */

/**
 * @route POST /api/v1/thumb/generate-test
 * @summary 하드코딩된 모델을 로드해 200x200 JPEG 썸네일을 생성하고 /assets/thumbnail 경로로 업로드한다.
 */
router.post('/api/v1/thumb/generate-test', async (req, res, next) => {
  /** @type {GenerateThumbBody} */
  const body = req.body || {};

  // ✅ 하드코딩된 3D 모델 URL (원하시면 교체)
  // CORS 이슈 발생중
  const MODEL_URL = 'https://choco-image-server.cdn.ntruss.com/assets/124wheel.stl';

  // 업로드 키 구성: /assets/thumbnail/<base>.jpg
  const base = (body.fileBase && String(body.fileBase).trim()) || String(Date.now());
  const key = `assets/thumbnail/${base}.jpg`;

  let page;
  try {
    // 1) 200x200 페이지 생성
    page = await newPage({ width: 200, height: 200, scale: 1 });

    // 2) 미니 뷰어 HTML (data URL) 로드
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Mini Viewer</title>
  <meta http-equiv="Content-Security-Policy" content="default-src * blob: data: 'unsafe-inline' 'unsafe-eval'">
  <style>
    html,body { margin:0; padding:0; width:100%; height:100%; background:#ffffff; }
    #app { width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <!-- Three.js & STLLoader (CDN) -->
  <script src="https://unpkg.com/three@0.158.0/build/three.min.js"></script>
  <script src="https://unpkg.com/three@0.158.0/examples/js/loaders/STLLoader.js"></script>
  <script>
  (function(){
    const MODEL_URL = ${JSON.stringify(MODEL_URL)};
    const W = 200, H = 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor('#ffffff', 1);
    document.getElementById('app').appendChild(renderer.domElement);

    // 라이트(간단)
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1,1,1);
    scene.add(dir);

    // 모델 로더
    const loader = new THREE.STLLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(MODEL_URL, function(geometry){
      // 머티리얼(단색)
      const mat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.1, roughness: 0.8 });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = false; mesh.receiveShadow = false;
      scene.add(mesh);

      // 프레이밍
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox;
      const size = new THREE.Vector3().subVectors(bb.max, bb.min);
      const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);

      // 지오메트리 중심 맞춤
      geometry.translate(-center.x, -center.y, -center.z);

      // 카메라 거리 설정(FOV 45 기준)
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const dist = (maxDim/2) / Math.tan(fov/2) * 1.4; // 여백 40%
      camera.position.set(dist, dist, dist);
      camera.lookAt(0,0,0);

      // 약간의 기울기(보기 좋게)
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.5, 0));
      mesh.applyQuaternion(q);

      // 렌더 1회
      renderer.render(scene, camera);
      window.__READY__ = true;
    }, function(){}, function(err){
      console.error('LOAD_ERROR', err);
      window.__ERROR__ = String(err);
    });
  })();
  </script>
</body>
</html>
    `.trim();

    await page.goto(`data:text/html,${encodeURIComponent(html)}`, { waitUntil: 'load' });

    // 3) 렌더 완료 대기 (최대 15초)
    const ready = await page.waitForFunction('window.__READY__ === true', { timeout: 15000 }).catch(() => null);
    if (!ready) {
      const errText = await page.evaluate('window.__ERROR__ || "RENDER_TIMEOUT"');
      throw new Error(`Thumbnail render failed: ${errText}`);
    }

    // 4) JPEG 캡처 (200x200)
    const jpegBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 80, // 0~100
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    });

    // 5) S3 업로드 (/assets/thumbnail/<base>.jpg)
    await putThumbnail(key, jpegBuffer);

    // 6) 완료
    return res.json({
      ok: true,
      message: '썸네일 생성 및 업로드 완료',
      data: { key },
    });
  } catch (err) {
    return next(err);
  } finally {
    // 페이지는 닫아 브라우저 리소스를 회수(브라우저는 싱글톤 유지)
    try {
      if (page) await page.close();
    } catch (_) {}
  }
});

module.exports = router;
