import { Suspense, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { Howl } from 'howler';

useGLTF.preload('/assets/3D/tito.glb');
useGLTF.preload('/assets/3D/lia.glb');

// ── Perro individual ─────────────────────────────────────
interface DogModelProps {
  glbPath: string;
  position: [number, number, number];
  angleRef: React.MutableRefObject<number>;
}

function DogModel({ glbPath, position, angleRef }: DogModelProps) {
  const ref = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(glbPath);
  const { actions }           = useAnimations(animations, ref);

  useEffect(() => {
    const names     = Object.keys(actions);
    const preferred = ['run', 'gallop', 'walk', 'trot', 'idle'];
    const matchName = names.find(n => preferred.some(w => n.toLowerCase().includes(w)));
    const action    = matchName ? actions[matchName] : (names.length ? actions[names[0]] : null);
    action?.reset().fadeIn(0.3).play();
    return () => { action?.fadeOut(0.3); };
  }, [actions]);

  useFrame(() => {
    if (!ref.current) return;
    // Rotar hacia la dirección de movimiento de la órbita
    // vx = -sin(angle): positivo = moviendo a la derecha
    const vx = -Math.sin(angleRef.current);
    const targetRotY = vx >= 0 ? Math.PI / 2 : -Math.PI / 2;
    ref.current.rotation.y = THREE.MathUtils.lerp(
      ref.current.rotation.y,
      targetRotY,
      0.06
    );
  });

  return (
    <group ref={ref} position={position} scale={0.45}>
      <primitive object={scene} />
    </group>
  );
}

// ── Nube procedural ──────────────────────────────────────
function Cloud() {
  return (
    <group>
      {/* Cuerpo principal */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#eaf6ff" emissive="#c0e8ff" emissiveIntensity={0.25} />
      </mesh>
      {/* Puff izquierdo */}
      <mesh position={[-0.23, -0.07, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#e8f4ff" emissive="#b8e4ff" emissiveIntensity={0.18} />
      </mesh>
      {/* Puff derecho */}
      <mesh position={[0.24, -0.05, 0]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#e8f4ff" emissive="#b8e4ff" emissiveIntensity={0.18} />
      </mesh>
      {/* Base inferior */}
      <mesh position={[0, -0.17, 0]}>
        <sphereGeometry args={[0.23, 16, 16]} />
        <meshStandardMaterial color="#ddeeff" emissive="#aaddff" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}

// ── Componente principal ─────────────────────────────────
export default function FlyingDogs() {
  const cloudRef  = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const angleRef  = useRef(0);
  const barkSound = useRef<Howl | null>(null);
  const lastBarkT = useRef(0);
  const nextBarkIn = useRef(2.5 + Math.random() * 3); // primer ladrido 2.5-5.5s

  useEffect(() => {
    try {
      barkSound.current = new Howl({
        src: ['/assets/sounds/lia-bark.mp3'],
        volume: 0.5,
      });
    } catch {
      console.warn('No se pudo cargar lia-bark.mp3');
    }
    return () => { barkSound.current?.unload(); };
  }, []);

  useFrame(state => {
    if (!cloudRef.current) return;
    const t = state.clock.elapsedTime;

    const speed = 0.45;           // rad/s → una vuelta cada ~14s
    angleRef.current = t * speed;

    // Órbita elíptica centrada un poco arriba del centro de pantalla
    const rx = viewport.width  * 0.36;
    const ry = viewport.height * 0.26;
    const cy = viewport.height * 0.04; // centro ligeramente arriba

    cloudRef.current.position.x = Math.cos(angleRef.current) * rx;
    cloudRef.current.position.y = Math.sin(angleRef.current) * ry + cy;

    // Flotación suave en profundidad
    cloudRef.current.position.z = Math.sin(t * 1.3) * 0.08;

    // Inclinación sutil en la dirección del movimiento (se nota más que se ve)
    const vx = -Math.sin(angleRef.current);
    const vy =  Math.cos(angleRef.current) * (ry / rx);
    cloudRef.current.rotation.z = Math.atan2(vy, vx) * 0.1;

    // Ladridos en intervalos aleatorios
    if (t - lastBarkT.current > nextBarkIn.current) {
      barkSound.current?.play();
      lastBarkT.current = t;
      nextBarkIn.current = 3 + Math.random() * 5; // próximo ladrido: 3-8s
    }
  });

  return (
    <group ref={cloudRef}>
      <Cloud />
      <Suspense fallback={null}>
        {/* Tito: derecha de la nube */}
        <DogModel glbPath="/assets/3D/tito.glb" position={[ 0.19, 0.20, 0]} angleRef={angleRef} />
        {/* Lia: izquierda de la nube */}
        <DogModel glbPath="/assets/3D/lia.glb"  position={[-0.19, 0.20, 0]} angleRef={angleRef} />
      </Suspense>
    </group>
  );
}