import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fireVertexShader, fireFragmentShader } from './fireShader';

const FLAME_PLANES = 5;
const EMBER_COUNT = 55;

function createFireMaterial(seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uColorCore: { value: new THREE.Color('#fff3c4') },
      uColorMid: { value: new THREE.Color('#ff8c1a') },
      uColorEdge: { value: new THREE.Color('#7a1500') },
    },
    vertexShader: fireVertexShader,
    fragmentShader: fireFragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

function Logs() {
  const logConfig: Array<{
    pos: [number, number, number];
    rot: [number, number, number];
    len: number;
    color: string;
  }> = [
    { pos: [-0.35, 0.12, 0.1], rot: [0, 0.5, 1.25], len: 0.9, color: '#4a2c0f' },
    { pos: [0.35, 0.12, -0.05], rot: [0, -0.4, -1.2], len: 0.85, color: '#5c3814' },
    { pos: [0, 0.08, 0.3], rot: [0, 1.6, 1.45], len: 1.0, color: '#3d2208' },
  ];

  return (
    <group>
      {logConfig.map((log, i) => (
        <mesh key={i} position={log.pos} rotation={log.rot}>
          <cylinderGeometry args={[0.07, 0.09, log.len, 8]} />
          <meshStandardMaterial color={log.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function FlamePlanes({ boost }: { boost: boolean }) {
  const materials = useMemo(
    () => Array.from({ length: FLAME_PLANES }, (_, i) => createFireMaterial(i * 1.37)),
    []
  );

  useFrame((_, delta) => {
    materials.forEach((mat) => {
      mat.uniforms.uTime.value += delta * (boost ? 1.6 : 1);
    });
  });

  useEffect(() => {
    return () => {
      materials.forEach((mat) => mat.dispose());
    };
  }, [materials]);

  const scale = boost ? 1.25 : 1;

  return (
    <group position={[0, 0.05, 0]} scale={[scale, scale, scale]}>
      {materials.map((mat, i) => (
        <mesh key={i} rotation={[0, (i / FLAME_PLANES) * Math.PI * 2, 0]} position={[0, 0.45, 0]}>
          <planeGeometry args={[0.7, 1.25]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Embers({ boost }: { boost: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocitiesRef = useRef<Float32Array>(new Float32Array(EMBER_COUNT));
  const lifeRef = useRef<Float32Array>(new Float32Array(EMBER_COUNT));

  const positions = useMemo(() => {
    const arr = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.5;
      arr[i * 3 + 1] = Math.random() * 0.6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      velocitiesRef.current[i] = 0.25 + Math.random() * 0.35;
      lifeRef.current[i] = Math.random();
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const geom = pointsRef.current?.geometry;
    if (!geom) return;
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    const velocities = velocitiesRef.current;
    const life = lifeRef.current;
    const speedMul = boost ? 2.2 : 1;

    for (let i = 0; i < EMBER_COUNT; i++) {
      const y = posAttr.getY(i) + velocities[i] * speedMul * delta;
      life[i] += delta * 0.4 * speedMul;

      if (y > 1.6 || life[i] > 1) {
        posAttr.setXYZ(i, (Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4);
        life[i] = 0;
      } else {
        const drift = Math.sin(life[i] * 6 + i) * 0.15 * delta;
        posAttr.setXYZ(i, posAttr.getX(i) + drift, y, posAttr.getZ(i));
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} position={[0, 0.2, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#ffb454"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

interface CampfireProps {
  boost?: boolean;
}

export default function Campfire({ boost = false }: CampfireProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!lightRef.current) return;
    const t = state.clock.elapsedTime;
    const base = boost ? 3.6 : 2.3;
    const flicker = base + Math.sin(t * 8.5) * 0.2 + Math.sin(t * 21.0) * 0.12 + Math.random() * 0.06;
    lightRef.current.intensity = flicker;
  });

  return (
    <group>
      <pointLight
        ref={lightRef}
        position={[0, 0.6, 0]}
        color="#ff8a3d"
        distance={boost ? 9 : 6}
        decay={1.8}
        intensity={2.3}
      />
      <Logs />
      <FlamePlanes boost={boost} />
      <Embers boost={boost} />
    </group>
  );
}