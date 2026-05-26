import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  VignetteTechnique,
  KernelSize,
} from 'postprocessing';

export interface PostFX {
  composer: EffectComposer;
  bloom: BloomEffect;
  setSize(w: number, h: number): void;
  render(dt: number): void;
}

export function createPostFX(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostFX {
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
  });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    intensity: 0.9,
    luminanceThreshold: 0.55,
    luminanceSmoothing: 0.25,
    kernelSize: KernelSize.LARGE,
    mipmapBlur: true,
    radius: 0.7,
  });

  const smaa = new SMAAEffect({ preset: SMAAPreset.HIGH });
  const vignette = new VignetteEffect({
    technique: VignetteTechnique.DEFAULT,
    offset: 0.32,
    darkness: 0.55,
  });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });

  composer.addPass(new EffectPass(camera, bloom, vignette, tone, smaa));

  return {
    composer,
    bloom,
    setSize(w, h) {
      composer.setSize(w, h);
    },
    render(dt) {
      composer.render(dt);
    },
  };
}
