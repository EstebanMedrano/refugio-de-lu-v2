import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TRAIL_LENGTH = 7;
const TRAIL_GAP = 0.045;
const DURATION = 2.2;

const START = new THREE.Vector3(-24, 19, -16);
const END = new THREE.Vector3(23, 12, -27);

function cometPoint(t: number, out: THREE.Vector3) {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  out.copy(START).lerp(END, clamped);
  out.y += Math.sin(clamped * Math.PI) * 2.4;
  return out;
}

export default function Comet({ active }: { active: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);
  const wasActive = useRef(false);
  const tmp = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (active && !wasActive.current) elapsedRef.current = 0;
    wasActive.current = active;

    const group = groupRef.current;
    if (!group) return;

    if (!active) {
      group.visible = false;
      return;
    }

    elapsedRef.current += delta;
    const t = elapsedRef.current / DURATION;
    group.visible = t <= 1;
    if (t > 1) return;

    group.children.forEach((child, i) => {
      const segT = t - i * TRAIL_GAP;
      cometPoint(segT, tmp.current);
      child.position.copy(tmp.current);
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const fade = THREE.MathUtils.clamp(1 - i / TRAIL_LENGTH, 0, 1);
      const edgeFade = segT < 0 || segT > 1 ? 0 : 1;
      mat.opacity = fade * edgeFade * 0.9;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {Array.from({ length: TRAIL_LENGTH }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.16 - i * 0.016, 8, 8]} />
          <meshBasicMaterial
            color={i === 0 ? '#ffffff' : '#bfe0ff'}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}