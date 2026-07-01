import * as THREE from 'three';
import { useRef, Suspense } from 'react';
import CameraRig from './CameraRig';
import Dog3D from './Dog3D';
import PuzzleFrame from './PuzzleFrame';
import type { Phase, DogType } from './Puzzle';

export const FRAME_CENTER = new THREE.Vector3(0, 1.58, -4.45);
export const FRAME_SIZE   = { w: 2.3, h: 1.7 };
export const DOOR_POS     = new THREE.Vector3(4.3, 0, 0.8);
export const WATCH_POS    = new THREE.Vector3(2.2, 0, -3.0);
export const FLOAT_DEPTH  = FRAME_CENTER.z + 1.55; // z ≈ -2.9

interface Props {
  phase: Phase; dogType: DogType; callId: number; texture: string;
  onImpact: () => void; onSettled: () => void;
  onSnap: (n: number) => void; onComplete: () => void;
}

export default function BedroomScene({ phase, dogType, callId, texture, onImpact, onSettled, onSnap, onComplete }: Props) {
  const dogPosRef = useRef(new THREE.Vector3());

  return (
    <>
      {/* ── Lights ── */}
      <hemisphereLight args={['#fdf6ea', '#4a3020', 1.1]} />
      <ambientLight intensity={0.6} color="#fff8ef" />
      <directionalLight
        position={[-2.5, 5.5, 1.5]} intensity={2.2} color="#fff5e0"
        castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7} shadow-camera-right={7}
        shadow-camera-top={7}  shadow-camera-bottom={-7}
      />
      <pointLight position={[-2.5, 2.0, -3.0]} intensity={0.6} color="#ffd090" distance={5} />
      <pointLight position={[2.5,  2.0, -3.0]} intensity={0.35} color="#ffe8c0" distance={4} />

      {/* ── Floor ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#c0a06a" roughness={0.9} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.35, 0]}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#ede8de" roughness={1} />
      </mesh>

      {/* ── Back wall ── */}
      <mesh position={[0, 1.68, -5.0]} receiveShadow>
        <planeGeometry args={[12, 3.4]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.98} />
      </mesh>

      {/* ── Left wall ── */}
      <mesh position={[-5.0, 1.68, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 3.4]} />
        <meshStandardMaterial color="#ede6d5" roughness={0.98} />
      </mesh>

      {/* ── Right wall ── */}
      <mesh position={[5.0, 1.68, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[12, 3.4]} />
        <meshStandardMaterial color="#ede6d5" roughness={0.98} />
      </mesh>

      {/* ── Window on left wall ── */}
      <mesh position={[-4.97, 1.9, -2.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.9, 1.45]} />
        <meshBasicMaterial color="#b8e0ff" toneMapped={false} />
      </mesh>
      <pointLight position={[-4.4, 1.9, -2.2]} intensity={0.55} color="#c8e8ff" distance={5} />
      {/* Window frame bars */}
      {([
        { pos: [-4.96, 1.9, -2.2] as [number,number,number], rot: [0, Math.PI/2, Math.PI/2] as [number,number,number], args: [0.05, 1.47, 0.05] as [number,number,number] },
        { pos: [-4.96, 1.9, -2.2] as [number,number,number], rot: [0, Math.PI/2, 0]         as [number,number,number], args: [0.05, 1.92, 0.05] as [number,number,number] },
      ]).map((b, i) => (
        <mesh key={i} position={b.pos} rotation={b.rot}>
          <boxGeometry args={b.args} /><meshStandardMaterial color="#7a5228" />
        </mesh>
      ))}

      {/* ── Door on right wall (dog entrance) ── */}
      <mesh position={[4.97, 1.1, 0.8]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.25, 2.2]} />
        <meshStandardMaterial color="#120a04" />
      </mesh>
      {/* Door frame */}
      {([
        { pos: [4.96, 1.1, 0.17] as [number,number,number], args: [0.07, 2.22, 0.07] as [number,number,number] },
        { pos: [4.96, 1.1, 1.43] as [number,number,number], args: [0.07, 2.22, 0.07] as [number,number,number] },
      ]).map((b, i) => (
        <mesh key={i} position={b.pos} rotation={[0, -Math.PI/2, 0]}>
          <boxGeometry args={b.args} /><meshStandardMaterial color="#8b5e30" />
        </mesh>
      ))}

      {/* ── Bed (right-back) ── */}
      <group position={[3.2, 0, -3.5]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.65, 0.52, 2.45]} /><meshStandardMaterial color="#7a4a2a" />
        </mesh>
        <mesh position={[0, 0.58, 0]} castShadow>
          <boxGeometry args={[1.55, 0.24, 2.32]} /><meshStandardMaterial color="#edf0f8" />
        </mesh>
        <mesh position={[0, 0.65, -0.92]} castShadow>
          <boxGeometry args={[1.35, 0.12, 0.38]} /><meshStandardMaterial color="#d4d8e8" />
        </mesh>
        <mesh position={[0, 0.7, 0.32]} castShadow>
          <boxGeometry args={[1.52, 0.09, 1.55]} /><meshStandardMaterial color="#7090c0" />
        </mesh>
        <mesh position={[0, 0.88, -1.22]}>
          <boxGeometry args={[1.65, 1.15, 0.09]} /><meshStandardMaterial color="#5c3a20" />
        </mesh>
      </group>

      {/* ── Desk (left-back, under window) ── */}
      <group position={[-3.8, 0, -2.5]}>
        <mesh position={[0, 0.64, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.06, 0.7]} /><meshStandardMaterial color="#8b5e30" />
        </mesh>
        {([[-0.55,-0.27],[0.55,-0.27],[-0.55,0.27],[0.55,0.27]] as [number,number][]).map(([x,z],i)=>(
          <mesh key={i} position={[x, 0.31, z]} castShadow>
            <boxGeometry args={[0.06, 0.62, 0.06]} /><meshStandardMaterial color="#6b4524" />
          </mesh>
        ))}
        {/* Desk lamp */}
        <mesh position={[0.44, 0.76, -0.2]} castShadow>
          <cylinderGeometry args={[0.042, 0.07, 0.22, 10]} /><meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0.44, 0.9, -0.2]}>
          <coneGeometry args={[0.14, 0.18, 10, 1, true]} />
          <meshStandardMaterial color="#ffd98a" emissive="#ffb347" emissiveIntensity={0.9} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0.44, 0.84, -0.2]} intensity={0.5} color="#ffcf8a" distance={2.5} />
        {/* Books */}
        {[{ c:'#c14848',w:0.22 },{ c:'#3f7ac1',w:0.18 },{ c:'#2d8a3e',w:0.15 }].map((b,i)=>(
          <mesh key={i} position={[-0.38+i*0.2, 0.7, 0.12]} castShadow>
            <boxGeometry args={[b.w, 0.06, 0.18]} /><meshStandardMaterial color={b.c} />
          </mesh>
        ))}
      </group>

      {/* ── Rug ── */}
      <mesh position={[0, 0.003, -2]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.9, 48]} />
        <meshStandardMaterial color="#b86080" roughness={1} />
      </mesh>

      {/* ── Potted plant (corner) ── */}
      <group position={[-3.8, 0, -4.4]}>
        <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.15, 0.18, 0.42, 8]} /><meshStandardMaterial color="#a06840" /></mesh>
        <mesh position={[0, 0.58, 0]}><sphereGeometry args={[0.3, 10, 8]} /><meshStandardMaterial color="#2d8a3e" /></mesh>
      </group>

      <CameraRig phase={phase} dogPosRef={dogPosRef} />

      <Dog3D
        dogType={dogType} callId={callId}
        doorPos={DOOR_POS} framePos={FRAME_CENTER} watchPos={WATCH_POS}
        onImpact={onImpact} positionRef={dogPosRef}
      />

      <Suspense fallback={null}>
        <PuzzleFrame
          phase={phase} textureUrl={texture}
          center={FRAME_CENTER} size={FRAME_SIZE} floatDepth={FLOAT_DEPTH}
          onSettled={onSettled} onSnap={onSnap} onComplete={onComplete}
        />
      </Suspense>
    </>
  );
}