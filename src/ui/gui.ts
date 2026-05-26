import GUI from 'lil-gui';
import { DEFAULT_PARAMS } from '../utils/constants';

export interface GUIState {
  m1: number; m2: number; L1: number; L2: number; g: number; damping: number;
  energyImpulse: number;
  chaosStrength: number;
  trailMaxSpeed: number;
  bloom: number;
  exposure: number;
  cinematicCam: boolean;
}

export function createGUI(opts: {
  onChangeMass: () => void;
  onChangeLength: () => void;
  onApplyImpulse: () => void;
  onReset: () => void;
}): { gui: GUI; state: GUIState } {
  const state: GUIState = {
    m1: DEFAULT_PARAMS.m1,
    m2: DEFAULT_PARAMS.m2,
    L1: DEFAULT_PARAMS.L1,
    L2: DEFAULT_PARAMS.L2,
    g: DEFAULT_PARAMS.g,
    damping: DEFAULT_PARAMS.damping,
    energyImpulse: 0,
    chaosStrength: 0.0,
    trailMaxSpeed: 8.0,
    bloom: 0.9,
    exposure: 1.05,
    cinematicCam: false,
  };

  const isNarrow = window.matchMedia('(max-width: 720px)').matches;
  const gui = new GUI({ title: 'Controls', width: isNarrow ? Math.min(window.innerWidth - 24, 360) : 280 });
  gui.domElement.style.position = 'fixed';
  if (isNarrow) {
    gui.domElement.style.top = '64px';
    gui.domElement.style.left = '12px';
    gui.domElement.style.right = '12px';
    gui.close();
  } else {
    gui.domElement.style.top = '110px';
    gui.domElement.style.right = '18px';
  }

  const physics = gui.addFolder('Physics');
  physics.add(state, 'm1', 0.1, 5, 0.05).name('Mass 1 (kg)').onChange(opts.onChangeMass);
  physics.add(state, 'm2', 0.1, 5, 0.05).name('Mass 2 (kg)').onChange(opts.onChangeMass);
  physics.add(state, 'L1', 0.3, 2.0, 0.01).name('Length 1 (m)').onChange(opts.onChangeLength);
  physics.add(state, 'L2', 0.3, 2.0, 0.01).name('Length 2 (m)').onChange(opts.onChangeLength);
  physics.add(state, 'g', 0, 24, 0.01).name('Gravity (m/s²)');
  physics.add(state, 'damping', 0, 1.0, 0.001).name('Damping');

  const interact = gui.addFolder('Interaction');
  interact.add(state, 'energyImpulse', 0, 10, 0.1).name('Impulse (rad/s)');
  const impulseBtn = { apply: opts.onApplyImpulse };
  interact.add(impulseBtn, 'apply').name('▸ Inject Energy');
  interact.add(state, 'chaosStrength', 0, 0.05, 0.001).name('Chaos noise');
  const resetBtn = { reset: opts.onReset };
  interact.add(resetBtn, 'reset').name('↺ Reset');

  const visual = gui.addFolder('Visuals');
  visual.add(state, 'trailMaxSpeed', 1, 20, 0.1).name('Trail max speed');
  visual.add(state, 'bloom', 0, 2.5, 0.01).name('Bloom intensity');
  visual.add(state, 'exposure', 0.3, 2.0, 0.01).name('Exposure');
  visual.add(state, 'cinematicCam').name('Cinematic camera');

  physics.close();
  interact.close();
  visual.close();

  return { gui, state };
}
