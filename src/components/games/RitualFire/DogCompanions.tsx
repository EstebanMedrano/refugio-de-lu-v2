import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Howl } from 'howler';
import * as THREE from 'three';
import type { Group } from 'three';

const TITO_BASE: [number, number, number] = [ 1.1, 0, 1.6];
const LIA_BASE:  [number, number, number] = [-1.3, 0, 1.0];
const TITO_SCALE = 0.50;
const LIA_SCALE  = 0.45;
const FIRE_POS   = new THREE.Vector3(0, 0, 0);

type DogBehavior = 'idle' | 'curious' | 'chasing' | 'fleeing' | 'fetch' | 'return';

let _barkHowl: Howl | null = null;
function bark() {
  if (!_barkHowl) _barkHowl = new Howl({ src: ['/assets/sounds/lia-bark.mp3'], volume: 0.65 });
  if (_barkHowl.playing()) _barkHowl.stop();
  _barkHowl.play();
}

interface DogProps {
  path:            string;
  basePos:         [number, number, number];
  scale:           number;
  bobOffset:       number;
  fetchActive:     boolean;
  stickTarget:     THREE.Vector3;
  posExport:       React.MutableRefObject<THREE.Vector3>;
  otherPos:        React.MutableRefObject<THREE.Vector3>;
  onPickedUp:      () => void;
  onFetchComplete: () => void;
}

function Dog({
  path, basePos, scale, bobOffset,
  fetchActive, stickTarget,
  posExport, otherPos,
  onPickedUp, onFetchComplete,
}: DogProps) {
  const groupRef = useRef<Group>(null);
  const { scene, animations } = useGLTF(path);
  const { actions } = useAnimations(animations, groupRef);

  // ── Auto-align: levanta el modelo para que los pies queden en Y=0 ─────────
  // setFromObject respeta el scale que R3F aplicó al primitive antes de useEffect.
  // "correction" es cuánto subir el sub-grupo interno para que min.y = 0.
  // Si los pies siguen hundiéndose, sube MANUAL_OFFSET (0.05 → 0.1 → 0.2).
  const MANUAL_OFFSET = 0;
  const [yJsx, setYJsx] = useState(0);
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const auto = box.min.y < -0.01 ? -box.min.y : 0;
    setYJsx(auto + MANUAL_OFFSET);
  }, [scene, scale]);

  const pos       = useRef(new THREE.Vector3(...basePos));
  const beh       = useRef<DogBehavior>('idle');
  const timer     = useRef(2 + bobOffset * 3.5);
  const barkTimer = useRef(1.5 + bobOffset * 2);
  const fetchT    = useRef(0);
  const cbFired   = useRef(false);
  const barkFired = useRef(false);
  const mouthRef  = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const first = Object.keys(actions)[0];
    if (first) actions[first]?.reset().fadeIn(0.3).play();
  }, [actions]);

  useEffect(() => {
    if (fetchActive && beh.current !== 'fetch' && beh.current !== 'return') {
      beh.current = 'fetch'; fetchT.current = 0;
      cbFired.current = false; barkFired.current = false;
    }
  }, [fetchActive]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    timer.current     -= delta;
    barkTimer.current -= delta;

    // ── Transiciones de comportamiento ───────────────────────────────────
    if (beh.current === 'idle' && timer.current <= 0) {
      const r = Math.random();
      if (r < 0.38) {
        beh.current = 'curious'; timer.current = 2.5 + Math.random() * 2;
      } else if (r < 0.68) {
        beh.current = 'chasing'; timer.current = 1.8 + Math.random() * 1.5;
        bark();
      } else {
        timer.current = 2 + Math.random() * 3;
      }
    }
    if (beh.current === 'curious' && timer.current <= 0) {
      beh.current = 'idle'; timer.current = 2.5 + Math.random() * 2.5;
    }
    if (beh.current === 'chasing' && timer.current <= 0) {
      beh.current = 'fleeing'; timer.current = 1.2 + Math.random();
    }
    if (beh.current === 'fleeing' && timer.current <= 0) {
      beh.current = 'idle'; timer.current = 2 + Math.random() * 3;
    }

    // ── Ladridos espontáneos ─────────────────────────────────────────────
    if (barkTimer.current <= 0) {
      if (beh.current === 'chasing') {
        bark(); barkTimer.current = 1.2 + Math.random() * 1.5;
      } else if (beh.current === 'curious' && Math.random() < 0.45) {
        bark(); barkTimer.current = 4 + Math.random() * 5;
      } else {
        barkTimer.current = 3 + Math.random() * 4;
      }
    }

    // ── Movimiento ────────────────────────────────────────────────────────
    const base = new THREE.Vector3(...basePos);
    let targetPos  = base.clone();
    let targetRotY = Math.atan2(FIRE_POS.x - base.x, FIRE_POS.z - base.z);

    switch (beh.current) {
      case 'curious': {
        const d = FIRE_POS.clone().sub(base).normalize();
        targetPos  = base.clone().addScaledVector(d, 0.5);
        targetRotY = Math.atan2(FIRE_POS.x - pos.current.x, FIRE_POS.z - pos.current.z);
        break;
      }
      case 'chasing': {
        const other = otherPos.current;
        targetPos   = base.clone().lerp(other, 0.5);
        const dv    = other.clone().sub(pos.current);
        if (dv.length() > 0.01) targetRotY = Math.atan2(dv.x, dv.z);
        break;
      }
      case 'fleeing': {
        const d = base.clone().sub(otherPos.current).normalize();
        targetPos  = base.clone().addScaledVector(d, 0.65);
        targetRotY = Math.atan2(d.x, d.z);
        break;
      }
      case 'fetch': {
        if (!barkFired.current) { bark(); barkFired.current = true; }
        fetchT.current = Math.min(1, fetchT.current + delta * 0.95);
        targetPos = base.clone().lerp(stickTarget, fetchT.current);
        const dv  = stickTarget.clone().sub(base);
        if (dv.length() > 0.01) targetRotY = Math.atan2(dv.x, dv.z);
        if (fetchT.current >= 1) {
          beh.current    = 'return';
          fetchT.current = 0;
          bark();
          onPickedUp(); // ← Oculta la silueta del palo en el suelo INMEDIATAMENTE
        }
        break;
      }
      case 'return': {
        fetchT.current = Math.min(1, fetchT.current + delta * 0.38);
        targetPos = stickTarget.clone().lerp(base, fetchT.current);
        const dv  = base.clone().sub(stickTarget);
        if (dv.length() > 0.01) targetRotY = Math.atan2(dv.x, dv.z);
        if (fetchT.current >= 1 && !cbFired.current) {
          cbFired.current = true;
          beh.current     = 'idle';
          timer.current   = 2 + Math.random() * 2;
          onFetchComplete();
        }
        break;
      }
    }

    if (mouthRef.current) mouthRef.current.visible = beh.current === 'return';

    const moving = pos.current.distanceTo(targetPos) > 0.04;
    const bob    = moving
      ? Math.sin(Date.now() / 110) * 0.04
      : Math.sin(Date.now() / 950 + bobOffset) * 0.012;

    pos.current.lerp(targetPos, 0.055);
    posExport.current.copy(pos.current);
    // Nota: yJsx se aplica en el sub-grupo JSX, no aquí → no hay doble offset
    group.position.set(pos.current.x, pos.current.y + bob, pos.current.z);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotY, 0.07);
  });

  return (
    <group ref={groupRef}>
      {/*
        Sub-grupo interno elevado por yJsx:
        - primitive + mouth se levantan juntos la misma cantidad
        - primitive no toca el suelo, mouth queda en la posición correcta del hocico
        - Si el palo aparece demasiado alto/bajo, ajusta scale * 0.72
      */}
      <group position={[0, yJsx, 0]}>
        <primitive object={scene} scale={scale} />
        <mesh
          ref={mouthRef}
          visible={false}
          position={[0, scale * 0.72, scale * 0.52]}
          rotation={[0.12, 0, Math.PI / 2.1]}
        >
          <cylinderGeometry args={[scale * 0.04, scale * 0.028, scale * 0.88, 6]} />
          <meshStandardMaterial color="#9a6838" roughness={0.8} emissive="#5a3010" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Palo volador ─────────────────────────────────────────────────────────────

function FlyingStick({ active, target, onLanded }: {
  active: boolean; target: THREE.Vector3; onLanded: () => void;
}) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const t        = useRef(0);
  const fired    = useRef(false);

  useFrame((_, delta) => {
    const m = meshRef.current;
    const l = lightRef.current;
    if (!m) return;
    if (!active) { t.current = 0; fired.current = false; m.visible = false; if (l) l.intensity = 0; return; }
    t.current = Math.min(1, t.current + delta / 0.80);
    const origin = new THREE.Vector3(0.1, 1.1, 2.5);
    const cur    = origin.clone().lerp(target, t.current);
    cur.y       += Math.sin(t.current * Math.PI) * 3.5;
    m.position.copy(cur);
    m.rotation.x += delta * 10;
    m.visible     = t.current < 0.96;
    if (l) { l.position.copy(cur); l.intensity = m.visible ? 1.6 + Math.random() * 0.4 : 0; }
    if (t.current >= 0.96 && !fired.current) { fired.current = true; onLanded(); }
  });

  return (
    <>
      <mesh ref={meshRef} visible={false}>
        <cylinderGeometry args={[0.03, 0.022, 0.6, 6]} />
        <meshStandardMaterial color="#c8a870" roughness={0.4} emissive="#ff7700" emissiveIntensity={0.85} />
      </mesh>
      <pointLight ref={lightRef} color="#ffaa44" distance={9} decay={2} intensity={0} />
    </>
  );
}

function GroundStick({ show, position }: { show: boolean; position: THREE.Vector3 }) {
  if (!show) return null;
  return (
    <group position={[position.x, 0.05, position.z]}>
      <mesh rotation={[0, 0.3, Math.PI / 8]}>
        <cylinderGeometry args={[0.027, 0.019, 0.57, 6]} />
        <meshStandardMaterial color="#b08040" roughness={0.7} emissive="#ff6600" emissiveIntensity={0.65} />
      </mesh>
      <pointLight color="#ffaa44" distance={7} decay={2} intensity={1.1} />
    </group>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface DogCompanionsProps {
  throwActive:     boolean;
  stickTarget:     THREE.Vector3;
  onThrowComplete: () => void;
}

export default function DogCompanions({ throwActive, stickTarget, onThrowComplete }: DogCompanionsProps) {
  const [stickFlying,   setStickFlying]   = useState(false);
  const [stickOnGround, setStickOnGround] = useState(false);
  const [fetchingDog,   setFetchingDog]   = useState<'tito' | 'lia' | null>(null);
  const nextFetcher = useRef<'tito' | 'lia'>('tito');
  const titoPos     = useRef(new THREE.Vector3(...TITO_BASE));
  const liaPos      = useRef(new THREE.Vector3(...LIA_BASE));

  useEffect(() => {
    if (throwActive) { setStickFlying(true); setStickOnGround(false); setFetchingDog(null); }
    else             { setStickFlying(false); setStickOnGround(false); setFetchingDog(null); }
  }, [throwActive]);

  const handleLanded = useCallback(() => {
    setStickFlying(false);
    setStickOnGround(true); // Muestra el palo en el suelo
    setFetchingDog(nextFetcher.current);
    nextFetcher.current = nextFetcher.current === 'tito' ? 'lia' : 'tito';
  }, []);

  // El perro llega al palo → oculta la silueta del suelo INMEDIATAMENTE
  const handlePickedUp = useCallback(() => {
    setStickOnGround(false);
  }, []);

  const handleFetchDone = useCallback(() => {
    setFetchingDog(null);
    onThrowComplete();
  }, [onThrowComplete]);

  return (
    <group>
      <Dog path="/assets/3D/tito.glb" basePos={TITO_BASE} scale={TITO_SCALE} bobOffset={0}
        fetchActive={fetchingDog === 'tito'} stickTarget={stickTarget}
        posExport={titoPos} otherPos={liaPos}
        onPickedUp={handlePickedUp} onFetchComplete={handleFetchDone} />
      <Dog path="/assets/3D/lia.glb"  basePos={LIA_BASE}  scale={LIA_SCALE}  bobOffset={1.8}
        fetchActive={fetchingDog === 'lia'}  stickTarget={stickTarget}
        posExport={liaPos} otherPos={titoPos}
        onPickedUp={handlePickedUp} onFetchComplete={handleFetchDone} />
      <FlyingStick active={stickFlying} target={stickTarget} onLanded={handleLanded} />
      <GroundStick show={stickOnGround} position={stickTarget} />
    </group>
  );
}

useGLTF.preload('/assets/3D/tito.glb');
useGLTF.preload('/assets/3D/lia.glb');