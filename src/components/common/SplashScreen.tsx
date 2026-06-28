import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showBar, setShowBar] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const totalFrames = 8;
  const hasFinished = useRef(false);
  const isRevealed = useRef(false);

  const musicSound = useRef<Howl | null>(null);

  useEffect(() => {
    try {
      musicSound.current = new Howl({ src: ['/assets/sounds/ambient-432hz.mp3'], volume: 0.2, loop: true });
    } catch (e) {
      console.warn('Sonido no disponible');
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 50;

    let lightX = centerX;
    let lightY = centerY;
    let lightRadius = 30;
    let lightVX = 1.8;
    let lightVY = 1.4;
    const maxRadius = Math.max(canvas.width, canvas.height) * 0.7;
    let frameId: number;

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#050510');
    bgGradient.addColorStop(0.25, '#0a0a1a');
    bgGradient.addColorStop(0.5, '#0d1b2a');
    bgGradient.addColorStop(0.75, '#0a0a1a');
    bgGradient.addColorStop(1, '#050510');

    const drawRevealedArea = () => {
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const textGradient = ctx.createLinearGradient(centerX - 200, centerY, centerX + 200, centerY);
      textGradient.addColorStop(0, '#f8fafc');
      textGradient.addColorStop(1, '#10b981');

      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = textGradient;
      ctx.fillText('Espacio de Calma', centerX, centerY);
    };

    const animate = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      lightX += lightVX;
      lightY += lightVY;

      const minX = centerX - 250;
      const maxX = centerX + 250;
      const minY = centerY - 50;
      const maxY = centerY + 50;

      if (lightX < minX || lightX > maxX) {
        lightVX *= -1;
        if (!isRevealed.current) lightRadius += 10;
      }
      if (lightY < minY || lightY > maxY) {
        lightVY *= -1;
        if (!isRevealed.current) lightRadius += 10;
      }

      if (!isRevealed.current) {
        lightRadius += 0.6;
      }

      if (!isRevealed.current && lightRadius >= maxRadius) {
        isRevealed.current = true;
        setShowBar(true);
        lightRadius = maxRadius;
      }

      const haloGradient = ctx.createRadialGradient(lightX, lightY, lightRadius * 0.6, lightX, lightY, lightRadius);
      haloGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      haloGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
      ctx.clip();
      drawRevealedArea();

      // 🔥 Borde degradado MUCHO MÁS NOTORIO
      const borderGradient = ctx.createRadialGradient(lightX, lightY, lightRadius * 0.5, lightX, lightY, lightRadius);
      borderGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      borderGradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      ctx.strokeStyle = borderGradient;
      ctx.lineWidth = 35;
      ctx.beginPath();
      ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      frameId = requestAnimationFrame(animate);
    };

    animate();

    const timeout = setTimeout(() => {
      if (!isRevealed.current) {
        isRevealed.current = true;
        setShowBar(true);
      }
    }, 4000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!showBar) return;

    const totalDuration = 5000;
    const intervalTime = 100;
    const increment = 100 / (totalDuration / intervalTime);

    const interval = setInterval(() => {
      setProgress(prev => {
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
  }, [showBar, onFinish]);

  useEffect(() => {
    if (!showBar || progress >= 100) return;
    const frameInterval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % totalFrames);
    }, 100);
    return () => clearInterval(frameInterval);
  }, [showBar, progress]);

  const barWidth = 300;
  const titoLeft = `calc(50% - ${barWidth / 2}px - 50px + ${(progress / 100) * barWidth}px)`;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'black', zIndex: 9999 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
      {showBar && (
        <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '400px', zIndex: 10 }}>
          <div style={{ width: '300px', height: '12px', background: '#333', borderRadius: '6px', margin: '0 auto', position: 'relative' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', borderRadius: '6px', transition: 'width 0.1s linear' }} />
            <div
              style={{
                position: 'absolute',
                left: titoLeft,
                bottom: '15px',
                width: '50px',
                height: '50px',
                backgroundImage: 'url(/assets/img/perros/tito-sprites.png)',
                backgroundSize: `${80 * totalFrames / (80/50)}px 50px`,
                backgroundPosition: `-${currentFrame * 50}px 0`,
                imageRendering: 'auto',
                transition: 'left 0.1s linear'
              }}
            />
          </div>
          <p style={{ color: 'white', marginTop: '10px' }}>{Math.floor(progress)}%</p>
        </div>
      )}
    </div>
  );
}