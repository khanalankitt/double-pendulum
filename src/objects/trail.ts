import * as THREE from 'three';
import { TRAIL_MAX_POINTS, TRAIL_MIN_DIST, COLORS } from '../utils/constants';

const trailVert = /* glsl */ `
  attribute float aAge;
  attribute float aSpeed;
  varying float vAge;
  varying float vSpeed;
  void main() {
    vAge = aAge;
    vSpeed = aSpeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFrag = /* glsl */ `
  precision highp float;
  uniform vec3 uColorSlow;
  uniform vec3 uColorFast;
  uniform float uMaxSpeed;
  uniform float uHeadAge;
  varying float vAge;
  varying float vSpeed;
  void main() {
    float t = clamp(vSpeed / uMaxSpeed, 0.0, 1.0);
    t = pow(t, 0.65);
    vec3 col = mix(uColorSlow, uColorFast, t);
    // fade with age relative to the current head
    float relAge = clamp(uHeadAge - vAge, 0.0, 1.0);
    float fade = pow(1.0 - relAge, 1.8);
    gl_FragColor = vec4(col * (0.6 + 0.9 * t), fade);
  }
`;

/**
 * GPU-resident velocity-colored fading trail. Uses a circular buffer of points
 * drawn as a LineStrip — geometry is allocated once; only a slice is updated
 * per frame. No garbage on the hot path.
 */
export class Trail {
  line: THREE.Line;
  private positions: Float32Array;
  private ages: Float32Array;
  private speeds: Float32Array;
  private count = 0;
  private head = 0;
  private headAge = 0;
  private lastPos = new THREE.Vector3(NaN, NaN, NaN);
  private posAttr: THREE.BufferAttribute;
  private ageAttr: THREE.BufferAttribute;
  private speedAttr: THREE.BufferAttribute;
  private uniforms: { [k: string]: { value: any } };

  constructor() {
    const N = TRAIL_MAX_POINTS;
    this.positions = new Float32Array(N * 3);
    this.ages = new Float32Array(N);
    this.speeds = new Float32Array(N);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.ageAttr = new THREE.BufferAttribute(this.ages, 1);
    this.speedAttr = new THREE.BufferAttribute(this.speeds, 1);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.ageAttr.setUsage(THREE.DynamicDrawUsage);
    this.speedAttr.setUsage(THREE.DynamicDrawUsage);

    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aAge', this.ageAttr);
    geo.setAttribute('aSpeed', this.speedAttr);
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);

    this.uniforms = {
      uColorSlow: { value: new THREE.Color(COLORS.trailSlow) },
      uColorFast: { value: new THREE.Color(COLORS.trailFast) },
      uMaxSpeed: { value: 8.0 },
      uHeadAge: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: trailVert,
      fragmentShader: trailFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.line = new THREE.Line(geo, mat);
    this.line.frustumCulled = false;
  }

  setMaxSpeed(v: number) {
    this.uniforms.uMaxSpeed.value = v;
  }

  setColors(slow: number, fast: number) {
    this.uniforms.uColorSlow.value.setHex(slow);
    this.uniforms.uColorFast.value.setHex(fast);
  }

  clear() {
    this.count = 0;
    this.head = 0;
    this.headAge = 0;
    this.lastPos.set(NaN, NaN, NaN);
    (this.line.geometry as THREE.BufferGeometry).setDrawRange(0, 0);
  }

  push(p: THREE.Vector3, speed: number) {
    if (Number.isFinite(this.lastPos.x) && this.lastPos.distanceTo(p) < TRAIL_MIN_DIST) {
      return;
    }
    this.lastPos.copy(p);
    this.headAge += 1;

    const N = TRAIL_MAX_POINTS;
    const i = this.head;
    this.positions[i * 3] = p.x;
    this.positions[i * 3 + 1] = p.y;
    this.positions[i * 3 + 2] = p.z;
    this.ages[i] = this.headAge;
    this.speeds[i] = speed;

    this.head = (this.head + 1) % N;
    if (this.count < N) this.count++;

    this.uniforms.uHeadAge.value = this.headAge;

    // Rewrite the active slice in chronological order so LineStrip draws a connected curve.
    this.repack();
  }

  private repack() {
    const N = TRAIL_MAX_POINTS;
    const n = this.count;
    const start = (this.head - n + N) % N;
    // Two-segment copy from ring buffer to a chronological prefix of the attribute arrays.
    if (start + n <= N) {
      this.posAttr.array.set(this.positions.subarray(start * 3, (start + n) * 3), 0);
      this.ageAttr.array.set(this.ages.subarray(start, start + n), 0);
      this.speedAttr.array.set(this.speeds.subarray(start, start + n), 0);
    } else {
      const first = N - start;
      this.posAttr.array.set(this.positions.subarray(start * 3, N * 3), 0);
      this.posAttr.array.set(this.positions.subarray(0, (n - first) * 3), first * 3);
      this.ageAttr.array.set(this.ages.subarray(start, N), 0);
      this.ageAttr.array.set(this.ages.subarray(0, n - first), first);
      this.speedAttr.array.set(this.speeds.subarray(start, N), 0);
      this.speedAttr.array.set(this.speeds.subarray(0, n - first), first);
    }
    this.posAttr.needsUpdate = true;
    this.ageAttr.needsUpdate = true;
    this.speedAttr.needsUpdate = true;
    (this.line.geometry as THREE.BufferGeometry).setDrawRange(0, n);
  }

  // Mirror normalization of recorded ages so the head-age scale doesn't explode after long runs.
  rescaleAgesIfNeeded() {
    if (this.headAge < 1e6) return;
    const base = this.headAge - this.count;
    for (let i = 0; i < this.count; i++) {
      this.ages[i] -= base;
    }
    this.headAge -= base;
    this.uniforms.uHeadAge.value = this.headAge;
    this.ageAttr.needsUpdate = true;
  }
}
