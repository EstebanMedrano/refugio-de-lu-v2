import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense } from 'react';
import * as THREE from 'three';
import TitoRunner from './TitoRunner';

const REVEAL_DURATION = 3.5;

interface SplashSceneProps {
  onRevealed: () => void;
}

export default function SplashScene({ onRevealed }: SplashSceneProps) {
  const orbRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const drift = useRef({ x: 0, z: 0, vx: 0.35, vz: 0.22 });
  const revealProgress = useRef(0);
  const calledRef = useRef(false);

  useFrame((_, delta) => {
    const d = drift.current;
    d.x += d.vx * delta;
    d.z += d.vz * delta;
    if (d.x > 0.8 || d.x < -0.8) d.vx *= -1;
    if (d.z > 0.4 || d.z < -0.4) d.vz *= -1;

    orbRef.current?.position.set(d.x, 0.4, d.z);
    lightRef.current?.position.set(d.x, 0.4, d.z);

    if (revealProgress.current < 1) {
      revealProgress.current = Math.min(
        1,
        revealProgress.current + delta / REVEAL_DURATION
      );
      if (revealProgress.current >= 1 && !calledRef.current) {
        calledRef.current = true;
        onRevealed();
      }
    }

    const p = revealProgress.current;
    if (lightRef.current) lightRef.current.intensity = p * 9;
    if (orbRef.current) {
      (orbRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.6 + p * 3;
    }
  });

  return (
    <>
      <color attach="background" args={['#020208']} />
      <fog attach="fog" args={['#020208', 2, 16]} />
      <ambientLight intensity={0.02} />

      <Stars
        radius={60}
        depth={40}
        count={2500}
        factor={2}
        saturation={0}
        fade
        speed={0.4}
      />

      {/* Orbe de luz */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial
          color="#aee9ff"
          emissive="#aee9ff"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        intensity={0}
        distance={9}
        decay={2}
        color="#dff3ff"
      />

      <Suspense fallback={null}>
        <TitoRunner />
      </Suspense>

      <EffectComposer>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.4}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}