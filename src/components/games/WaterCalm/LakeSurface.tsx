// LakeSurface.tsx — Plano de agua con shader: detecta clicks del láser
// Fix: useRef eliminado (no se usaba → TS6133 corregido)
import { useMemo, useEffect, useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { createWaterMaterial, pushRipple } from './waterShader';
import { LAKE_Y, LAKE_CENTER_Z, LAKE_RADIUS } from './lakeConstants';
import type { LakeWorld } from './WaterCalm';

interface Props {
  world: React.MutableRefObject<LakeWorld>;
  active: boolean;
}

export default function LakeSurface({ world, active }: Props) {
  const material = useMemo(
    () => createWaterMaterial(LAKE_RADIUS, LAKE_CENTER_Z),
    [],
  );

  useEffect(() => () => { material.dispose(); }, [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!active) return;
    e.stopPropagation();
    const { x, z } = e.point;
    const color = world.current.getColor();
    pushRipple(material, x, z, material.uniforms.uTime.value, color);
    world.current.fireShot(x, z, color);
  }, [active, material, world]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, LAKE_Y, LAKE_CENTER_Z]}
      onPointerDown={handlePointerDown}
      material={material}
    >
      {/* 120×120 subdivisiones para el desplazamiento de vértices */}
      <planeGeometry args={[LAKE_RADIUS * 2, LAKE_RADIUS * 2, 120, 120]} />
    </mesh>
  );
}