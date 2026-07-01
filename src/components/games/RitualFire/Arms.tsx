import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber'; // Eliminamos useFrame
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function Arms() {
  const { camera } = useThree();
  const { scene }  = useGLTF('/assets/3D/arms.glb');
  const groupRef   = useRef<THREE.Group>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    camera.add(g);
    return () => { camera.remove(g); };
  }, [camera]);

  // ⚠️ Ajusta position, rotation y scale según tu GLB específico
  return (
    <group ref={groupRef} position={[0, -0.36, -0.42]} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} scale={0.18} />
    </group>
  );
}