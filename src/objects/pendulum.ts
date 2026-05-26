import * as THREE from 'three';
import { brushedSteel, chromeGlass, warmChrome, pivotMaterial, constraintRingMaterial } from '../render/materials';
import { PendulumParams, positions } from '../core/physics';

/**
 * Visual pendulum: pivot + two rods + two bobs.
 * The simulation lives in the XY plane (Y up), arranged as a 3D rig with
 * mechanical pivot housings so it reads as a real apparatus.
 */
export class PendulumObject {
  group = new THREE.Group();
  private rod1: THREE.Mesh;
  private rod2: THREE.Mesh;
  private bob1: THREE.Mesh;
  private bob2: THREE.Mesh;
  private pivot0: THREE.Group;
  private pivot1: THREE.Group;
  private massRadius1 = 0.11;
  private massRadius2 = 0.11;

  constructor(params: PendulumParams, opts: { ghost?: boolean } = {}) {
    const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 24, 1, false);
    rodGeo.translate(0, -0.5, 0); // anchor at top so scaling along Y extends downward
    const rodMat = opts.ghost
      ? new THREE.MeshPhysicalMaterial({
          color: 0x9a55ff,
          metalness: 0.4,
          roughness: 0.6,
          transparent: true,
          opacity: 0.45,
          emissive: 0x4a1a8a,
          emissiveIntensity: 0.6,
        })
      : brushedSteel();
    this.rod1 = new THREE.Mesh(rodGeo, rodMat);
    this.rod2 = new THREE.Mesh(rodGeo.clone(), rodMat);
    this.rod1.castShadow = this.rod2.castShadow = !opts.ghost;
    this.rod1.receiveShadow = this.rod2.receiveShadow = !opts.ghost;

    const bobGeo = new THREE.SphereGeometry(1, 48, 32);
    const bob1Mat = opts.ghost
      ? new THREE.MeshPhysicalMaterial({
          color: 0xc8a0ff,
          metalness: 0.5,
          roughness: 0.4,
          transparent: true,
          opacity: 0.5,
          emissive: 0x6a2acc,
          emissiveIntensity: 0.6,
        })
      : chromeGlass();
    const bob2Mat = opts.ghost
      ? new THREE.MeshPhysicalMaterial({
          color: 0xc8a0ff,
          metalness: 0.5,
          roughness: 0.4,
          transparent: true,
          opacity: 0.5,
          emissive: 0x6a2acc,
          emissiveIntensity: 0.6,
        })
      : warmChrome();

    this.bob1 = new THREE.Mesh(bobGeo, bob1Mat);
    this.bob2 = new THREE.Mesh(bobGeo, bob2Mat);
    this.bob1.castShadow = this.bob2.castShadow = !opts.ghost;
    this.bob1.receiveShadow = this.bob2.receiveShadow = !opts.ghost;

    this.pivot0 = makePivotHousing(0.075, opts.ghost === true);
    this.pivot1 = makePivotHousing(0.055, opts.ghost === true);

    this.group.add(this.pivot0, this.rod1, this.bob1, this.pivot1, this.rod2, this.bob2);

    this.updateMassScale(params);
    this.updateLengths(params);
  }

  updateMassScale(params: PendulumParams) {
    // Visual mass ~ cube-root of mass for plausible volume scaling
    const r1 = 0.09 + 0.06 * Math.cbrt(params.m1);
    const r2 = 0.09 + 0.06 * Math.cbrt(params.m2);
    this.massRadius1 = r1;
    this.massRadius2 = r2;
    this.bob1.scale.setScalar(r1);
    this.bob2.scale.setScalar(r2);
  }

  updateLengths(params: PendulumParams) {
    this.rod1.scale.y = params.L1;
    this.rod2.scale.y = params.L2;
  }

  update(state: [number, number, number, number], params: PendulumParams) {
    const { x1, y1, x2, y2 } = positions(state, params);
    // Pivot positions
    this.pivot0.position.set(0, 0, 0);

    // Rod1: anchored at origin, hangs along its local -Y. Rotate so the rod end lands on bob1.
    // theta is measured from downward vertical, CCW positive (matches physics convention).
    const angle1 = state[0];
    this.rod1.position.set(0, 0, 0);
    this.rod1.rotation.set(0, 0, angle1);

    this.bob1.position.set(x1, y1, 0);
    this.pivot1.position.set(x1, y1, 0);

    const angle2 = state[2];
    this.rod2.position.set(x1, y1, 0);
    this.rod2.rotation.set(0, 0, angle2);

    this.bob2.position.set(x2, y2, 0);
  }

  bob2Position(target: THREE.Vector3) {
    target.copy(this.bob2.position);
  }

  bob1Position(target: THREE.Vector3) {
    target.copy(this.bob1.position);
  }

  radii() {
    return { r1: this.massRadius1, r2: this.massRadius2 };
  }

  bob1Mesh() { return this.bob1; }
  bob2Mesh() { return this.bob2; }
}

function makePivotHousing(radius: number, ghost: boolean): THREE.Group {
  const g = new THREE.Group();
  if (ghost) return g;

  const housingGeo = new THREE.CylinderGeometry(radius, radius, radius * 0.9, 32);
  housingGeo.rotateX(Math.PI / 2);
  const housing = new THREE.Mesh(housingGeo, pivotMaterial());
  housing.castShadow = true;
  housing.receiveShadow = true;
  g.add(housing);

  // Constraint ring — subtle additive glow indicating the rotational joint
  const ringGeo = new THREE.TorusGeometry(radius * 1.25, radius * 0.06, 12, 64);
  ringGeo.rotateY(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, constraintRingMaterial());
  g.add(ring);

  return g;
}
