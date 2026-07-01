import { useCallback, useEffect, useRef, useState, useMemo } from 'react'; // <-- Añadido useMemo
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { Group } from 'three';

const TITO_BASE: [number, number, number] = [1.1,  0, 1.6];
const LIA_BASE:  [number, number, number] = [-1.3, 0, 1.0];
const FIRE_POS       = new THREE.Vector3(0, 0, 0);
const STICK_LAND_POS = new THREE.Vector3(0.5, 0, -7);
const MIN_FIRE_DIST  = 0.85;

// ⚠️ Ajusta este valor si los modelos aparecen demasiado grandes o pequeños
const DOG_SCALE = 0.5;

type DogBehavior = 'idle' | 'curious' | 'fetch' | 'return';

interface DogProps {
  path: string;
  basePos: [number, number, number];
  bobOffset?: number;
  fetchActive: boolean;
  onFetchComplete: () => void;
}

function Dog({ path, basePos, bobOffset = 0, fetchActive, onFetchComplete }: DogProps) {
  const groupRef  = useRef<Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, groupRef);

  const worldPos  = useRef(new THREE.Vector3(...basePos));
  const behavior  = useRef<DogBehavior>('idle');
  const timer     = useRef(bobOffset * 4);
  const fetchT    = useRef(0);
  const cbFired   = useRef(false);

  // ⚠️ CORRECCIÓN AQUÍ: useMemo en lugar de useRef con función
  const curiousTarget = useMemo(() => {
    const base   = new THREE.Vector3(...basePos);
    const toFire = FIRE_POS.clone().sub(base).normalize();
    const t      = base.clone().addScaledVector(toFire, 0.45);
    if (t.distanceTo(FIRE_POS) < MIN_FIRE_DIST) {
      t.addScaledVector(toFire, -(MIN_FIRE_DIST - t.distanceTo(FIRE_POS)));
    }
    return t;
  }, [basePos]);

  // Reproduce la primera animación disponible en el GLB (si existe)
  useEffect(() => {
    const keys = Object.keys(actions);
    if (keys.length > 0) actions[keys[0]]?.reset().fadeIn(0.3).play();
  }, [actions]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    timer.current += delta;

    // Activar fetch
    if (fetchActive && behavior.current !== 'fetch' && behavior.current !== 'return') {
      behavior.current = 'fetch';
      fetchT.current   = 0;
      cbFired.current  = false;
    }

    // Ciclo idle ↔ curioso
    if (behavior.current === 'idle' && timer.current > 5 + bobOffset) {
      behavior.current = 'curious'; timer.current = 0;
    } else if (behavior.current === 'curious' && timer.current > 2.8) {
      behavior.current = 'idle'; timer.current = 0;
    }

    const base = new THREE.Vector3(...basePos);
    let targetPos = base.clone();
    let targetRotY = Math.atan2(FIRE_POS.x - base.x, FIRE_POS.z - base.z);

    switch (behavior.current) {
      case 'curious':
        targetPos.copy(curiousTarget);
        break;
      case 'fetch':
        fetchT.current = Math.min(1, fetchT.current + delta * 1.3);
        targetPos      = base.clone().lerp(STICK_LAND_POS, fetchT.current);
        targetRotY     = Math.atan2(STICK_LAND_POS.x - base.x, STICK_LAND_POS.z - base.z);
        if (fetchT.current >= 1) { behavior.current = 'return'; fetchT.current = 0; }
        break;
      case 'return':
        fetchT.current = Math.min(1, fetchT.current + delta * 0.85);
        targetPos      = STICK_LAND_POS.clone().lerp(base, fetchT.current);
        targetRotY     = Math.atan2(base.x - STICK_LAND_POS.x, base.z - STICK_LAND_POS.z);
        if (fetchT.current >= 1 && !cbFired.current) {
          cbFired.current = true;
          behavior.current = 'idle';
          onFetchComplete();
        }
        break;
    }

    const isMoving = worldPos.current.distanceTo(targetPos) > 0.05;
    const bob      = isMoving
      ? Math.sin(Date.now() / 105) * 0.045
      : Math.sin(Date.now() / 900 + bobOffset) * 0.01;

    worldPos.current.lerp(targetPos, 0.05);
    group.position.set(worldPos.current.x, worldPos.current.y + bob, worldPos.current.z);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotY, 0.06);
  });

  return (
    <group ref={groupRef}>
      {/* ⚠️ Si el modelo aparece de costado, cambia rotation abajo, ej: rotation={[Math.PI/2, 0, 0]} */}
      <primitive object={scene} scale={DOG_SCALE} />
    </group>
  );
}

// Palo que vuela por el aire
function FlyingStick({ active, onLanded }: { active: boolean; onLanded: () => void }) {
  const ref  = useRef<THREE.Mesh>(null);
  const t    = useRef(0);
  const fire = useRef(false);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    if (!active) { t.current = 0; fire.current = false; m.visible = false; return; }

    t.current    = Math.min(1, t.current + delta / 0.85);
    const origin = new THREE.Vector3(0.1, 1.1, 2.5);
    const pos    = origin.clone().lerp(STICK_LAND_POS, t.current);
    pos.y       += Math.sin(t.current * Math.PI) * 3.8;

    m.position.copy(pos);
    m.rotation.x += delta * 9;
    m.visible     = t.current < 0.97;

    if (t.current >= 0.97 && !fire.current) { fire.current = true; onLanded(); }
  });

  return (
    <mesh ref={ref} visible={false}>
      <cylinderGeometry args={[0.03, 0.022, 0.6, 6]} />
      <meshStandardMaterial color="#7a4a20" roughness={0.9} />
    </mesh>
  );
}

// Palo en el suelo esperando a que lo recojan
function GroundStick({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <mesh position={[STICK_LAND_POS.x + 0.05, 0.04, STICK_LAND_POS.z]} rotation={[0, 0.25, Math.PI / 9]}>
      <cylinderGeometry args={[0.028, 0.02, 0.58, 6]} />
      <meshStandardMaterial color="#6b4020" roughness={0.95} />
    </mesh>
  );
}

export interface DogCompanionsProps {
  throwActive: boolean;
  onThrowComplete: () => void;
}

export default function DogCompanions({ throwActive, onThrowComplete }: DogCompanionsProps) {
  const [stickFlying,  setStickFlying]  = useState(false);
  const [stickOnGround, setStickOnGround] = useState(false);
  const [fetchingDog,  setFetchingDog]  = useState<'tito' | 'lia' | null>(null);
  const nextFetcher = useRef<'tito' | 'lia'>('tito');

  useEffect(() => {
    if (throwActive) { setStickFlying(true); setStickOnGround(false); setFetchingDog(null); }
    else             { setStickFlying(false); setStickOnGround(false); setFetchingDog(null); }
  }, [throwActive]);

  const handleLanded = useCallback(() => {
    setStickFlying(false);
    setStickOnGround(true);
    setFetchingDog(nextFetcher.current);
    nextFetcher.current = nextFetcher.current === 'tito' ? 'lia' : 'tito';
  }, []);

  const handleFetchDone = useCallback(() => {
    setStickOnGround(false);
    setFetchingDog(null);
    onThrowComplete();
  }, [onThrowComplete]);

  return (
    <group>
      <Dog path="/assets/3D/tito.glb" basePos={TITO_BASE} bobOffset={0}
        fetchActive={fetchingDog === 'tito'} onFetchComplete={handleFetchDone} />
      <Dog path="/assets/3D/lia.glb"  basePos={LIA_BASE}  bobOffset={1.8}
        fetchActive={fetchingDog === 'lia'}  onFetchComplete={handleFetchDone} />
      <FlyingStick active={stickFlying} onLanded={handleLanded} />
      <GroundStick show={stickOnGround} />
    </group>
  );
}

useGLTF.preload('/assets/3D/tito.glb');
useGLTF.preload('/assets/3D/lia.glb');