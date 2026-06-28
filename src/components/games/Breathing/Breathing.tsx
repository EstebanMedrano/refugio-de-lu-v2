import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import './Breathing.scss';

const PHASES = [
  { name: 'Inhala', duration: 4, color: '#10b981', textColor: '#ffffff' },
  { name: 'Retén',  duration: 7, color: '#8b5cf6', textColor: '#ffffff' },
  { name: 'Exhala', duration: 8, color: '#f59e0b', textColor: '#0f172a' },
] as const;

const CANVAS_SIZE  = 300;
const CIRCLE_MIN   = 80;
const CIRCLE_MAX   = 200;
const TOTAL_CYCLES = 3;

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export default function Breathing() {
  const navigate   = useNavigate();
  const { reduceLevel } = useAnxiety();

  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number | null>(null);
  const phaseStartRef  = useRef<number>(0);
  const currentPhaseRef = useRef<number>(0);

  const [isPlaying,    setIsPlaying]    = useState(false);
  const [cycleCount,   setCycleCount]   = useState(0);
  const [phaseLabel,   setPhaseLabel]   = useState('Listo');
  const [timeLabel,    setTimeLabel]    = useState('');
  const [isDone,       setIsDone]       = useState(false);

  // ── draw ────────────────────────────────────────────────────────────────────
  const drawCircle = useCallback((radius: number, phaseIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const phase = PHASES[phaseIndex];
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius);
    grad.addColorStop(0, phase.color);
    grad.addColorStop(1, adjustColor(phase.color, -30));

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = phase.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phase.name, cx, cy);
  }, []);

  // ── animation loop ───────────────────────────────────────────────────────────
  const animate = useCallback(() => {
    const now     = performance.now() / 1000;
    const elapsed = now - phaseStartRef.current;
    const pIdx    = currentPhaseRef.current;
    const phase   = PHASES[pIdx];
    const progress = Math.min(elapsed / phase.duration, 1);

    let radius: number;
    if (pIdx === 0)      radius = CIRCLE_MIN + (CIRCLE_MAX - CIRCLE_MIN) * progress;
    else if (pIdx === 1) radius = CIRCLE_MAX;
    else                 radius = CIRCLE_MAX - (CIRCLE_MAX - CIRCLE_MIN) * progress;

    drawCircle(radius, pIdx);
    setPhaseLabel(phase.name);
    setTimeLabel(`${Math.ceil(phase.duration - elapsed)}s`);

    if (progress >= 1) {
      const nextPhase = pIdx + 1;
      if (nextPhase >= PHASES.length) {
        // completed one full cycle
        currentPhaseRef.current = 0;
        phaseStartRef.current   = performance.now() / 1000;
        setCycleCount(prev => {
          const newCount = prev + 1;
          if (newCount >= TOTAL_CYCLES) {
            // game over
            setIsPlaying(false);
            setIsDone(true);
            setPhaseLabel('¡Completado!');
            setTimeLabel('✨');
            reduceLevel();
            setTimeout(() => navigate('/games'), 2500);
            return newCount;
          }
          return newCount;
        });
      } else {
        currentPhaseRef.current = nextPhase;
        phaseStartRef.current   = performance.now() / 1000;
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [drawCircle, navigate, reduceLevel]);

  // ── controls ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (isPlaying || isDone) return;
    phaseStartRef.current = performance.now() / 1000;
    setIsPlaying(true);
  }, [isPlaying, isDone]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    currentPhaseRef.current = 0;
    setCycleCount(0);
    setPhaseLabel('Listo');
    setTimeLabel('');
    setIsDone(false);
    drawCircle(CIRCLE_MIN, 0);
  }, [stop, drawCircle]);

  // ── start / stop the loop when isPlaying changes ─────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, animate]);

  // ── initial draw ─────────────────────────────────────────────────────────────
  useEffect(() => {
    drawCircle(CIRCLE_MIN, 0);
  }, [drawCircle]);

  return (
    <div className="breathing-game">
      <h2 className="text-center">
        <span className="breathing-game__title">🌬️ Respiración 4-7-8</span>
      </h2>
      <p className="breathing-game__subtitle">
        Sigue el ritmo del círculo. Completa {TOTAL_CYCLES} ciclos.
      </p>

      <div className="breathing-game__canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="breathing-game__canvas"
        />
      </div>

      <div className="breathing-game__info">
        <div className="breathing-game__phase">{phaseLabel}</div>
        {timeLabel && <div className="breathing-game__timer">{timeLabel}</div>}
        <div className="breathing-game__cycle">
          Ciclo {cycleCount}/{TOTAL_CYCLES}
        </div>
      </div>

      <div className="breathing-game__controls">
        <button
          className="btn-primary"
          onClick={start}
          disabled={isPlaying || isDone}
        >
          ▶️ Comenzar
        </button>
        <button
          className="btn-primary btn-pause"
          onClick={stop}
          disabled={!isPlaying}
        >
          ⏸️ Pausar
        </button>
        <button
          className="btn-primary btn-reset"
          onClick={reset}
        >
          🔄 Reiniciar
        </button>
      </div>

      <div className="breathing-game__back">
        <button className="btn-secondary" onClick={() => { stop(); navigate('/games'); }}>
          ← Volver a juegos
        </button>
      </div>
    </div>
  );
}