import { useEffect, useRef } from 'react';

interface Star {
  fx: number; fy: number;
  size: number; opacity: number;
  twinkleOffset: number;
}

interface Drop {
  xOffset: number;   // offset desde el centro (fijo)
  x: number;        // posición real (calculada al init)
  targetY: number;
  y: number;
  vy: number;
  triggerTime: number;
  active: boolean;
  triggered: boolean;
}

interface Ripple {
  x: number; y: number;
  clipRadius: number;  // crece hasta maxRadius y se queda ahí
  maxRadius: number;
  startTime: number;
  duration: number;    // ms
}

const GRAVITY = 650; // px/s²
const DROP_DEFS = [
  { xOffset: -65, triggerTime: 0.5 },
  { xOffset:  45, triggerTime: 1.3 },
  { xOffset: -15, triggerTime: 2.1 },
];

export default function RippleCanvas({ onRevealed }: { onRevealed: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Estrellas como fracciones 0-1 para que sobrevivan el resize
    const stars: Star[] = Array.from({ length: 190 }, () => ({
      fx: Math.random(), fy: Math.random(),
      size: Math.random() * 1.4 + 0.3,
      opacity: Math.random() * 0.65 + 0.25,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    const drops: Drop[] = DROP_DEFS.map(d => ({
      ...d, x: 0, targetY: 0, y: -20, vy: 0,
      active: false, triggered: false,
    }));

    const ripples: Ripple[] = [];
    let frameId: number;
    let startTs: number | null = null;
    let lastTs: number | null = null;
    let initialized = false;

    const draw = (ts: number) => {
      if (!startTs) startTs = ts;
      if (!lastTs)  lastTs  = ts;
      const elapsed = (ts - startTs) / 1000;
      const delta   = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // Init con tamaño real del canvas
      if (!initialized) {
        drops.forEach(d => {
          d.x = cx + d.xOffset;
          d.targetY = cy;
          d.y = -20; d.vy = 0;
        });
        initialized = true;
      }

      // ── Fondo ──────────────────────────────────────────
      ctx.fillStyle = '#010108';
      ctx.fillRect(0, 0, W, H);

      // ── Estrellas con parpadeo sutil ───────────────────
      stars.forEach(s => {
        const twinkle = Math.sin(ts * 0.001 + s.twinkleOffset) * 0.18;
        ctx.beginPath();
        ctx.arc(s.fx * W, s.fy * H, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${Math.max(0, s.opacity + twinkle)})`;
        ctx.fill();
      });

      // ── Gotas ──────────────────────────────────────────
      drops.forEach(drop => {
        // Disparar
        if (!drop.triggered && elapsed >= drop.triggerTime) {
          drop.triggered = true; drop.active = true;
          drop.y = -20; drop.vy = 0;
        }
        if (!drop.active) return;

        // Física
        drop.vy += GRAVITY * delta;
        drop.y  += drop.vy * delta;

        if (drop.y >= drop.targetY) {
          drop.active = false;
          ripples.push({
            x: drop.x, y: drop.targetY,
            clipRadius: 0,
            maxRadius: Math.min(Math.sqrt(W * W + H * H) * 0.65, 1200),
            startTime: ts,
            duration: 2600,
          });
          return;
        }

        // Dibujar gota
        ctx.save();
        ctx.translate(drop.x, drop.y);

        // Cola con largura proporcional a velocidad
        const tailLen = Math.min(drop.vy * 0.052, 26);
        const tailGrad = ctx.createLinearGradient(0, 0, 0, -tailLen);
        tailGrad.addColorStop(0, 'rgba(140,210,255,0.75)');
        tailGrad.addColorStop(1, 'rgba(140,210,255,0)');
        ctx.beginPath();
        ctx.moveTo(-2.5, 0); ctx.lineTo(2.5, 0); ctx.lineTo(0, -tailLen);
        ctx.closePath();
        ctx.fillStyle = tailGrad;
        ctx.fill();

        // Cuerpo de la gota (gradiente radial)
        const dg = ctx.createRadialGradient(0, -1, 0, 0, 0, 7);
        dg.addColorStop(0,   'rgba(220,245,255,1)');
        dg.addColorStop(0.5, 'rgba(120,200,245,0.85)');
        dg.addColorStop(1,   'rgba(60,150,220,0)');
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = dg;
        ctx.fill();
        ctx.restore();
      });

      // ── Actualizar radios de clip (ease-out cúbico, nunca encoge) ─
      ripples.forEach(r => {
        const t = Math.min((ts - r.startTime) / r.duration, 1);
        r.clipRadius = r.maxRadius * (1 - Math.pow(1 - t, 3));
      });

      // ── Clip + revelar título ──────────────────────────
      if (ripples.length > 0) {
        ctx.save();

        // Path = unión de todos los círculos de clip
        ctx.beginPath();
        ripples.forEach(r => {
          ctx.moveTo(r.x + r.clipRadius, r.y); // moveTo separa cada arco como sub-path
          ctx.arc(r.x, r.y, r.clipRadius, 0, Math.PI * 2);
        });
        ctx.clip();

        // Brillo interior por ripple
        ripples.forEach(r => {
          const glow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.clipRadius);
          glow.addColorStop(0,   'rgba(0,60,120,0.35)');
          glow.addColorStop(0.6, 'rgba(0,25,60,0.15)');
          glow.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);
        });

        // Título
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(100,210,255,0.9)';
        ctx.shadowBlur  = 34;

        const tg = ctx.createLinearGradient(cx - 220, cy, cx + 220, cy);
        tg.addColorStop(0,    '#e0f4ff');
        tg.addColorStop(0.45, '#aee9ff');
        tg.addColorStop(1,    '#10b981');

        const fs = Math.max(Math.min(W * 0.038, 52), 28);
        ctx.font      = `bold ${fs}px Inter, sans-serif`;
        ctx.fillStyle = tg;
        ctx.fillText('Espacio de Calma', cx, cy);

        // Subtítulo
        ctx.shadowBlur = 14;
        ctx.font       = `${Math.max(Math.min(W * 0.015, 17), 13)}px Inter, sans-serif`;
        ctx.fillStyle  = 'rgba(174,233,255,0.6)';
        ctx.fillText('un espacio solo para ti', cx, cy + fs * 0.95);

        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ── Anillos de onda (sólo mientras el clip está creciendo) ────
      ripples.forEach(r => {
        const age = (ts - r.startTime) / r.duration;
        if (age >= 1) return;                         // desaparecer cuando termina
        const opacity = Math.max(0, 1 - age * 0.95);

        // Anillo principal en el frente de onda
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.clipRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(160,230,255,${opacity * 0.65})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Anillo exterior más suave
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.clipRadius * 1.06, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100,200,255,${opacity * 0.22})`;
        ctx.lineWidth   = 1;
        ctx.stroke();
      });

      // ── Disparar onRevealed ────────────────────────────
      if (!calledRef.current && ripples.length >= 3) {
        if (ripples.every(r => r.clipRadius > 130)) {
          calledRef.current = true;
          onRevealed();
        }
      }

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [onRevealed]);

  return <canvas ref={canvasRef} className="splash-screen__ripple-canvas" />;
}