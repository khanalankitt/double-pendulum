import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface SceneBundle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export function createScene(container: HTMLElement): SceneBundle {
  const isMobile = window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    powerPreference: 'high-performance',
    stencil: false,
  });
  const dprCap = isMobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.fog = new THREE.FogExp2(0x05070d, 0.045);

  // HDR-quality procedural environment (no external HDRI file required).
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new RoomEnvironment();
  const envTex = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;

  const aspect = container.clientWidth / container.clientHeight;
  // Wider FOV + farther dolly on portrait so the pendulum fits without clipping.
  const portrait = aspect < 1;
  const camera = new THREE.PerspectiveCamera(portrait ? 52 : 38, aspect, 0.05, 100);
  const dist = portrait ? 5.2 : 3.6;
  camera.position.set(dist * 0.55, 0.6, dist);
  camera.lookAt(0, -0.8, 0);

  return { renderer, scene, camera };
}
