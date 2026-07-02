import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { Howl } from 'howler';
import RippleCanvas from './RippleCanvas';
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
  const musicSound  = useRef<Howl | null>(null);

  useEffect(() => {
    try {
      musicSound.current = new Howl({
        src: ['/assets/sounds/ambient-432hz.mp3'],
        volume: 0.2,
        loop: true,
      });
      musicSound.current.play(); // ← suena desde el primer segundo del splash
    } catch {
      console.warn('Sonido no disponible');
    }
  }, []);

  const handleRevealed = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setStage('revealed');
  }, []);

  useEffect(() => {
    const timeout = setTimeout(handleRevealed, 5500);
    return () => clearTimeout(timeout);
  }, [handleRevealed]);

  useEffect(() => {
    if (stage !== 'revealed') return;
    const intervalTime = 100;
    const increment   = 100 / (5000 / intervalTime);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!hasFinished.current) {
            hasFinished.current = true;
            setTimeout(onFinish, 600); // música ya suena, solo cerramos el splash
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
      <RippleCanvas onRevealed={handleRevealed} />

      {stage === 'revealed' && (
        <Canvas
          className="splash-screen__threejs"
          camera={{ position: [0, 0, 5], fov: 50 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
        >
          <SplashScene />
        </Canvas>
      )}

      {stage === 'revealed' && (
        <div className="splash-screen__bar-wrap">
          <div className="splash-screen__bar">
            <div className="splash-screen__bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="splash-screen__percent">{Math.floor(progress)}%</p>
        </div>
      )}
    </div>,
    document.body
  );
}