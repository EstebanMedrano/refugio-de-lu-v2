import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';

const SparkleMaterial = shaderMaterial(
  { uTime: 0, uProgress: 0, uColor: new THREE.Color('#7dffa0') },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3  uColor;
    varying vec2  vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered) * 2.0;

      float ring = smoothstep(uProgress - 0.18, uProgress, dist)
                 - smoothstep(uProgress, uProgress + 0.04, dist);

      float n = hash(floor(vUv * 18.0) + floor(uTime * 6.0));
      float sparkle = step(0.93, n) * (1.0 - uProgress);

      float alpha = clamp(ring * 1.4 + sparkle * 0.8, 0.0, 1.0) * (1.0 - uProgress * 0.7);
      if (dist > 1.0) alpha = 0.0;

      gl_FragColor = vec4(uColor, alpha);
    }
  `,
);

extend({ SparkleMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    sparkleMaterial: ThreeElements['shaderMaterial'] & {
      uTime?: number;
      uProgress?: number;
      uColor?: THREE.Color | string;
    };
  }
}

export function SnapSparkle() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matRef = useRef<any>(null);
  const [alive, setAlive] = useState(true);
  const start = useRef(performance.now());

  useFrame((state) => {
    if (!matRef.current) return;
    const elapsed = (performance.now() - start.current) / 1000;
    const progress = Math.min(elapsed / 0.65, 1);
    matRef.current.uProgress = progress;
    matRef.current.uTime = state.clock.elapsedTime;
    if (progress >= 1 && alive) setAlive(false);
  });

  if (!alive) return null;

  return (
    <mesh position={[0, 0, 0.015]} renderOrder={5}>
      <planeGeometry args={[0.55, 0.55]} />
      <sparkleMaterial ref={matRef} transparent depthWrite={false} />
    </mesh>
  );
}