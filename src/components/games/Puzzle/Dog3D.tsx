import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { DogType } from './Puzzle';

// ── Cambia a true cuando tengas los modelos en public/assets/3D/ ──────────
export const USE_GLTF_MODELS = true;

const PATHS: Record<DogType, string> = {
  tito: '/assets/3D/tito.glb',  // nota: 3D con D mayúscula
  lia:  '/assets/3D/lia.glb',
};

export interface Dog3DProps {
  dogType:     DogType;
  callId:      number;
  doorPos:     THREE.Vector3;
  framePos:    THREE.Vector3;
  watchPos:    THREE.Vector3;
  onImpact:    () => void;
  positionRef: React.MutableRefObject<THREE.Vector3>;
}

type Sub = 'hidden' | 'running' | 'jumping' | 'impact' | 'watching';
const RUN_SPEED = 4.5;
const JUMP_DUR  = 0.44;
const HIT_DUR   = 0.38;

export default function Dog3D(props: Dog3DProps) {
  return USE_GLTF_MODELS ? <GLTFDog {...props} /> : <ProceduralDog {...props} />;
}

// ── GLTF Dog ──────────────────────────────────────────────────────────────
function GLTFDog({ dogType, callId, doorPos, framePos, watchPos, onImpact, positionRef }: Dog3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(PATHS[dogType]);
  const { actions, names }    = useAnimations(animations, groupRef);

  const sub     = useRef<Sub>('hidden');
  const subTime = useRef(0);
  const fired   = useRef(false);
  const active  = useRef<string | null>(null);

  // Log animations for debugging
  useEffect(() => {
    console.log(`[${dogType}] animations:`, names);
  }, [names, dogType]);

  const play = (re: RegExp) => {
    const clip = names.find(n => re.test(n)) ?? names[0] ?? null;
    if (!clip || clip === active.current) return;
    if (active.current) actions[active.current]?.fadeOut(0.2);
    actions[clip]?.reset().fadeIn(0.2).play();
    active.current = clip;
  };

  useEffect(() => {
    if (callId === 0 || !groupRef.current) return;
    const g = groupRef.current;
    g.visible = true;
    g.scale.setScalar(0.9);
    g.position.copy(doorPos);
    g.rotation.y = Math.atan2(framePos.x - doorPos.x, framePos.z - doorPos.z);
    sub.current   = 'running';
    subTime.current = 0;
    fired.current   = false;
    play(/run|walk|trot|gallop|sprint/i);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId]);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g || sub.current === 'hidden') return;
    subTime.current += dt;
    positionRef.current.copy(g.position);

    if (sub.current === 'running') {
      const target = new THREE.Vector3(framePos.x, g.position.y, framePos.z + 1.1);
      const dir = target.sub(g.position);
      const dist = dir.length();
      if (dist > 0.08) {
        dir.normalize();
        g.position.addScaledVector(dir, RUN_SPEED * dt);
        g.rotation.y = Math.atan2(dir.x, dir.z);
      }
      g.position.y = Math.abs(Math.sin(subTime.current * 10)) * 0.05;
      if (dist < 0.65) { sub.current = 'jumping'; subTime.current = 0; play(/jump|leap/i); }

    } else if (sub.current === 'jumping') {
      const p = Math.min(subTime.current / JUMP_DUR, 1);
      g.position.z += dt * 2.8;
      g.position.y = Math.sin(p * Math.PI) * 1.0;
      g.rotation.x = p * 0.28;
      if (subTime.current > JUMP_DUR) {
        sub.current = 'impact'; subTime.current = 0;
        if (!fired.current) { fired.current = true; onImpact(); }
      }

    } else if (sub.current === 'impact') {
      const p = Math.min(subTime.current / HIT_DUR, 1);
      const sq = 1 - Math.sin(p * Math.PI) * 0.25;
      g.scale.set(1.2 * 0.9, sq * 0.9, 1.2 * 0.9);
      g.rotation.x *= 0.87;
      if (subTime.current > HIT_DUR) {
        g.scale.setScalar(0.9);
        g.position.copy(watchPos);
        g.position.y = 0;
        g.rotation.set(0, Math.PI * 0.72, 0);
        sub.current = 'watching';
        play(/idle|sit|stand|wait/i);
      }
    }
  }, 0); // priority 0 → writes positionRef first

  return <primitive ref={groupRef} object={scene} visible={false} />;
}

// Preload
useGLTF.preload(PATHS.tito);
useGLTF.preload(PATHS.lia);

// ── Procedural Dog (fallback if USE_GLTF_MODELS = false) ──────────────────
function ProceduralDog({ dogType, callId, doorPos, framePos, watchPos, onImpact, positionRef }: Dog3DProps) {
  const root    = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);
  const tailRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Group>(null);

  const sub     = useRef<Sub>('hidden');
  const subTime = useRef(0);
  const fired   = useRef(false);

  useEffect(() => {
    if (callId === 0 || !root.current) return;
    const g = root.current;
    g.visible = true;
    g.position.copy(doorPos);
    g.rotation.y = Math.atan2(framePos.x - doorPos.x, framePos.z - doorPos.z);
    sub.current   = 'running';
    subTime.current = 0;
    fired.current   = false;
  }, [callId, doorPos, framePos]);

  const isTito  = dogType === 'tito';
  const body    = isTito ? '#c8621a' : '#f5f5f5';
  const dark    = isTito ? '#6b2e08' : '#d4ccc0';
  const belly   = isTito ? '#f5d5a0' : '#fafafa';

  const legGeo = useMemo(() => new THREE.CapsuleGeometry(0.06, 0.32, 4, 8), []);
  const pawGeo = useMemo(() => new THREE.SphereGeometry(0.075, 8, 6), []);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g || sub.current === 'hidden') return;
    subTime.current += dt;
    positionRef.current.copy(g.position);
    const legs = legRefs.current;

    if (sub.current === 'running') {
      const target = new THREE.Vector3(framePos.x, g.position.y, framePos.z + 1.1);
      const dir    = target.sub(g.position);
      const dist   = dir.length();
      if (dist > 0.05) {
        dir.normalize();
        g.position.addScaledVector(dir, RUN_SPEED * dt);
        g.rotation.y = Math.atan2(dir.x, dir.z);
      }
      const c = Math.sin(subTime.current * 14);
      if (legs[0]) legs[0].rotation.x =  c * 0.75;
      if (legs[1]) legs[1].rotation.x = -c * 0.75;
      if (legs[2]) legs[2].rotation.x = -c * 0.75;
      if (legs[3]) legs[3].rotation.x =  c * 0.75;
      g.position.y = Math.abs(Math.sin(subTime.current * 14)) * 0.07;
      if (tailRef.current) tailRef.current.rotation.z = Math.sin(subTime.current * 9) * 0.4;
      if (dist < 0.65) { sub.current = 'jumping'; subTime.current = 0; }

    } else if (sub.current === 'jumping') {
      const p = Math.min(subTime.current / JUMP_DUR, 1);
      g.position.z += dt * 2.8;
      g.position.y = Math.sin(p * Math.PI) * 1.0;
      g.rotation.x = p * 0.35;
      legs.forEach(l => { if (l) l.rotation.x = -0.5; });
      if (subTime.current > JUMP_DUR) {
        sub.current = 'impact'; subTime.current = 0;
        if (!fired.current) { fired.current = true; onImpact(); }
      }

    } else if (sub.current === 'impact') {
      const p  = Math.min(subTime.current / HIT_DUR, 1);
      const sq = 1 - Math.sin(p * Math.PI) * 0.3;
      g.scale.set(1 + (1 - sq) * 0.4, sq, 1 + (1 - sq) * 0.4);
      g.rotation.x *= 0.88;
      if (subTime.current > HIT_DUR) {
        g.scale.set(1, 1, 1);
        g.position.copy(watchPos);
        g.rotation.set(0, Math.PI * 0.72, 0);
        sub.current = 'watching';
      }

    } else if (sub.current === 'watching') {
      if (tailRef.current) tailRef.current.rotation.z = Math.sin(subTime.current * 2.6) * 0.45;
      if (headRef.current) headRef.current.position.y = 0.44 + Math.sin(subTime.current * 1.7) * 0.015;
    }
  }, 0);

  return (
    <group ref={root} visible={false}>
      <RoundedBox args={[0.58, 0.4, 0.92]} radius={0.13} smoothness={4} position={[0, 0.26, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.36, 0.14, 0.66]} radius={0.06} smoothness={3} position={[0, 0.1, 0.05]}>
        <meshStandardMaterial color={belly} roughness={0.8} />
      </RoundedBox>

      <group ref={headRef} position={[0, 0.44, 0.38]}>
        <mesh castShadow><sphereGeometry args={[0.22, 14, 12]} /><meshStandardMaterial color={body} roughness={0.7} /></mesh>
        <RoundedBox args={[0.14, 0.1, 0.16]} radius={0.04} smoothness={3} position={[0, -0.04, 0.2]}>
          <meshStandardMaterial color={belly} />
        </RoundedBox>
        <mesh position={[0, 0.005, 0.27]}><sphereGeometry args={[0.038,8,6]} /><meshStandardMaterial color="#0a0505" /></mesh>
        <mesh position={[-0.095, 0.07, 0.18]}><sphereGeometry args={[0.036,8,6]} /><meshStandardMaterial color="#0a0505" /></mesh>
        <mesh position={[0.095, 0.07, 0.18]}><sphereGeometry args={[0.036,8,6]} /><meshStandardMaterial color="#0a0505" /></mesh>
        {isTito ? (
          <>
            <mesh position={[-0.13, 0.25, -0.02]} rotation={[0,0,-0.2]} castShadow><coneGeometry args={[0.075,0.22,8]} /><meshStandardMaterial color={dark} /></mesh>
            <mesh position={[0.13,  0.25, -0.02]} rotation={[0,0, 0.2]} castShadow><coneGeometry args={[0.075,0.22,8]} /><meshStandardMaterial color={dark} /></mesh>
          </>
        ) : (
          <>
            <RoundedBox args={[0.11,0.24,0.05]} radius={0.04} smoothness={3} position={[-0.26,0.06,-0.02]} rotation={[0,0, 0.35]} castShadow><meshStandardMaterial color={dark} /></RoundedBox>
            <RoundedBox args={[0.11,0.24,0.05]} radius={0.04} smoothness={3} position={[ 0.26,0.06,-0.02]} rotation={[0,0,-0.35]} castShadow><meshStandardMaterial color={dark} /></RoundedBox>
          </>
        )}
      </group>

      {([[-0.19, 0.28],[0.19, 0.28],[-0.19,-0.28],[0.19,-0.28]] as [number,number][]).map(([x,z],i) => (
        <mesh key={i} ref={el => { legRefs.current[i] = el; }} geometry={legGeo} position={[x, 0.06, z]} castShadow>
          <meshStandardMaterial color={body} roughness={0.7} />
          <mesh position={[0,-0.18,0]} geometry={pawGeo}><meshStandardMaterial color={belly} /></mesh>
        </mesh>
      ))}

      <mesh ref={tailRef} position={[0, 0.32, -0.48]} rotation={[isTito ? -1.0 : 0.3, 0, isTito ? 0.4 : 0]} castShadow>
        <capsuleGeometry args={[isTito ? 0.035 : 0.045, isTito ? 0.3 : 0.26, 4, 8]} />
        <meshStandardMaterial color={isTito ? body : belly} roughness={0.7} />
      </mesh>
    </group>
  );
}