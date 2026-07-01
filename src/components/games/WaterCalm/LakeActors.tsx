// LakeActors.tsx — Tito y Lia en canoa con GLTF + animaciones de Quaternius
// ErrorBoundary incluido: si el .glb no existe, muestra fallback sin crashear

import { useRef, useMemo, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { LakeWorld } from './WaterCalm';
import { LAKE_Y, LAKE_CENTER_Z, LAKE_RADIUS } from './lakeConstants';

// ── Preload para evitar jank al montar ────────────────────────────────────────
useGLTF.preload('/assets/3D/tito.glb');
useGLTF.preload('/assets/3D/lia.glb');

// ── ErrorBoundary ─────────────────────────────────────────────────────────────
// Definimos las interfaces de tipos para el ErrorBoundary
interface GltfBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface GltfBoundaryState {
  err: boolean;
}

// Aquí está la corrección principal: Component<Props, State>
class GltfBoundary extends Component<GltfBoundaryProps, GltfBoundaryState> {
  constructor(props: GltfBoundaryProps) {
    super(props);
    this.state = { err: false };
  }

  static getDerivedStateFromError() {
    return { err: true };
  }

  componentDidCatch(e: unknown) {
    console.warn('[LakeActors] GLTF no encontrado, usando fallback:', e);
  }

  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

// ── Fallback geométrico simple ────────────────────────────────────────────────
function FallbackDog({ color }: { color: string }) {
  return (
    <group>
      {/* cuerpo */}
      <mesh position={[0, 0.22, 0]}>
        <capsuleGeometry args={[0.15, 0.28, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* cabeza */}
      <mesh position={[0, 0.52, 0.20]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
    </group>
  );
}

// ── Perro GLTF con animación ──────────────────────────────────────────────────
// Compatible con packs de Quaternius (animaciones: Walk, Run, Idle, etc.)
function GltfDog({ src, scale }: { src: string; scale: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(src);
  const { actions } = useAnimations(animations, groupRef);

  // Clonar la escena para que dos perros no compartan el mismo objeto Three
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Buscar animación de caminar/correr en el pack de Quaternius
    const walkKey = Object.keys(actions).find((k) =>
      /walk|run|move|swim/i.test(k),
    );
    if (walkKey) {
      actions[walkKey]?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    }
    return () => {
      if (walkKey) actions[walkKey]?.stop();
    };
  }, [actions]);

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ── Remos ─────────────────────────────────────────────────────────────────────
function Paddle({ side, speedRef }: { side: 1 | -1; speedRef: React.MutableRefObject<number> }) {
  const ref   = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame((_, dt) => {
    phase.current += dt * (1.2 + speedRef.current * 1.6);
    if (ref.current) {
      ref.current.rotation.z = Math.sin(phase.current) * 0.55 * side + 0.12 * side;
    }
  });

  return (
    <group ref={ref} position={[0.44 * side, 0.22, 0]}>
      {/* palo */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.022, 0.022, 0.90, 5]} />
        <meshStandardMaterial color="#5c3d22" />
      </mesh>
      {/* pala */}
      <mesh position={[0.46 * side, 0, 0]}>
        <boxGeometry args={[0.14, 0.02, 0.24]} />
        <meshStandardMaterial color="#5c3d22" />
      </mesh>
    </group>
  );
}

// ── Canoa ─────────────────────────────────────────────────────────────────────
function Canoe() {
  return (
    <group>
      {/* casco exterior */}
      <mesh position={[0, 0.06, 0]}>
        <capsuleGeometry args={[0.32, 1.55, 4, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.72} />
      </mesh>
      {/* interior oscuro */}
      <mesh position={[0, 0.17, 0]} scale={[0.90, 0.55, 0.90]}>
        <capsuleGeometry args={[0.32, 1.55, 4, 8]} />
        <meshStandardMaterial color="#1e140c" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ── Perro remando hacia el target ─────────────────────────────────────────────
function RowingDog({
  gltfSrc, fallbackColor, gltfScale,
  startOffset, world, active,
}: {
  gltfSrc: string;
  fallbackColor: string;
  gltfScale: number;
  startOffset: THREE.Vector3;
  world: React.MutableRefObject<LakeWorld>;
  active: boolean;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const speedRef  = useRef(0);
  const pos       = useRef(new THREE.Vector3(
    startOffset.x,
    LAKE_Y + 0.12,
    LAKE_CENTER_Z + startOffset.z,
  ));
  const vel = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const target = new THREE.Vector3(
      world.current.targetPoint.x + startOffset.x * 0.25,
      LAKE_Y + 0.12,
      world.current.targetPoint.z + startOffset.z * 0.25,
    );

    // Mantener dentro del lago
    const toCenter = new THREE.Vector3(
      -pos.current.x,
      0,
      LAKE_CENTER_Z - pos.current.z,
    );
    const distToCenter = toCenter.length();
    const distLimit = LAKE_RADIUS - 3;
    if (distToCenter > distLimit) {
      target.copy(new THREE.Vector3(0, LAKE_Y + 0.12, LAKE_CENTER_Z));
    }

    const toTarget = target.clone().sub(pos.current);
    const dist = toTarget.length();
    const baseSpeed = active ? 1.4 : 0.5;
    const spd = Math.min(dist * 0.7, baseSpeed + dist * 0.15);

    if (dist > 0.4) {
      vel.current.lerp(toTarget.normalize().multiplyScalar(spd), 0.04);
    } else {
      vel.current.lerp(new THREE.Vector3(0, 0, 0), 0.06);
    }

    pos.current.addScaledVector(vel.current, dt);
    pos.current.y = LAKE_Y + 0.12; // siempre en la superficie del lago

    speedRef.current = vel.current.length();

    if (groupRef.current) {
      const bob = Math.sin(performance.now() * 0.0014 + startOffset.x) * 0.028;
      groupRef.current.position.set(pos.current.x, pos.current.y + bob, pos.current.z);
      // Rotar hacia donde se mueve
      if (vel.current.lengthSq() > 0.01) {
        const yaw = Math.atan2(vel.current.x, vel.current.z);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y, yaw, 0.07,
        );
      }
      // Balanceo sobre el agua
      groupRef.current.rotation.z = bob * 1.4;
    }
  });

  return (
    <group ref={groupRef}>
      <Canoe />
      <Paddle side={1}  speedRef={speedRef} />
      <Paddle side={-1} speedRef={speedRef} />
      {/* Perro encima de la canoa */}
      <group position={[0, 0.35, 0]}>
        <GltfBoundary fallback={<FallbackDog color={fallbackColor} />}>
          <GltfDog src={gltfSrc} scale={gltfScale} />
        </GltfBoundary>
      </group>
    </group>
  );
}

// ── Componente público ────────────────────────────────────────────────────────
export default function LakeActors({
  world, active,
}: {
  world: React.MutableRefObject<LakeWorld>;
  active: boolean;
}) {
  return (
    <>
      {/* Tito — Shiba Inu café, lado izquierdo del lago */}
      <RowingDog
        gltfSrc="/assets/3D/tito.glb"
        fallbackColor="#c98a4b"
        gltfScale={0.55}
        startOffset={new THREE.Vector3(-9, 0, -5)}
        world={world}
        active={active}
      />
      {/* Lia — Bichón Maltés, lado derecho del lago */}
      <RowingDog
        gltfSrc="/assets/3D/lia.glb"
        fallbackColor="#f0ece2"
        gltfScale={0.50}
        startOffset={new THREE.Vector3(9, 0, -8)}
        world={world}
        active={active}
      />
    </>
  );
}   