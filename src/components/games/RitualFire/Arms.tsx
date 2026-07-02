import { useRef, useEffect } from 'react'; // <--- ¡AÑADIDO useEffect!
import { useFrame, useThree } from '@react-three/fiber';
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

  // Movimiento de balanceo natural (como si el personaje respirara)
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const breathe = Math.sin(t * 1.2) * 0.015; 
    const sway = Math.sin(t * 0.6) * 0.008;
    groupRef.current.position.y = -0.36 + breathe;
    groupRef.current.position.x = sway;
  });

  // ⚠️ Ajusta position, rotation y scale si tu GLB lo requiere
  return (
    <group ref={groupRef} position={[0, -0.36, -0.42]} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} scale={0.18} />
    </group>
  );
}