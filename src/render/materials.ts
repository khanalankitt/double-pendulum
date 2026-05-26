import * as THREE from 'three';
import { COLORS } from '../utils/constants';

export function brushedSteel(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: COLORS.rod,
    metalness: 1.0,
    roughness: 0.32,
    anisotropy: 0.65,
    anisotropyRotation: Math.PI / 2,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.1,
  });
}

export function chromeGlass(emissive = COLORS.emissive1, color = COLORS.mass1): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.95,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    emissive,
    emissiveIntensity: 0.6,
    ior: 1.45,
  });
}

export function warmChrome(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: COLORS.mass2,
    metalness: 0.92,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.7,
    emissive: COLORS.emissive2,
    emissiveIntensity: 0.9,
    ior: 1.5,
  });
}

export function pivotMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: COLORS.pivot,
    metalness: 0.9,
    roughness: 0.45,
    envMapIntensity: 0.9,
  });
}

export function constraintRingMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x6fb6ff,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
