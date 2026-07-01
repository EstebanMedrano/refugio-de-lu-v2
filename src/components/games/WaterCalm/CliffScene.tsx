// CliffScene.tsx — Bosque visible + acantilado + lago lejano
import { useRef, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { Stage, LakeWorld } from './WaterCalm';
import {
  STAND_POS, SEAT_POS, SEAT_LOOK,
  LAKE_Y, LAKE_CENTER_Z, LAKE_RADIUS,
} from './lakeConstants';
import LakeSurface from './LakeSurface';
import Laser from './Laser';
import LakeActors from './LakeActors';

interface Props {
  stage: Stage;
  world: React.MutableRefObject<LakeWorld>;
  onIdleAdvance: () => void;
  onApproachComplete: () => void;
}

// ── Árbol de pino procedural ──────────────────────────────────────────────────
function PineTree({ position, height = 4.5, radius = 1.4 }: { position: [number, number, number]; height?: number; radius?: number }) {
  return (
    <group position={position}>
      {/* Tronco marrón visible */}
      <mesh position={[0, height * 0.22, 0]}>
        <cylinderGeometry args={[radius * 0.12, radius * 0.16, height * 0.44, 6]} />
        <meshStandardMaterial color="#5a3a2a" roughness={1} />
      </mesh>
      {/* Hojas verde oscuro visible */}
      <mesh position={[0, height * 0.38, 0]}>
        <coneGeometry args={[radius * 1.15, height * 0.48, 7]} />
        <meshStandardMaterial color="#1a3a22" roughness={1} />
      </mesh>
      <mesh position={[0, height * 0.60, 0]}>
        <coneGeometry args={[radius * 0.85, height * 0.44, 7]} />
        <meshStandardMaterial color="#1e4528" roughness={1} />
      </mesh>
      <mesh position={[0, height * 0.80, 0]}>
        <coneGeometry args={[radius * 0.52, height * 0.35, 7]} />
        <meshStandardMaterial color="#224f2e" roughness={1} />
      </mesh>
    </group>
  );
}

function Forest() {
  const trees = useMemo(() => [
    { pos: [-6, 0, 10], h: 5.5, r: 1.5 }, { pos: [-2, 0, 13], h: 4.8, r: 1.3 },
    { pos: [ 2, 0, 12], h: 5.2, r: 1.4 }, { pos: [ 6, 0, 10], h: 5.0, r: 1.3 },
    { pos: [-10, 0, 16], h: 6.0, r: 1.6 }, { pos: [-5, 0, 18], h: 5.5, r: 1.4 },
    { pos: [ 0, 0, 17], h: 6.2, r: 1.7 }, { pos: [ 5, 0, 18], h: 5.4, r: 1.4 },
    { pos: [ 10, 0, 16], h: 6.0, r: 1.6 }, { pos: [-13, 0, 5], h: 5.0, r: 1.4 },
    { pos: [-14, 0, 8], h: 5.5, r: 1.5 }, { pos: [ 13, 0, 5], h: 5.0, r: 1.4 },
    { pos: [ 14, 0, 8], h: 5.5, r: 1.5 },
  ], []);

  return (
    <>
      {trees.map(({ pos, h, r }, i) => (
        <PineTree key={i} position={pos as [number, number, number]} height={h} radius={r} />
      ))}
    </>
  );
}

// ── Geometría del acantilado ──────────────────────────────────────────────────
function CliffGeometry() {
  return (
    <group>
      {/* Suelo del bosque */}
      <mesh position={[0, -1.5, 2]} receiveShadow>
        <boxGeometry args={[32, 3, 20]} />
        <meshStandardMaterial color="#2a3a4a" roughness={0.9} />
      </mesh>
      {/* Pared del acantilado */}
      <mesh position={[0, -6, -8]} receiveShadow>
        <boxGeometry args={[28, 16, 4]} />
        <meshStandardMaterial color="#1a2a3a" roughness={1} />
      </mesh>
      {/* Fondo del lago */}
      <mesh position={[0, -13, -22]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[70, 60]} />
        <meshStandardMaterial color="#061218" roughness={1} />
      </mesh>
      {/* Tronco para sentarse */}
      <mesh position={[0, 0.38, -5.5]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.36, 0.40, 3.0, 10]} />
        <meshStandardMaterial color="#8a6a4a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.8, 0.18, -5.5]} rotation={[Math.PI * 0.08, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#5a3a2a" roughness={1} />
      </mesh>
      <mesh position={[0.8, 0.18, -5.5]}>
        <cylinderGeometry args={[0.06, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#5a3a2a" roughness={1} />
      </mesh>
      {/* Rocas al borde */}
      <mesh position={[5, 0.25, -6.5]}>
        <sphereGeometry args={[0.45, 5, 4]} />
        <meshStandardMaterial color="#3a4a5a" roughness={1} />
      </mesh>
      <mesh position={[-4.5, 0.18, -6]}>
        <sphereGeometry args={[0.32, 5, 4]} />
        <meshStandardMaterial color="#2a3a4a" roughness={1} />
      </mesh>
    </group>
  );
}

// ── Luces del lago ─────────────────────────────────────────────────────────────
function LakeLights() {
  const glowColor = '#00ffcc';
  return (
    <>
      <pointLight position={[0, LAKE_Y + 2, LAKE_CENTER_Z]} color={glowColor} intensity={6} distance={80} />
      <pointLight position={[0, LAKE_Y + 1, LAKE_CENTER_Z - LAKE_RADIUS + 10]} color={glowColor} intensity={8} distance={80} />
      <pointLight position={[0, LAKE_Y + 1, LAKE_CENTER_Z + LAKE_RADIUS - 10]} color={glowColor} intensity={8} distance={80} />
      <pointLight position={[LAKE_RADIUS - 10, LAKE_Y + 1, LAKE_CENTER_Z]} color={glowColor} intensity={8} distance={80} />
      <pointLight position={[-LAKE_RADIUS + 10, LAKE_Y + 1, LAKE_CENTER_Z]} color={glowColor} intensity={8} distance={80} />
    </>
  );
}

// ── CameraRig: Movimiento y Rotación Libre ──────────────────────────────────
function CameraRig({
  stage, onIdleAdvance, onApproachComplete,
}: {
  stage: Stage;
  onIdleAdvance: () => void;
  onApproachComplete: () => void;
}) {
  const { camera, gl } = useThree();
  const lookTarget = useRef(new THREE.Vector3(0, 1.5, 0));
  const yawRef = useRef(0);
  const pitchRef = useRef(0.18);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (stage !== 'approaching') completedRef.current = false;
  }, [stage]);

  useEffect(() => {
    const dom = gl.domElement;
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (stage === 'arriving' && !advancedRef.current) {
        idleTimerRef.current = setTimeout(() => {
          advancedRef.current = true;
          onIdleAdvance();
        }, 2800); 
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (stage === 'approaching') return; 
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (stage === 'approaching' || !isDragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      yawRef.current -= dx * 0.003;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current - dy * 0.003, -0.45, 0.75);
      if (stage === 'arriving') resetIdleTimer();
    };
    const onPointerUp = () => { isDragging.current = false; };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    resetIdleTimer();

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [stage, gl, onIdleAdvance]);

  useFrame(() => {
    if (stage === 'arriving') {
      camera.position.lerp(STAND_POS, 0.08);
      const dir = new THREE.Vector3(Math.sin(yawRef.current), Math.sin(pitchRef.current), -Math.cos(yawRef.current)).normalize();
      lookTarget.current.lerp(camera.position.clone().add(dir.multiplyScalar(12)), 0.10);
      camera.lookAt(lookTarget.current);
    } else if (stage === 'approaching') {
      camera.position.lerp(SEAT_POS, 0.02);
      lookTarget.current.lerp(SEAT_LOOK, 0.015);
      camera.lookAt(lookTarget.current);
      if (!completedRef.current && camera.position.distanceTo(SEAT_POS) < 0.2) {
        completedRef.current = true;
        onApproachComplete();
      }
    } else {
      camera.position.lerp(SEAT_POS, 0.06);
      const dir = new THREE.Vector3(Math.sin(yawRef.current), Math.sin(pitchRef.current), -Math.cos(yawRef.current)).normalize();
      lookTarget.current.lerp(camera.position.clone().add(dir.multiplyScalar(15)), 0.08);
      camera.lookAt(lookTarget.current);
    }
  });

  return null;
}

// ── CliffScene ──────────────────────────────────────────────────────────────
export default function CliffScene({ stage, world, onIdleAdvance, onApproachComplete }: Props) {
  return (
    <Canvas
      shadows
      camera={{ fov: 65, near: 0.1, far: 180, position: STAND_POS.toArray() as [number, number, number] }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={['#0b1a2e']} />
      <fog attach="fog" args={['#0b1a2e', 35, 80]} />

      <ambientLight intensity={0.35} color="#253560" />
      <directionalLight position={[-15, 25, 5]} intensity={0.5} color="#8ba8e8" castShadow shadow-mapSize={[1024, 1024]} />

      <Stars radius={70} depth={45} count={3500} factor={5} saturation={0.3} fade speed={0.3} />

      <Forest />
      <CliffGeometry />
      <LakeLights />

      <LakeSurface world={world} active={stage === 'lasering'} />

      <Suspense fallback={null}>
        <LakeActors world={world} active={stage === 'lasering'} />
      </Suspense>

      <Laser world={world} stage={stage} />
      
      <CameraRig stage={stage} onIdleAdvance={onIdleAdvance} onApproachComplete={onApproachComplete} />
    </Canvas>
  );
}