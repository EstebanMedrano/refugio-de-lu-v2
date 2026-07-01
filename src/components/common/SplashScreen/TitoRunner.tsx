import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { AnimationAction } from 'three';

// ⚠️ mayúscula en 3D, igual que tu carpeta en public/assets/3D/
useGLTF.preload('/assets/3D/tito.glb');

function pickAction(
  actions: Record<string, AnimationAction | null>,
  preferred: string[]
): AnimationAction | null {
  const names = Object.keys(actions);
  console.log('🐕 Animaciones de Tito disponibles:', names);
  for (const want of preferred) {
    const match = names.find((n) => n.toLowerCase().includes(want));
    if (match) return actions[match];
  }
  return names.length ? actions[names[0]] : null;
}

export default function TitoRunner() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF('/assets/3D/tito.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const run = pickAction(actions, ['run', 'gallop', 'walk', 'trot', 'idle']);
    run?.reset().fadeIn(0.3).play();
    return () => { run?.fadeOut(0.3); };
  }, [actions]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const x = Math.sin(t * 0.8) * 1.1;
    group.current.position.set(x, 0, 1.1);
    const goingRight = Math.cos(t * 0.8) > 0;
    const targetRotY = goingRight ? Math.PI / 2 : -Math.PI / 2;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      targetRotY,
      0.1
    );
  });

  return (
    <group ref={group} scale={0.5}>
      <primitive object={scene} />
    </group>
  );
}