import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DURATION     = 3.8;
const TRAIL_LENGTH = 22;
const TRAIL_GAP    = 0.05;

const COMET_START = new THREE.Vector3(-11, 21, -4);
const COMET_END   = new THREE.Vector3( 11, 13, -12);

function cometAt(t: number, out: THREE.Vector3): THREE.Vector3 {
  const c = THREE.MathUtils.clamp(t, 0, 1);
  out.copy(COMET_START).lerp(COMET_END, c);
  out.y += Math.sin(c * Math.PI) * 5;
  return out;
}

export default function Comet({ active }: { active: boolean }) {
  const groupRef  = useRef<THREE.Group>(null);
  const lightRef  = useRef<THREE.PointLight>(null);
  const elapsed   = useRef(0);
  const wasActive = useRef(false);
  const tmp       = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (active && !wasActive.current) elapsed.current = 0;
    wasActive.current = active;

    const group = groupRef.current;
    const light = lightRef.current;

    if (!active) {
      if (group) group.visible = false;
      if (light) light.intensity = THREE.MathUtils.lerp(light.intensity, 0, 0.07);
      return;
    }

    elapsed.current += delta;
    const t = elapsed.current / DURATION;

    // Luz espectacular: rampa muy rápida → pico brillante → caída lenta
    if (light) {
      const ramp  = Math.sin(THREE.MathUtils.clamp(t / 0.22, 0, 1) * Math.PI * 0.5);
      const decay = THREE.MathUtils.clamp(1 - (t - 0.22) / 0.65, 0, 1);
      light.intensity = ramp * decay * 95; // 95 → ilumina todo el bosque
      cometAt(t, tmp.current);
      light.position.copy(tmp.current);
    }

    if (!group) return;
    group.visible = t <= 1.05;
    if (t > 1.05) return;

    group.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat  = mesh.material as THREE.MeshBasicMaterial;
      const segT = t - i * TRAIL_GAP;
      cometAt(segT, tmp.current);
      mesh.position.copy(tmp.current);

      const fade    = Math.max(0, 1 - i / TRAIL_LENGTH);
      const inRange = segT >= 0 && segT <= 1.05;
      mat.opacity   = inRange ? fade * 0.97 : 0;

      // Cabeza grande (3.8), cola que se achica
      const s = i === 0 ? 3.8 : Math.max(0.22, 3.8 - i * 0.17);
      mesh.scale.setScalar(s);
    });
  });

  return (
    <>
      <group ref={groupRef} visible={false}>
        {Array.from({ length: TRAIL_LENGTH }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.9, 10, 8]} />
            <meshBasicMaterial
              color={
                i === 0 ? '#ffffff'
                : i <  3 ? '#f8fdff'
                : i <  8 ? '#c8e8ff'
                :           '#88c0ff'
              }
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              fog={false}  // ← FIX CLAVE: sin esto la niebla borra el cometa a distancia
            />
          </mesh>
        ))}
      </group>

      {/* Luz que ilumina el bosque entero — como si fuera de día por 2 segundos */}
      <pointLight
        ref={lightRef}
        color="#d4eeff"
        distance={135}
        decay={0.65}
        intensity={0}
        castShadow={false}
      />
    </>
  );
}