import { useMemo } from 'react';

const COUNT = 6500;

export default function CustomStars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const cosP  = Math.random();
      const sinP  = Math.sqrt(1 - cosP * cosP);
      const r     = 60 + Math.random() * 40;
      arr[i * 3]     = r * sinP * Math.cos(theta);
      arr[i * 3 + 1] = r * cosP;       // Y-up Three.js → solo hemisferio superior
      arr[i * 3 + 2] = r * sinP * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points renderOrder={-1}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.55}
        color="#d8eaff"
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        fog={false}   /* ← la clave: niebla nunca las toca */
      />
    </points>
  );
}