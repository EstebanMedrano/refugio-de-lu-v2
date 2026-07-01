import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { Howl } from 'howler';
import SplashScene from './SplashScene';
import './SplashScreen.scss';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [stage, setStage] = useState<'intro' | 'revealed'>('intro');
  const [progress, setProgress] = useState(0);
  const hasFinished = useRef(false);
  const revealedRef = useRef(false);
  const musicSound = useRef<Howl | null>(null);

  useEffect(() => {
    try {
      musicSound.current = new Howl({
        src: ['/assets/sounds/ambient-432hz.mp3'],
        volume: 0.2,
        loop: true,
      });
    } catch {
      console.warn('Sonido no disponible');
    }
  }, []);

  const handleRevealed = () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setStage('revealed');
  };

  // timeout de seguridad
  useEffect(() => {
    const timeout = setTimeout(handleRevealed, 4000);
    return () => clearTimeout(timeout);
  }, []);

  // barra de progreso
  useEffect(() => {
    if (stage !== 'revealed') return;
    const totalDuration = 5000;
    const intervalTime = 100;
    const increment = 100 / (totalDuration / intervalTime);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (musicSound.current && !hasFinished.current) {
            musicSound.current.play();
            hasFinished.current = true;
            setTimeout(onFinish, 500);
          }
          return 100;
        }
        return Math.min(prev + increment, 100);
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [stage, onFinish]);

  return createPortal(
    <div className="splash-screen">
      {/* Canvas 3D de fondo */}
      <Canvas
        camera={{ position: [0, 1.1, 4.4], fov: 42 }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <SplashScene onRevealed={handleRevealed} />
      </Canvas>

      {/* Título HTML — fuera del Canvas, sin depender de troika/WASM */}
      <div className={`splash-screen__title ${stage === 'revealed' ? 'visible' : ''}`}>
        Espacio de Calma
      </div>

      {/* Barra de carga */}
      {stage === 'revealed' && (
        <div className="splash-screen__bar-wrap">
          <div className="splash-screen__bar">
            <div
              className="splash-screen__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="splash-screen__percent">{Math.floor(progress)}%</p>
        </div>
      )}
    </div>,
    document.body
  );
}