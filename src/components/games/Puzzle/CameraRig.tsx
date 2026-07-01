import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Phase } from './Puzzle';

const FIXED: Partial<Record<Phase, { pos: THREE.Vector3; look: THREE.Vector3 }>> = {
  idle:     { pos: new THREE.Vector3(0, 1.6, 4.6),    look: new THREE.Vector3(0, 1.4, -1) },
  calling:  { pos: new THREE.Vector3(3.6, 1.8, 2.5),  look: new THREE.Vector3(4.3, 0.4, 0.8) },
  // intro: dynamic (follows dog)
  breaking: { pos: new THREE.Vector3(0.3, 1.65, -1.4),  look: new THREE.Vector3(0, 1.58, -4.45) },
  puzzle:   { pos: new THREE.Vector3(2.6, 1.95, 0.5),   look: new THREE.Vector3(0.5, 1.3, -3.9) },
  complete: { pos: new THREE.Vector3(0.6, 1.75, -0.8),  look: new THREE.Vector3(0, 1.5, -4.45) },
};

interface Props {
  phase: Phase;
  dogPosRef: React.MutableRefObject<THREE.Vector3>;
}

export default function CameraRig({ phase, dogPosRef }: Props) {
  const { camera } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 1.4, -1));

  useFrame((_, dt) => {
    // idle handled by OrbitControls below
    if (phase === 'idle') return;

    if (phase === 'intro') {
      // Follow dog from third-person perspective
      const dp = dogPosRef.current;
      const targetCamPos = new THREE.Vector3(
        dp.x * 0.3 - 0.5,  // slightly to the side
        dp.y + 1.65,         // above
        dp.z + 2.6           // behind (dog runs toward -z)
      );
      const ease = Math.min(0.13, 5 * dt);
      camera.position.lerp(targetCamPos, ease);
      lookTarget.current.lerp(
        new THREE.Vector3(dp.x * 0.35, dp.y + 0.25, dp.z - 0.2),
        ease
      );
      camera.lookAt(lookTarget.current);
      return;
    }

    const cfg = FIXED[phase];
    if (!cfg) return;
    const ease = Math.min(0.09, 3.8 * dt);
    camera.position.lerp(cfg.pos, ease);
    lookTarget.current.lerp(cfg.look, ease);
    camera.lookAt(lookTarget.current);
  });

  // OrbitControls ONLY in idle phase (no conflict with piece dragging)
  if (phase !== 'idle') return null;

  return (
    <OrbitControls
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.08}
      target={new THREE.Vector3(0, 1.4, -1)}
      minAzimuthAngle={-0.65}
      maxAzimuthAngle={0.65}
      minPolarAngle={Math.PI / 2 - 0.28}
      maxPolarAngle={Math.PI / 2 + 0.2}
    />
  );
}