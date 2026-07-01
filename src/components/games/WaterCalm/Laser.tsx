// Laser.tsx — Láser con punta brillante y tamaño ajustado a la mano
import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Stage, LakeWorld } from './WaterCalm';
import { MAX_BEAMS, BEAM_LIFETIME } from './lakeConstants';

interface Props {
  world: React.MutableRefObject<LakeWorld>;
  stage: Stage;
}

const IDLE_LASER_POS = new THREE.Vector3(1.8, 0.76, -5.5);
const IDLE_LASER_ROT = new THREE.Euler(0, Math.PI * 0.12, Math.PI * 0.08);
const HAND_OFFSET = new THREE.Vector3(0.25, -0.25, -0.45);

export default function Laser({ world, stage }: Props) {
  const { camera } = useThree();
  const propRef = useRef<THREE.Group>(null);
  const beamRefs = useRef<(THREE.Mesh | null)[]>([]);
  const upAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    const w = world.current;
    if (stage === 'seated' || stage === 'lasering') {
      const handWorld = HAND_OFFSET.clone().applyQuaternion(camera.quaternion);
      handWorld.add(camera.position);
      w.handPosition.copy(handWorld);

      if (propRef.current) {
        if (stage === 'lasering') {
          propRef.current.position.lerp(handWorld, 0.25);
          propRef.current.quaternion.slerp(camera.quaternion, 0.25);
        } else {
          propRef.current.position.lerp(IDLE_LASER_POS, 0.08);
          const idleQuat = new THREE.Quaternion().setFromEuler(IDLE_LASER_ROT);
          propRef.current.quaternion.slerp(idleQuat, 0.08);
        }
      }
    }

    const now = performance.now();
    for (let i = 0; i < MAX_BEAMS; i++) {
      const slot = w.beams[i];
      const mesh = beamRefs.current[i];
      if (!mesh) continue;

      if (!slot.active) { mesh.visible = false; continue; }

      const age = (now - slot.startTime) / 1000;
      if (age > BEAM_LIFETIME) { slot.active = false; mesh.visible = false; continue; }

      mesh.visible = true;
      const dir = slot.to.clone().sub(slot.from);
      const len = Math.max(dir.length(), 0.01);
      const mid = slot.from.clone().add(slot.to).multiplyScalar(0.5);

      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(upAxis, dir.normalize());
      mesh.scale.set(1, len, 1);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.copy(slot.color);
      mat.opacity = Math.min(1, Math.pow(1 - age / BEAM_LIFETIME, 3)) * 0.95;
    }
  });

  return (
    <>
      <group ref={propRef} position={IDLE_LASER_POS.toArray() as [number, number, number]} scale={0.6}>
        {/* Cuerpo */}
        <mesh>
          <cylinderGeometry args={[0.045, 0.055, 0.52, 10]} />
          <meshStandardMaterial color="#2a3445" metalness={0.65} roughness={0.28} />
        </mesh>
        {/* Grip */}
        <mesh position={[0, -0.16, 0.06]}>
          <boxGeometry args={[0.06, 0.18, 0.10]} />
          <meshStandardMaterial color="#1a2030" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Cañón emisor (Cambiado a color cian neón) */}
        <mesh position={[0, 0.30, 0]}>
          <coneGeometry args={[0.045, 0.14, 10]} />
          <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={8.0} />
        </mesh>
        <pointLight color="#00ffcc" intensity={3.0} distance={8.0} position={[0, 0.36, 0]} />
      </group>

      {Array.from({ length: MAX_BEAMS }).map((_, i) => (
        <mesh key={i} ref={(el) => { beamRefs.current[i] = el; }} visible={false}>
          <cylinderGeometry args={[0.03, 0.08, 1, 6, 1, true]} />
          <meshBasicMaterial color="#00ffcc" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}