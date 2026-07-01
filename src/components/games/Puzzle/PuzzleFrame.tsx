import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useTexture, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { SnapSparkle } from './sparkleShader';
import type { Phase } from './Puzzle';

const GRID           = 4;
const SNAP_DIST      = 0.28;  // más generoso para facilitar el snap
const SCATTER_DUR    = 1.2;
const SETTLE_DELAY   = 2400;

interface PuzzleFrameProps {
  phase:      Phase;
  textureUrl: string;
  center:     THREE.Vector3;
  size:       { w: number; h: number };
  floatDepth: number;
  onSettled:  () => void;
  onSnap:     (n: number) => void;
  onComplete: () => void;
}

export default function PuzzleFrame({ phase, textureUrl, center, size, floatDepth, onSettled, onSnap, onComplete }: PuzzleFrameProps) {
  const texture = useTexture(textureUrl);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  const snapCountRef = useRef(0);
  const [breakTick, setBreakTick] = useState(0);

  useEffect(() => {
    if (phase !== 'breaking') return;
    snapCountRef.current = 0;
    setBreakTick(t => t + 1);
    const t = setTimeout(onSettled, SETTLE_DELAY);
    return () => clearTimeout(t);
  }, [phase, onSettled]);

  const handleSnap = useCallback(() => {
    snapCountRef.current += 1;
    onSnap(snapCountRef.current);
    if (snapCountRef.current >= GRID * GRID) setTimeout(onComplete, 600);
  }, [onSnap, onComplete]);

  const pw = size.w / GRID;
  const ph = size.h / GRID;
  const showPieces = phase !== 'idle' && phase !== 'calling' && phase !== 'intro';

  const pieces = useMemo(() => {
    const arr: { row: number; col: number; target: THREE.Vector3 }[] = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        arr.push({
          row, col,
          target: new THREE.Vector3(
            center.x - size.w / 2 + pw * col + pw / 2,
            center.y + size.h / 2 - ph * row - ph / 2,
            center.z + 0.018
          ),
        });
      }
    }
    return arr;
  }, [center, size, pw, ph]);

  return (
    <group>
      {/* ── Wooden frame border ── */}
      <group position={center}>
        {([
          [0,  size.h/2+0.045, 0, [size.w+0.18, 0.09, 0.07]],
          [0, -size.h/2-0.045, 0, [size.w+0.18, 0.09, 0.07]],
          [-size.w/2-0.045, 0, 0, [0.09, size.h, 0.07]],
          [ size.w/2+0.045, 0, 0, [0.09, size.h, 0.07]],
        ] as [number, number, number, [number, number, number]][]).map(([x,y,z,args], i) => (
          <mesh key={i} position={[x,y,z]} castShadow>
            <boxGeometry args={args} />
            <meshStandardMaterial color="#8b5e30" roughness={0.6} />
          </mesh>
        ))}
        {/* Backing */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[size.w, size.h]} />
          <meshStandardMaterial color="#f0e8d8" />
        </mesh>
      </group>

      {/* ── Intact image (idle/calling/intro) ── */}
      {!showPieces && (
        <mesh position={[center.x, center.y, center.z + 0.018]}>
          <planeGeometry args={[size.w, size.h]} />
          <meshStandardMaterial map={texture} roughness={0.85} />
        </mesh>
      )}

      {/* ── Target slots (dotted guides) ── */}
      {showPieces && pieces.map((p, i) => (
        <mesh key={i} position={[p.target.x, p.target.y, p.target.z - 0.005]}>
          <planeGeometry args={[pw * 0.96, ph * 0.96]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.06} />
        </mesh>
      ))}

      {/* ── Puzzle pieces ── */}
      {pieces.map((p, i) => (
        <Piece
          key={`${breakTick}-${i}`}
          texture={texture}
          row={p.row} col={p.col}
          pieceW={pw} pieceH={ph}
          target={p.target}
          frameCenter={center}
          floatDepth={floatDepth}
          phase={phase}
          visible={showPieces}
          onSnap={handleSnap}
        />
      ))}
    </group>
  );
}

// ── Individual piece ──────────────────────────────────────────────────────
interface PieceProps {
  texture:     THREE.Texture;
  row:         number;
  col:         number;
  pieceW:      number;
  pieceH:      number;
  target:      THREE.Vector3;
  frameCenter: THREE.Vector3;
  floatDepth:  number;
  phase:       Phase;
  visible:     boolean;
  onSnap:      () => void;
}

type PieceSub = 'attached' | 'scatter' | 'float' | 'placed';

function Piece({ texture, row, col, pieceW, pieceH, target, frameCenter, floatDepth, phase, visible, onSnap }: PieceProps) {
  const meshRef    = useRef<THREE.Mesh>(null);
  const sub        = useRef<PieceSub>('attached');
  const vel        = useRef(new THREE.Vector3());
  const scatterClk = useRef(0);
  const seed       = useMemo(() => Math.random() * Math.PI * 2, []);
  const dragging   = useRef(false);
  const destRef    = useRef(new THREE.Vector3());
  const [placed,   setPlaced]     = useState(false);
  const [snapped,  setSnapped]    = useState(false);

  const { camera, gl } = useThree();

  const geo = useMemo(() => {
    const g  = new THREE.PlaneGeometry(pieceW * 0.93, pieceH * 0.93);
    const uv = g.attributes.uv;
    const u0 = col / GRID, u1 = (col+1) / GRID;
    const v0 = 1-(row+1)/GRID, v1 = 1-row/GRID;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1);
    uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
    return g;
  }, [pieceW, pieceH, row, col]);

  // Start scatter when breaking
  useEffect(() => {
    if (phase !== 'breaking' || sub.current !== 'attached') return;
    sub.current     = 'scatter';
    scatterClk.current = 0;
    if (meshRef.current) meshRef.current.position.copy(target);

    // Scatter LEFT (col 0,1) or RIGHT (col 2,3)
    const toLeft = col < GRID / 2;
    const xSign  = toLeft ? -1 : 1;
    const speed  = 2.4 + Math.random() * 2.8;
    vel.current.set(
      xSign * speed * (0.8 + Math.random() * 0.5),
      Math.random() * 3.0 + 0.6,
      0.1 + Math.random() * 0.5   // slightly toward camera
    );
  }, [phase, target, col]);

  useFrame((state, dt) => {
    const m = meshRef.current;
    if (!m || dragging.current || sub.current === 'placed' || sub.current === 'attached') return;
    const t = state.clock.elapsedTime;

    if (sub.current === 'scatter') {
      scatterClk.current += dt;
      m.position.addScaledVector(vel.current, dt);
      vel.current.y -= 2.8 * dt;
      vel.current.multiplyScalar(0.975);
      m.rotation.x += vel.current.x * 0.025;
      m.rotation.y += vel.current.z * 0.025;
      // Floor bounce
      const floor = frameCenter.y - 1.5;
      if (m.position.y < floor) {
        m.position.y = floor;
        vel.current.y  *= -0.28;
        vel.current.x  *= 0.72;
        vel.current.z  *= 0.72;
      }
      if (scatterClk.current > SCATTER_DUR) sub.current = 'float';

    } else if (sub.current === 'float') {
      // Organized float positions to the SIDES of the frame
      const toLeft     = col < GRID / 2;
      const colInPanel = toLeft ? col : col - GRID / 2;  // 0 or 1
      const panelX     = toLeft
        ? -2.7 + colInPanel * 0.72   // left:  -2.7 to -2.0
        :  1.8 + colInPanel * 0.72;  // right:  1.8 to  2.5
      const rowFrac = row / (GRID - 1);

      destRef.current.set(
        panelX + Math.sin(seed) * 0.1,
        0.42 + rowFrac * 1.65 + Math.sin(seed * 1.9) * 0.07,
        floatDepth
      );
      m.position.lerp(destRef.current, Math.min(1, dt * 1.6));
      m.position.y   += Math.sin(t * 1.1 + seed) * 0.0006;
      m.rotation.x   *= 0.93;
      m.rotation.y   *= 0.93;
      m.rotation.z    = Math.sin(t * 0.6 + seed) * 0.012;
    }
  });

  // ── Drag handler ──────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'puzzle' || placed) return;
    e.stopPropagation();
    const m = meshRef.current;
    if (!m) return;

    dragging.current = true;

    // Move piece to frame's z depth for intuitive dragging
    const dragZ = target.z + 0.015;
    m.position.z  = dragZ;
    const plane   = new THREE.Plane(new THREE.Vector3(0, 0, 1), -dragZ);

    const rect  = gl.domElement.getBoundingClientRect();
    const ray   = new THREE.Raycaster();
    const ndc   = new THREE.Vector2();
    const hit   = new THREE.Vector3();
    let offset  = new THREE.Vector3();

    // Initial offset so piece doesn't jump
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) offset = hit.clone().sub(m.position);

    // Highlight
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0x281400);

    const onMove = (ev: PointerEvent) => {
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        m.position.x = hit.x - offset.x;
        m.position.y = hit.y - offset.y;
      }
    };

    const onUp = () => {
      dragging.current = false;
      mat.emissive.setHex(0);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);

      // Snap based on 2D (x,y) distance only
      const dx   = m.position.x - target.x;
      const dy   = m.position.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < SNAP_DIST) {
        m.position.copy(target);
        m.rotation.set(0, 0, 0);
        sub.current = 'placed';
        setPlaced(true);
        setSnapped(true);
        onSnap();
        setTimeout(() => setSnapped(false), 700);
      } else {
        m.position.z = floatDepth; // return to float depth
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, [phase, placed, gl, camera, target, floatDepth, onSnap]);

  return (
    <mesh
      ref={meshRef}
      geometry={geo}
      position={target}
      visible={visible}
      onPointerDown={handlePointerDown}
      onPointerOver={() => { if (phase === 'puzzle' && !placed) gl.domElement.style.cursor = 'grab'; }}
      onPointerOut={()  => { gl.domElement.style.cursor = 'default'; }}
      castShadow
    >
      <meshStandardMaterial map={texture} roughness={0.82} />
      {placed && <Edges color="#22e07a" lineWidth={2.5} threshold={1} />}
      {snapped && <SnapSparkle />}
    </mesh>
  );
}