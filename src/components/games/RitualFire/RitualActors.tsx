import { useEffect, useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { LEFT_STUMP, STUMP_TOP_Y } from './ForestScene';
import Arms from './Arms';

const FIRE_POS: [number, number, number]  = [0, 0.5, 0];
const CHEST: [number, number, number]     = [0, 0.32, 1.55];

export type RitualStage =
  | 'sitting' | 'approachingDesk' | 'grabbingLetter' | 'returningToSeat'
  | 'unfolding' | 'writing' | 'sealing' | 'placingLetter'
  | 'collectingLetters' | 'returningToBurn' | 'throwing' | 'burningFire';

interface RitualActorsProps {
  stage:        RitualStage;
  letterText:   string;
  savedLetters: number;
  burnThrow:    boolean;
}

interface HeldPose { pos: [number,number,number]; scale: number; rot: [number,number,number]; opacity: number; }

const HELD_POSES: Record<RitualStage, HeldPose> = {
  sitting:            { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],         opacity:0 },
  approachingDesk:    { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],         opacity:0 },
  grabbingLetter:     { pos: [ 0.18,-0.28,-0.48], scale:0.26,  rot:[0.14,0.32,0.07],opacity:1 },
  returningToSeat:    { pos: [ 0.14,-0.25,-0.46], scale:0.26,  rot:[0.07,0.13,0.03],opacity:1 },
  unfolding:          { pos: [ 0.02,-0.10,-0.54], scale:0.50,  rot:[0.02,0,0],       opacity:1 },
  writing:            { pos: [ 0,   -0.06,-0.56], scale:0.62,  rot:[0,0,0],          opacity:1 },
  sealing:            { pos: [ 0,   -0.20,-0.50], scale:0.32,  rot:[0.10,0.11,0.05], opacity:1 },
  placingLetter:      { pos: [ 0,   -0.32,-0.55], scale:0.001, rot:[0.14,0.22,0.09], opacity:0 },
  collectingLetters:  { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],          opacity:0 },
  returningToBurn:    { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],          opacity:0 },
  throwing:           { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],          opacity:0 },
  burningFire:        { pos: [ 0.22,-0.40,-0.55], scale:0.001, rot:[0,0,0],          opacity:0 },
};

function HeldLetter({ stage, text }: { stage: RitualStage; text: string }) {
  const { camera, scene } = useThree();
  const groupRef    = useRef<THREE.Group>(null);
  const matRef      = useRef<THREE.MeshBasicMaterial>(null);
  const curScale    = useRef(0.001);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    scene.add(camera);
    camera.add(g);
    return () => { camera.remove(g); };
  }, [camera, scene]);

  useFrame(() => {
    const g   = groupRef.current;
    const mat = matRef.current;
    if (!g || !mat) return;

    const p = HELD_POSES[stage];
    g.position.lerp(new THREE.Vector3(...p.pos), 0.09);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, p.rot[0], 0.09);
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, p.rot[1], 0.09);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, p.rot[2], 0.09);
    curScale.current = THREE.MathUtils.lerp(curScale.current, p.scale, 0.09);
    g.scale.setScalar(curScale.current);
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, p.opacity, 0.12);
  });

  const showText = stage === 'writing' || stage === 'unfolding';

  return (
    <group ref={groupRef} position={[0.22, -0.4, -0.55]} scale={0.001}>
      <mesh>
        <planeGeometry args={[0.46, 0.62]} />
        <meshBasicMaterial ref={matRef} color="#f3ead9" transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
      {[0.18, 0.10, 0.02, -0.06, -0.14, -0.22].map((y) => (
        <mesh key={y} position={[0, y, 0.001]}>
          <planeGeometry args={[0.38, 0.006]} />
          <meshBasicMaterial color="#ddd0b8" transparent opacity={0} />
        </mesh>
      ))}
      {showText && (
        <Text
          position={[0, 0.05, 0.002]}
          fontSize={0.026}          
          maxWidth={0.36}
          lineHeight={1.4}
          color="#3a2c1a"
          anchorX="center"
          anchorY="middle"
          overflowWrap="break-word"
          clipRect={[-0.20, -0.26, 0.20, 0.26]}
        >
          {text || ' '}
        </Text>
      )}
    </group>
  );
}

function PenProp({ target, visible }: { target: THREE.Vector3; visible: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(target.x, target.y, target.z));
  
  useFrame(() => {
    pos.current.lerp(target, 0.07);
    if (ref.current) {
      ref.current.position.set(pos.current.x + 0.03, pos.current.y + 0.05, pos.current.z);
      ref.current.visible = visible;
    }
  });
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[0.5, 0.3, Math.PI / 2.2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.26, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function LetterStack({ count, hidden }: { count: number; hidden: boolean }) {
  const n = hidden ? 0 : Math.min(count, 8);
  return (
    <group position={[LEFT_STUMP[0], STUMP_TOP_Y, LEFT_STUMP[2]]}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, i * 0.018, 0]} rotation={[0, (i % 5) * 0.3 - 0.6, 0]}>
          <boxGeometry args={[0.16, 0.012, 0.11]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function CarriedBundle({ visible }: { visible: boolean }) {
  const gRef = useRef<THREE.Group>(null);
  const start = new THREE.Vector3(LEFT_STUMP[0], STUMP_TOP_Y + 0.05, LEFT_STUMP[2]);
  const end   = new THREE.Vector3(CHEST[0], CHEST[1] + 0.08, CHEST[2] - 0.05);
  const p     = useRef(0);

  useFrame(() => {
    const g = gRef.current;
    if (!g) return;
    p.current = THREE.MathUtils.lerp(p.current, visible ? 1 : 0, visible ? 0.06 : 0.2);
    g.position.copy(start.clone().lerp(end, p.current));
    g.visible = visible || p.current > 0.02;
  });

  return (
    <group ref={gRef} visible={false}>
      {[0,1,2].map((i) => (
        <mesh key={i} position={[0, i * 0.016, 0]} rotation={[0, (i % 3) * 0.25 - 0.3, 0]}>
          <boxGeometry args={[0.15, 0.012, 0.1]} />
          <meshStandardMaterial color="#e8dcc0" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function FlyingLetter({ active }: { active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const p   = useRef(0);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    p.current = active ? Math.min(1, p.current + delta / 1.0) : 0;
    const start = new THREE.Vector3(CHEST[0], CHEST[1] + 0.1, CHEST[2] - 0.15);
    const end   = new THREE.Vector3(...FIRE_POS);
    const pos   = start.lerp(end, p.current);
    pos.y      += Math.sin(p.current * Math.PI) * 0.5;
    m.position.copy(pos);
    m.rotation.set(p.current * 2.4, p.current * 4, 0);
    m.visible   = active && p.current > 0.01 && p.current < 0.99;
  });

  return (
    <mesh ref={ref} visible={false}>
      <boxGeometry args={[0.16, 0.012, 0.11]} />
      <meshStandardMaterial color="#e8dcc0" roughness={0.85} />
    </mesh>
  );
}

export default function RitualActors({ stage, letterText, savedLetters, burnThrow }: RitualActorsProps) {
  const stackHidden = ['collectingLetters','returningToBurn','throwing','burningFire'].includes(stage);
  const penVisible  = stage === 'grabbingLetter' || stage === 'returningToSeat';

  const penCameraPos = useMemo(() => new THREE.Vector3(0.32, -0.28, -0.45), []);

  return (
    <group>
      <Arms />
      <PenProp target={penCameraPos} visible={penVisible} />
      <HeldLetter stage={stage} text={letterText} />
      
      <LetterStack count={savedLetters} hidden={stackHidden} />
      <CarriedBundle visible={stage === 'returningToBurn'} />
      <FlyingLetter active={stage === 'throwing' && burnThrow} />
    </group>
  );
}