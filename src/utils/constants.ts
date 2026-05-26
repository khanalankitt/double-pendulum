export const DEFAULT_GRAVITY = 9.81;

export const DEFAULT_PARAMS = {
  m1: 1.0,
  m2: 1.0,
  L1: 1.0,
  L2: 1.0,
  g: DEFAULT_GRAVITY,
  damping: 0.0,
  theta1: (2 * Math.PI) / 3,
  theta2: (5 * Math.PI) / 6,
  omega1: 0.0,
  omega2: 0.0,
};

export const PHYSICS_DT = 1 / 480;
export const MAX_SUBSTEPS = 32;

export const TRAIL_MAX_POINTS = 2048;
export const TRAIL_MIN_DIST = 0.002;

export const COLORS = {
  rod: 0x9aa3ad,
  mass1: 0xc8d4e0,
  mass2: 0xffb070,
  pivot: 0x4a5260,
  emissive1: 0x223344,
  emissive2: 0x331100,
  trailSlow: 0x4a90ff,
  trailFast: 0xff5a1f,
  ghost: 0x9a55ff,
};
