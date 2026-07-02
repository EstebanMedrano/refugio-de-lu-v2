import { useMemo } from 'react';

export const RIGHT_STUMP: [number, number, number] = [1.65, 0.2, 0.6];
export const LEFT_STUMP: [number, number, number] = [-1.65, 0.2, 0.6];
export const STUMP_TOP_Y = 0.43;

interface TreeTransform {
  position: [number, number, number];
  scale: number;
  rotationY: number;
}

function generateTrees(count: number, minRadius: number, maxRadius: number): TreeTransform[] {
  const trees: TreeTransform[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    trees.push({
      position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      scale: 0.8 + Math.random() * 0.6,
      rotationY: Math.random() * Math.PI * 2,
    });
  }
  return trees;
}

function Pine({ position, scale, rotationY }: TreeTransform) {
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 1, 6]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.55, 1.1, 7]} />
        <meshStandardMaterial color="#163a26" roughness={1} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <coneGeometry args={[0.42, 0.9, 7]} />
        <meshStandardMaterial color="#1c4530" roughness={1} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <coneGeometry args={[0.28, 0.7, 7]} />
        <meshStandardMaterial color="#235a3c" roughness={1} />
      </mesh>
    </group>
  );
}

function Stump({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <cylinderGeometry args={[0.32, 0.36, 0.42, 10]} />
      <meshStandardMaterial color="#3a2614" roughness={0.95} />
    </mesh>
  );
}

function PenOnDesk() {
  return (
    <mesh
      position={[RIGHT_STUMP[0] + 0.05, STUMP_TOP_Y + 0.02, RIGHT_STUMP[2] - 0.1]}
      rotation={[0, 0.4, Math.PI / 2.1]}
    >
      <cylinderGeometry args={[0.012, 0.012, 0.32, 8]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.3} />
    </mesh>
  );
}

function LettersOnDesk({ count = 3 }: { count?: number }) {
  return (
    <group position={[RIGHT_STUMP[0], STUMP_TOP_Y, RIGHT_STUMP[2] + 0.1]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[0, i * 0.012, 0]} rotation={[0, 0.15 * i, 0]}>
          <boxGeometry args={[0.28, 0.01, 0.2]} />
          <meshStandardMaterial color="#f3ead9" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function ForestScene({ lettersOnDesk = 3 }: { lettersOnDesk?: number }) {
  const trees = useMemo(() => generateTrees(50, 4, 13), []);

  return (
    <group>
        {/* ...suelo, árboles, troncos... */}
      <LettersOnDesk count={lettersOnDesk} />
      <PenOnDesk />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[16, 32]} />
        <meshStandardMaterial color="#10160f" roughness={1} />
      </mesh>

      {trees.map((tree, i) => (
        <Pine key={i} {...tree} />
      ))}

      <Stump position={RIGHT_STUMP} />
      <Stump position={LEFT_STUMP} />
      <LettersOnDesk />
      <PenOnDesk />
    </group>
  );
}