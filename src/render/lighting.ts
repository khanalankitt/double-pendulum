import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene): {
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  fill: THREE.HemisphereLight;
  accent1: THREE.PointLight;
  accent2: THREE.PointLight;
} {
  // Subtle ambient/hemisphere fill
  const fill = new THREE.HemisphereLight(0x99bbff, 0x1a1822, 0.35);
  scene.add(fill);

  // Key directional light — soft shadows. Smaller shadow map on mobile.
  const isMobile = window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
  const key = new THREE.DirectionalLight(0xfff2dd, 2.4);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  const shadowRes = isMobile ? 1024 : 2048;
  key.shadow.mapSize.set(shadowRes, shadowRes);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);

  // Cool rim light from behind for silhouette
  const rim = new THREE.DirectionalLight(0x6fb6ff, 1.2);
  rim.position.set(-3, 1.5, -4);
  scene.add(rim);

  // Two warm accent points to give the bobs life when they swing through
  const accent1 = new THREE.PointLight(0xffb070, 4.0, 5.0, 1.8);
  accent1.position.set(0, -0.5, 0.5);
  scene.add(accent1);

  const accent2 = new THREE.PointLight(0x6fb6ff, 3.0, 4.0, 2.0);
  accent2.position.set(0, -1.2, 0.5);
  scene.add(accent2);

  // Faint ground shadow catcher
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.0;
  ground.receiveShadow = true;
  scene.add(ground);

  return { key, rim, fill, accent1, accent2 };
}
