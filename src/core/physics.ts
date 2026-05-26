/**
 * Double pendulum dynamics — full nonlinear Lagrangian equations of motion.
 *
 * State vector: [theta1, omega1, theta2, omega2]
 *   theta_i measured from downward vertical (positive = CCW in pivot plane).
 *
 * Equations derived from L = T - V with two point masses on rigid massless rods.
 * No small-angle approximations.
 */

export interface PendulumParams {
  m1: number;
  m2: number;
  L1: number;
  L2: number;
  g: number;
  damping: number;
}

export type State = [number, number, number, number];

export function derivatives(s: State, p: PendulumParams, out: State): State {
  const [t1, w1, t2, w2] = s;
  const { m1, m2, L1, L2, g, damping } = p;

  // Canonical form uses Δ = θ₁ − θ₂. sin(Δ) and cos(Δ) below.
  const delta = t1 - t2;
  const sD = Math.sin(delta);
  const cD = Math.cos(delta);
  const s1 = Math.sin(t1);

  const denomCommon = 2 * m1 + m2 - m2 * Math.cos(2 * delta);
  const denom1 = L1 * denomCommon;
  const denom2 = L2 * denomCommon;

  // θ̈₁ numerator
  const num1 =
    -g * (2 * m1 + m2) * s1
    - m2 * g * Math.sin(t1 - 2 * t2)
    - 2 * sD * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * cD);

  // θ̈₂ numerator
  const num2 =
    2 * sD * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * L2 * m2 * cD);

  const a1 = num1 / denom1 - damping * w1;
  const a2 = num2 / denom2 - damping * w2;

  out[0] = w1;
  out[1] = a1;
  out[2] = w2;
  out[3] = a2;
  return out;
}

const k1: State = [0, 0, 0, 0];
const k2: State = [0, 0, 0, 0];
const k3: State = [0, 0, 0, 0];
const k4: State = [0, 0, 0, 0];
const tmp: State = [0, 0, 0, 0];

export function rk4Step(s: State, p: PendulumParams, dt: number): void {
  derivatives(s, p, k1);

  tmp[0] = s[0] + 0.5 * dt * k1[0];
  tmp[1] = s[1] + 0.5 * dt * k1[1];
  tmp[2] = s[2] + 0.5 * dt * k1[2];
  tmp[3] = s[3] + 0.5 * dt * k1[3];
  derivatives(tmp, p, k2);

  tmp[0] = s[0] + 0.5 * dt * k2[0];
  tmp[1] = s[1] + 0.5 * dt * k2[1];
  tmp[2] = s[2] + 0.5 * dt * k2[2];
  tmp[3] = s[3] + 0.5 * dt * k2[3];
  derivatives(tmp, p, k3);

  tmp[0] = s[0] + dt * k3[0];
  tmp[1] = s[1] + dt * k3[1];
  tmp[2] = s[2] + dt * k3[2];
  tmp[3] = s[3] + dt * k3[3];
  derivatives(tmp, p, k4);

  const c = dt / 6;
  s[0] += c * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
  s[1] += c * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
  s[2] += c * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  s[3] += c * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
}

export function totalEnergy(s: State, p: PendulumParams): { ke: number; pe: number; total: number } {
  const [t1, w1, t2, w2] = s;
  const { m1, m2, L1, L2, g } = p;

  // Cartesian velocities of the two bobs (origin at pivot, +y down for the PE term).
  const v1x = L1 * w1 * Math.cos(t1);
  const v1y = L1 * w1 * Math.sin(t1);
  const v2x = v1x + L2 * w2 * Math.cos(t2);
  const v2y = v1y + L2 * w2 * Math.sin(t2);

  const ke = 0.5 * m1 * (v1x * v1x + v1y * v1y) + 0.5 * m2 * (v2x * v2x + v2y * v2y);

  // PE = -mgy with y_i = -L_i cos(theta_i) (downward from pivot).
  const y1 = -L1 * Math.cos(t1);
  const y2 = y1 - L2 * Math.cos(t2);
  const pe = m1 * g * y1 + m2 * g * y2;

  return { ke, pe, total: ke + pe };
}

export function positions(s: State, p: PendulumParams) {
  const [t1, , t2] = s;
  const x1 = p.L1 * Math.sin(t1);
  const y1 = -p.L1 * Math.cos(t1);
  const x2 = x1 + p.L2 * Math.sin(t2);
  const y2 = y1 - p.L2 * Math.cos(t2);
  return { x1, y1, x2, y2 };
}
