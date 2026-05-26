import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PendulumObject } from '../objects/pendulum';
import { PendulumParams, State } from '../core/physics';

/**
 * Mouse/touch dragging: project the pointer onto the pendulum's XY motion plane
 * and resolve theta1/theta2 from the dragged bob's world position.
 * Velocities reset to zero while dragged; on release, an impulse is applied
 * from recent pointer motion so the user can throw the system.
 */
export class DragControls {
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private hit = new THREE.Vector3();
  private lastHit = new THREE.Vector3();
  private lastTime = 0;
  private dragging: null | 1 | 2 = null;
  private released: ((dragged: 1 | 2) => void) | null = null;
  enabled = true;

  constructor(
    private dom: HTMLElement,
    private camera: THREE.PerspectiveCamera,
    private orbit: OrbitControls,
    private pendulum: PendulumObject,
    private state: State,
    private params: () => PendulumParams,
  ) {
    dom.addEventListener('pointerdown', this.onDown);
    dom.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  onRelease(fn: (dragged: 1 | 2) => void) {
    this.released = fn;
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this.onDown);
    this.dom.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }

  isDragging() { return this.dragging !== null; }

  private updateNDC(ev: PointerEvent) {
    const rect = this.dom.getBoundingClientRect();
    this.ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onDown = (ev: PointerEvent) => {
    if (!this.enabled) return;
    if (ev.button !== 0) return;
    this.updateNDC(ev);
    this.raycaster.setFromCamera(this.ndc, this.camera);

    const hits = this.raycaster.intersectObjects([this.pendulum.bob1Mesh(), this.pendulum.bob2Mesh()], false);
    if (hits.length === 0) return;
    const target = hits[0].object === this.pendulum.bob2Mesh() ? 2 : 1;
    this.dragging = target;
    this.orbit.enabled = false;
    this.dom.setPointerCapture(ev.pointerId);

    if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
      this.lastHit.copy(this.hit);
      this.lastTime = performance.now();
    }
    this.applyDrag();
  };

  private onMove = (ev: PointerEvent) => {
    if (this.dragging === null) return;
    this.updateNDC(ev);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
      this.applyDrag();
    }
  };

  private applyDrag() {
    const p = this.params();
    // Snap velocities to zero while holding
    this.state[1] = 0;
    this.state[3] = 0;
    if (this.dragging === 1) {
      const a = Math.atan2(this.hit.x, -this.hit.y);
      this.state[0] = a;
    } else {
      // Solve theta2 by placing bob2 at hit; bob1 follows constraint from theta1.
      // Two-step: first determine theta1 so that bob1 is on the line from pivot toward hit
      // at distance L1 (geometric IK for a 2-link planar chain anchored at origin).
      const x = this.hit.x;
      const y = this.hit.y;
      const r = Math.hypot(x, y);
      const L1 = p.L1;
      const L2 = p.L2;
      const rMax = L1 + L2 - 1e-4;
      const rMin = Math.abs(L1 - L2) + 1e-4;
      const rc = Math.max(rMin, Math.min(rMax, r));
      const ux = x / (r || 1);
      const uy = y / (r || 1);
      const sx = ux * rc;
      const sy = uy * rc;

      // Law of cosines: angle at pivot between bob2 direction and bob1 direction.
      const cosA = (L1 * L1 + rc * rc - L2 * L2) / (2 * L1 * rc);
      const A = Math.acos(Math.max(-1, Math.min(1, cosA)));
      // Direction from pivot to target (measured from downward vertical, CCW positive)
      const baseAngle = Math.atan2(sx, -sy);
      // Choose elbow on the same side as previous bob1 position
      const prevBob1Side = Math.sign(
        Math.sin(this.state[0]) * Math.cos(baseAngle) - (-Math.cos(this.state[0])) * Math.sin(baseAngle),
      );
      const sign = prevBob1Side === 0 ? 1 : prevBob1Side;
      const theta1 = baseAngle + sign * A;
      const x1 = L1 * Math.sin(theta1);
      const y1 = -L1 * Math.cos(theta1);
      const theta2 = Math.atan2(sx - x1, -(sy - y1));
      this.state[0] = theta1;
      this.state[2] = theta2;
    }
  }

  private onUp = (ev: PointerEvent) => {
    if (this.dragging === null) return;
    const dragged = this.dragging;
    this.dragging = null;
    this.orbit.enabled = true;
    try { this.dom.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }

    // Pointer was moving while we released — convert recent screen velocity into angular kick
    const now = performance.now();
    const dt = Math.max(0.016, (now - this.lastTime) / 1000);
    const dx = (this.hit.x - this.lastHit.x) / dt;
    const dy = (this.hit.y - this.lastHit.y) / dt;
    const p = this.params();
    if (dragged === 1) {
      // Tangential component at bob1 -> omega1
      const tx = Math.cos(this.state[0]);
      const ty = Math.sin(this.state[0]);
      const vt = dx * tx + dy * ty;
      this.state[1] = vt / p.L1;
    } else {
      const tx2 = Math.cos(this.state[2]);
      const ty2 = Math.sin(this.state[2]);
      const vt = dx * tx2 + dy * ty2;
      this.state[3] = vt / p.L2;
    }
    if (this.released) this.released(dragged);
  };
}
