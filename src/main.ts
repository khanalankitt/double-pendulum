import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { createScene } from './render/scene';
import { setupLighting } from './render/lighting';
import { createPostFX } from './render/postfx';
import { PendulumObject } from './objects/pendulum';
import { Trail } from './objects/trail';
import { PendulumParams, State, positions, totalEnergy } from './core/physics';
import { FixedStepIntegrator } from './core/integrator';
import { DEFAULT_PARAMS, COLORS } from './utils/constants';
import { DragControls } from './ui/dragControls';
import { createGUI } from './ui/gui';
import { Graphs } from './ui/graphs';
import { clamp } from './utils/math';

const appEl = document.getElementById('app')!;
const loaderEl = document.getElementById('loader')!;

const { renderer, scene, camera } = createScene(appEl);
const lights = setupLighting(scene);
const postfx = createPostFX(renderer, scene, camera);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.target.set(0, -0.9, 0);
orbit.minDistance = 1.5;
orbit.maxDistance = 12;
orbit.maxPolarAngle = Math.PI * 0.95;
orbit.update();

// Backdrop disk so the pendulum has a subtle stage to read against
const backdropGeo = new THREE.CircleGeometry(8, 64);
const backdropMat = new THREE.MeshStandardMaterial({
  color: 0x0a1018,
  roughness: 0.95,
  metalness: 0.05,
  side: THREE.DoubleSide,
});
const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
backdrop.position.set(0, -0.9, -2.5);
backdrop.receiveShadow = true;
scene.add(backdrop);

// ---------- physics state ----------
const params: PendulumParams = {
  m1: DEFAULT_PARAMS.m1,
  m2: DEFAULT_PARAMS.m2,
  L1: DEFAULT_PARAMS.L1,
  L2: DEFAULT_PARAMS.L2,
  g: DEFAULT_PARAMS.g,
  damping: DEFAULT_PARAMS.damping,
};
const initialState: State = [
  DEFAULT_PARAMS.theta1,
  DEFAULT_PARAMS.omega1,
  DEFAULT_PARAMS.theta2,
  DEFAULT_PARAMS.omega2,
];
const state: State = [...initialState];
const ghostState: State = [
  initialState[0] + 1e-5,
  initialState[1],
  initialState[2],
  initialState[3],
];
let ghostEnabled = false;
let chaosEnabled = false;
let paused = false;
let cinematicCam = false;

const integrator = new FixedStepIntegrator();
const ghostIntegrator = new FixedStepIntegrator();

const pendulum = new PendulumObject(params);
scene.add(pendulum.group);

const ghost = new PendulumObject(params, { ghost: true });
ghost.group.visible = false;
scene.add(ghost.group);

const trail = new Trail();
scene.add(trail.line);

const ghostTrail = new Trail();
ghostTrail.setColors(0x9a55ff, 0xff55c8);
ghostTrail.line.visible = false;
scene.add(ghostTrail.line);

// ---------- GUI ----------
const { gui, state: guiState } = createGUI({
  onChangeMass: () => {
    params.m1 = guiState.m1;
    params.m2 = guiState.m2;
    pendulum.updateMassScale(params);
    ghost.updateMassScale(params);
  },
  onChangeLength: () => {
    params.L1 = guiState.L1;
    params.L2 = guiState.L2;
    pendulum.updateLengths(params);
    ghost.updateLengths(params);
    trail.clear();
    ghostTrail.clear();
  },
  onApplyImpulse: () => {
    const k = guiState.energyImpulse;
    if (k === 0) return;
    state[1] += (Math.random() - 0.5) * 2 * k;
    state[3] += (Math.random() - 0.5) * 2 * k;
  },
  onReset: () => doReset(),
});

function doReset() {
  state[0] = initialState[0];
  state[1] = initialState[1];
  state[2] = initialState[2];
  state[3] = initialState[3];
  ghostState[0] = initialState[0] + 1e-5;
  ghostState[1] = initialState[1];
  ghostState[2] = initialState[2];
  ghostState[3] = initialState[3];
  integrator.reset();
  ghostIntegrator.reset();
  trail.clear();
  ghostTrail.clear();
}

// ---------- Drag controls ----------
const drag = new DragControls(renderer.domElement, camera, orbit, pendulum, state, () => params);
drag.onRelease(() => {
  // Resync ghost so the divergence demo restarts from the new pose
  ghostState[0] = state[0] + 1e-5;
  ghostState[1] = state[1];
  ghostState[2] = state[2];
  ghostState[3] = state[3];
  trail.clear();
  ghostTrail.clear();
});

// ---------- UI buttons ----------
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnChaos = document.getElementById('btn-chaos') as HTMLButtonElement;
const btnCam = document.getElementById('btn-cam') as HTMLButtonElement;
const btnGraphs = document.getElementById('btn-graphs') as HTMLButtonElement;
const btnGhost = document.getElementById('btn-ghost') as HTMLButtonElement;

function setToggle(btn: HTMLButtonElement, on: boolean) {
  btn.classList.toggle('active', on);
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
}

btnPause.addEventListener('click', () => {
  paused = !paused;
  btnPause.textContent = paused ? 'Resume' : 'Pause';
  setToggle(btnPause, paused);
});
btnReset.addEventListener('click', doReset);
btnChaos.addEventListener('click', () => {
  chaosEnabled = !chaosEnabled;
  setToggle(btnChaos, chaosEnabled);
});
btnCam.addEventListener('click', () => {
  cinematicCam = !cinematicCam;
  guiState.cinematicCam = cinematicCam;
  setToggle(btnCam, cinematicCam);
  orbit.enabled = !cinematicCam;
});
btnGhost.addEventListener('click', () => {
  ghostEnabled = !ghostEnabled;
  ghost.group.visible = ghostEnabled;
  ghostTrail.line.visible = ghostEnabled;
  setToggle(btnGhost, ghostEnabled);
  if (ghostEnabled) {
    ghostState[0] = state[0] + 1e-5;
    ghostState[1] = state[1];
    ghostState[2] = state[2];
    ghostState[3] = state[3];
    ghostTrail.clear();
  }
});

// ---------- Graphs ----------
const graphHost = document.getElementById('graphs')!;
const graphs = new Graphs(graphHost);
btnGraphs.addEventListener('click', () => {
  const next = !graphs.visible;
  graphs.setVisible(next);
  setToggle(btnGraphs, next);
  graphHost.setAttribute('aria-hidden', next ? 'false' : 'true');
});

// ---------- resize ----------
function onResize() {
  const w = appEl.clientWidth;
  const h = appEl.clientHeight;
  renderer.setSize(w, h, false);
  postfx.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  // Re-tune FOV on orientation change so the pendulum stays in frame.
  camera.fov = aspect < 1 ? 52 : 38;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

// ---------- main loop ----------
const clock = new THREE.Clock();
let camTheta = 0;
const tmpVec = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 1 / 30);
  const elapsed = clock.elapsedTime;

  // Chaos noise: tiny random angular accelerations between physics steps
  if (chaosEnabled) {
    const k = guiState.chaosStrength;
    state[1] += (Math.random() - 0.5) * k;
    state[3] += (Math.random() - 0.5) * k;
  }

  if (!paused && !drag.isDragging()) {
    integrator.step(state, params, dt);
    if (ghostEnabled) ghostIntegrator.step(ghostState, params, dt);
  }

  // ----- visual update -----
  pendulum.update(state, params);
  if (ghostEnabled) ghost.update(ghostState, params);

  // Trail: push bob2 with its instantaneous tangential speed
  const { x2, y2 } = positions(state, params);
  tmpVec.set(x2, y2, 0);
  // Speed of bob2 in plane = |dv2/dt| using the analytic Cartesian velocity
  const v2x = params.L1 * state[1] * Math.cos(state[0]) + params.L2 * state[3] * Math.cos(state[2]);
  const v2y = params.L1 * state[1] * Math.sin(state[0]) + params.L2 * state[3] * Math.sin(state[2]);
  const speed2 = Math.hypot(v2x, v2y);
  trail.setMaxSpeed(guiState.trailMaxSpeed);
  trail.push(tmpVec, speed2);
  trail.rescaleAgesIfNeeded();

  if (ghostEnabled) {
    const gp = positions(ghostState, params);
    tmpVec.set(gp.x2, gp.y2, 0);
    const gv2x = params.L1 * ghostState[1] * Math.cos(ghostState[0]) + params.L2 * ghostState[3] * Math.cos(ghostState[2]);
    const gv2y = params.L1 * ghostState[1] * Math.sin(ghostState[0]) + params.L2 * ghostState[3] * Math.sin(ghostState[2]);
    ghostTrail.setMaxSpeed(guiState.trailMaxSpeed);
    ghostTrail.push(tmpVec, Math.hypot(gv2x, gv2y));
    ghostTrail.rescaleAgesIfNeeded();
  }

  // Accent lights follow the bobs for animated highlights
  pendulum.bob1Position(tmpVec);
  lights.accent2.position.copy(tmpVec).add(new THREE.Vector3(0, 0, 0.3));
  pendulum.bob2Position(tmpVec);
  lights.accent1.position.copy(tmpVec).add(new THREE.Vector3(0, 0, 0.3));

  // Kinetic-energy-driven subtle camera shake
  const energies = totalEnergy(state, params);
  const kePerMass = energies.ke / (params.m1 + params.m2);
  const shake = clamp(kePerMass * 0.0015, 0, 0.012);

  // Cinematic auto-camera
  if (cinematicCam) {
    camTheta += dt * 0.18;
    const r = 3.6 + Math.sin(elapsed * 0.13) * 0.4 + clamp(kePerMass * 0.05, 0, 0.6);
    camera.position.set(Math.cos(camTheta) * r, 0.6 + Math.sin(elapsed * 0.21) * 0.15, Math.sin(camTheta) * r);
    camera.lookAt(orbit.target);
  } else {
    orbit.update();
  }
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }

  // Postprocessing live tweaks
  postfx.bloom.intensity = guiState.bloom;
  renderer.toneMappingExposure = guiState.exposure;

  postfx.render(dt);

  graphs.push(state[0], state[2], state[1], state[3], energies.ke, energies.pe);
  graphs.draw();
}

onResize();
requestAnimationFrame(() => {
  loaderEl.classList.add('hidden');
  setTimeout(() => loaderEl.remove(), 700);
  animate();
});

// Suppress orbit pan with right mouse during drag — keep mapping simple
orbit.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};
// One finger rotates the camera (only if it didn't grab a bob — DragControls disables orbit during drag),
// two-finger pinch zooms + pans.
orbit.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};

void COLORS;

// ---------- Service worker (production only) ----------
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failures are non-fatal; the app works without SW.
    });
  });
}
