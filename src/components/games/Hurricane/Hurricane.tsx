// Hurricane.tsx — Huracán de Pensamientos v2
// Migrado desde v1/js/games/hurricane.js
// Mejoras: vórtice de fondo, aura pulsante, explosión letra-por-letra,
//          cursor destructivo, drag en móvil, overlay React de victoria

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import './Hurricane.scss';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Thought {
  id: number;
  text: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  pulsePhase: number;       // fase de la animación de pulso (0–2π)
  pulseSpeed: number;       // velocidad de pulso individual
  phase: 'floating' | 'moving-to-center' | 'shaking' | 'done';
  rotation: number;
  rotationSpeed: number;
  shakeStartTime: number;
  originalSize: number;
}

interface Fragment {
  // Fragmento de letra post-explosión
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;             // 0–1, decae con el tiempo
  rotation: number;
  rotationSpeed: number;
  gravity: number;
}

interface Firework {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  gravity: number;
}

// ─── Datos ───────────────────────────────────────────────────────────────────

const THOUGHTS = [
  'No puedo con esto', 'tengo miedo', 'siento preocupación',
  '¿y si no puedo?', 'siento pánico', 'tengo inseguridad',
  'me siento triste', 'me siento culpable', 'no soy suficiente',
  '¿y si fracaso?', 'siento mucho dolor', 'ya estoy cansada',
  'no puedo con el estrés', 'no lo lograré', 'no estoy mejorando',
  'todo va a salir mal', 'no puedo controlarlo', '¿y si pasa algo?',
  'no merezco esto', 'no puedo respirar',
];

// Paleta coherente: rojos/naranjas/magentas → transmite tensión pero queda bonito
const COLORS = ['#ef4444', '#f97316', '#ec4899', '#f59e0b', '#a855f7', '#06b6d4'];

const TARGET = 10; // pensamientos a destruir para ganar

// ─── Utilidades ──────────────────────────────────────────────────────────────

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Hurricane() {
  const navigate  = useNavigate();
  const { reduceLevel } = useAnxiety();

  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stateRef     = useRef({
    thoughts:    [] as Thought[],
    fragments:   [] as Fragment[],
    fireworks:   [] as Firework[],
    destroyed:   0,
    finalSeq:    false,
    canInteract: true,
    mouseX:      -999,
    mouseY:      -999,
    vortexAngle: 0,          // ángulo del vórtice de fondo
    idCounter:   0,
    animId:      0 as ReturnType<typeof requestAnimationFrame>,
    running:     true,
  });

  const [destroyed, setDestroyed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorActive, setCursorActive] = useState(false);

  // ─── Crear pensamiento ─────────────────────────────────────────────────────
  const createThought = useCallback((canvas: HTMLCanvasElement): Thought => {
    const s = stateRef.current;
    const w = canvas.width;
    const h = canvas.height;
    return {
      id:           s.idCounter++,
      text:         THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)],
      x:            rand(80, w - 80),
      y:            rand(80, h - 80),
      vx:           (Math.random() - 0.5) * 1.4,
      vy:           (Math.random() - 0.5) * 1.4,
      size:         rand(15, 24),
      originalSize: 0,   // se asigna justo después
      color:        COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity:      0.85,
      pulsePhase:   rand(0, Math.PI * 2),
      pulseSpeed:   rand(0.03, 0.07),
      phase:        'floating',
      rotation:     0,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      shakeStartTime: 0,
    };
  }, []);

  // ─── Inicializar partículas ────────────────────────────────────────────────
  const initThoughts = useCallback((canvas: HTMLCanvasElement) => {
    const s = stateRef.current;
    s.thoughts = Array.from({ length: 14 }, () => {
      const t = createThought(canvas);
      t.originalSize = t.size;
      return t;
    });
    s.fragments  = [];
    s.fireworks  = [];
    s.destroyed  = 0;
    s.finalSeq   = false;
    s.canInteract = true;
  }, [createThought]);

  // ─── Explotar pensamiento: letras salen como fragmentos ───────────────────
  const explodeThought = useCallback((t: Thought, cx: number, cy: number) => {
    const s = stateRef.current;

    // Fragmentos de letras
    [...t.text].forEach((char, i) => {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(3, 14);
      s.fragments.push({
        char,
        x: cx + (i - t.text.length / 2) * (t.size * 0.6),
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(2, 6),
        size: t.size * rand(0.8, 1.4),
        color: t.color,
        opacity: 1,
        life: 1,
        rotation: rand(-Math.PI, Math.PI),
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        gravity: rand(0.15, 0.4),
      });
    });

    // Fuegos artificiales gruesos
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 / 50) * i + rand(-0.3, 0.3);
      const speed = rand(3, 14);
      s.fireworks.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: rand(3, 10),
        color: i % 3 === 0 ? '#ffffff' : t.color,
        opacity: 1,
        life: 1,
        gravity: rand(0.05, 0.12),
      });
    }
  }, []);

  // ─── Comprobar colisión con cursor ────────────────────────────────────────
  const checkCollision = useCallback(() => {
    const s = stateRef.current;
    if (!s.canInteract || s.finalSeq) return;

    for (let i = s.thoughts.length - 1; i >= 0; i--) {
      const t = s.thoughts[i];
      if (t.phase !== 'floating') continue;

      const dx = s.mouseX - t.x;
      const dy = s.mouseY - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Radio de colisión basado en longitud del texto
      const hitRadius = (t.text.length * t.size * 0.32) + 10;

      if (dist < hitRadius) {
        // Iniciar secuencia de explosión
        t.phase = 'moving-to-center';
        t.vx = 0;
        t.vy = 0;
        break; // solo un pensamiento por frame
      }
    }
  }, []);

  // ─── Secuencia final: explotar los restantes uno a uno ────────────────────
  const startFinalSequence = useCallback(() => {
    const s = stateRef.current;
    if (s.finalSeq) return;
    s.finalSeq   = true;
    s.canInteract = false;

    const remaining = s.thoughts.filter(t => t.phase === 'floating');
    remaining.forEach((t, i) => {
      setTimeout(() => {
        if (s.running) t.phase = 'moving-to-center';
      }, i * 900);
    });

    const totalTime = remaining.length * 900 + 2000;
    setTimeout(() => {
      if (s.running) {
        reduceLevel();
        setCompleted(true);
      }
    }, totalTime);
  }, [reduceLevel]);

  // ─── Loop de animación ────────────────────────────────────────────────────
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s   = stateRef.current;
    const w   = canvas.width;
    const h   = canvas.height;
    const cx  = w / 2;
    const cy  = h / 2;

    // Fondo con gradiente radial oscuro
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.7);
    bg.addColorStop(0,   '#1a1a2e');
    bg.addColorStop(0.6, '#0f0f1a');
    bg.addColorStop(1,   '#050510');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // ── Vórtice de fondo (espiral de líneas giratorias) ──────────────────────
    s.vortexAngle += 0.008;
    const spiralCount = 6;
    for (let i = 0; i < spiralCount; i++) {
      const angle = s.vortexAngle + (Math.PI * 2 / spiralCount) * i;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, 0, 0, -Math.min(w, h) * 0.48);
      grad.addColorStop(0,   'rgba(139,92,246,0.18)');
      grad.addColorStop(0.5, 'rgba(239,68,68,0.10)');
      grad.addColorStop(1,   'rgba(139,92,246,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -Math.min(w, h) * 0.48);
      ctx.stroke();
      ctx.restore();
    }

    // Pulso central (círculo giratorio sutil)
    const pulseR = 20 + Math.sin(s.vortexAngle * 3) * 8;
    ctx.save();
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur  = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139,92,246,0.5)';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();

    // ── Actualizar y dibujar pensamientos ────────────────────────────────────
    const toRemove: number[] = [];

    s.thoughts.forEach((t) => {
      t.pulsePhase += t.pulseSpeed;

      if (t.phase === 'floating') {
        // Movimiento orgánico con ligera atracción al centro cuando están lejos
        t.x  += t.vx;
        t.y  += t.vy;
        const dx = cx - t.x, dy = cy - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 80) {
          t.vx += (dx / dist) * 0.015;
          t.vy += (dy / dist) * 0.015;
        }
        // Rebote en bordes
        if (t.x < 30 || t.x > w - 30) t.vx *= -0.9;
        if (t.y < 30 || t.y > h - 30) t.vy *= -0.9;
        // Límite de velocidad
        const spd = Math.sqrt(t.vx * t.vx + t.vy * t.vy);
        if (spd > 2) { t.vx *= 2 / spd; t.vy *= 2 / spd; }

        // Aura pulsante (halo detrás del texto)
        const pulseScale = 1 + Math.sin(t.pulsePhase) * 0.15;
        const auraAlpha  = 0.12 + Math.sin(t.pulsePhase) * 0.08;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.shadowColor = t.color;
        ctx.shadowBlur  = 18 * pulseScale;
        ctx.font        = `bold ${t.size * pulseScale}px 'Inter', sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        // Aura semitransparente detrás
        ctx.fillStyle = hexToRgba(t.color, auraAlpha * 3);
        ctx.fillText(t.text, 0, 0);
        // Texto principal
        ctx.shadowBlur  = 12;
        ctx.fillStyle = hexToRgba(t.color, t.opacity);
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

      } else if (t.phase === 'moving-to-center') {
        // Viajar al centro con aceleración
        const dx = cx - t.x, dy = cy - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 8) {
          t.x += dx * 0.06;
          t.y += dy * 0.06;
          // Rotación mientras viaja
          t.rotation += t.rotationSpeed * 3;
        } else {
          t.x = cx;
          t.y = cy;
          t.phase = 'shaking';
          t.shakeStartTime = Date.now();
        }
        // Dibujar viajando
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);
        ctx.font        = `bold ${t.size}px 'Inter', sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = t.color;
        ctx.shadowBlur  = 20;
        ctx.fillStyle = hexToRgba(t.color, t.opacity);
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

      } else if (t.phase === 'shaking') {
        const elapsed  = Date.now() - t.shakeStartTime;
        const duration = 700;
        const progress = Math.min(elapsed / duration, 1);

        // Tamaño crece mientras tiembla
        const shakeMag = progress * 10;
        const shakeX   = (Math.random() - 0.5) * shakeMag;
        const shakeY   = (Math.random() - 0.5) * shakeMag;
        const sizeNow  = t.originalSize + progress * 20;

        ctx.save();
        ctx.translate(cx + shakeX, cy + shakeY);
        ctx.font        = `bold ${sizeNow}px 'Inter', sans-serif`;
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = t.color;
        ctx.shadowBlur  = 30 + progress * 20;
        ctx.fillStyle = hexToRgba(t.color, Math.min(1, t.opacity + progress * 0.4));
        ctx.fillText(t.text, 0, 0);
        ctx.restore();

        if (progress >= 1) {
          t.phase = 'done';
          explodeThought(t, cx, cy);
          toRemove.push(t.id);
        }
      }
    });

    // Eliminar los que terminaron su secuencia
    if (toRemove.length > 0) {
      s.thoughts = s.thoughts.filter(t => !toRemove.includes(t.id));
      s.destroyed += toRemove.length;
      setDestroyed(s.destroyed);

      // Agregar pensamiento nuevo si no estamos en secuencia final
      if (!s.finalSeq && s.destroyed < TARGET) {
        const canvas = canvasRef.current;
        if (canvas) {
          toRemove.forEach(() => {
            const t = createThought(canvas);
            t.originalSize = t.size;
            s.thoughts.push(t);
          });
        }
      }

      // Arrancar secuencia final si se alcanzó el objetivo
      if (!s.finalSeq && s.destroyed >= TARGET) {
        startFinalSequence();
      }
    }

    // ── Fragmentos de letras ─────────────────────────────────────────────────
    s.fragments = s.fragments.filter(f => {
      f.vy      += f.gravity;
      f.x       += f.vx;
      f.y       += f.vy;
      f.vx      *= 0.97;
      f.rotation += f.rotationSpeed;
      f.life    -= 0.018;
      f.opacity  = f.life;
      if (f.life <= 0) return false;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.font        = `bold ${f.size}px 'Inter', sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = f.color;
      ctx.shadowBlur  = 12;
      ctx.fillStyle = hexToRgba(f.color, f.opacity);
      ctx.fillText(f.char, 0, 0);
      ctx.restore();
      return true;
    });

    // ── Fuegos artificiales ──────────────────────────────────────────────────
    s.fireworks = s.fireworks.filter(fw => {
      fw.vy      += fw.gravity;
      fw.x       += fw.vx;
      fw.y       += fw.vy;
      fw.vx      *= 0.97;
      fw.life    -= 0.014;
      fw.opacity  = fw.life;
      if (fw.life <= 0) return false;

      ctx.save();
      ctx.beginPath();
      ctx.arc(fw.x, fw.y, fw.size * fw.life, 0, Math.PI * 2);
      ctx.shadowColor = fw.color;
      ctx.shadowBlur  = 18;
      ctx.fillStyle = hexToRgba(fw.color, fw.opacity);
      ctx.fill();
      ctx.restore();
      return true;
    });

    s.animId = requestAnimationFrame(animate);
  }, [createThought, explodeThought, startFinalSequence]);

  // ─── Setup del canvas y eventos ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width  = container.clientWidth;
      canvas.height = Math.min(480, window.innerHeight * 0.55);
    };
    resize();
    window.addEventListener('resize', resize);

    initThoughts(canvas);
    stateRef.current.running = true;
    stateRef.current.animId  = requestAnimationFrame(animate);

    // Eventos de mouse
    const onMouseMove = (e: MouseEvent) => {
      const rect  = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouseX = (e.clientX - rect.left) * scaleX;
      stateRef.current.mouseY = (e.clientY - rect.top)  * scaleY;
      // Actualizar cursor visual (posición en pantalla, sin escalar)
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const onMouseDown = () => {
      setCursorActive(true);
      checkCollision();
      setTimeout(() => setCursorActive(false), 200);
    };

    // Eventos de touch (drag destruye en el camino)
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect  = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouseX = (touch.clientX - rect.left) * scaleX;
      stateRef.current.mouseY = (touch.clientY - rect.top)  * scaleY;
      checkCollision();
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect  = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      stateRef.current.mouseX = (touch.clientX - rect.left) * scaleX;
      stateRef.current.mouseY = (touch.clientY - rect.top)  * scaleY;
      checkCollision();
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });

    return () => {
      stateRef.current.running = false;
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
    };
  }, [animate, checkCollision, initThoughts]);

  // ─── Reiniciar ────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initThoughts(canvas);
    setDestroyed(0);
    setCompleted(false);
  }, [initThoughts]);

  // ─── Barra de progreso con color dinámico ─────────────────────────────────
  // Interpola de rojo (#ef4444) a verde (#10b981) según progreso
  const progress = Math.min(destroyed / TARGET, 1);
  const barColor = `hsl(${Math.round(progress * 142)}, 80%, 55%)`;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="hurricane">
      {/* Encabezado */}
      <motion.div
        className="hurricane__header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="hurricane__title">
          <span className="hurricane__title-gradient">🌀 Huracán de Pensamientos</span>
        </h2>
        <p className="hurricane__subtitle">
          Toca los pensamientos para destruirlos
        </p>
      </motion.div>

      {/* Barra de progreso */}
      <div className="hurricane__progress">
        <div className="hurricane__progress-labels">
          <span>Pensamientos destruidos</span>
          <span className="hurricane__progress-count">
            {Math.min(destroyed, TARGET)}/{TARGET}
          </span>
        </div>
        <div className="hurricane__progress-track">
          <motion.div
            className="hurricane__progress-fill"
            animate={{ width: `${progress * 100}%`, backgroundColor: barColor }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Canvas con cursor personalizado */}
      <div className="hurricane__canvas-wrap">
        <canvas ref={canvasRef} className="hurricane__canvas" />

        {/* Cursor destructivo (solo desktop) */}
        <motion.div
          className={`hurricane__cursor ${cursorActive ? 'hurricane__cursor--active' : ''}`}
          animate={{ x: cursorPos.x - 16, y: cursorPos.y - 16 }}
          transition={{ type: 'spring', stiffness: 800, damping: 35 }}
        >
          💥
        </motion.div>

        {/* Hint */}
        {!completed && (
          <div className="hurricane__hint">
            {destroyed === 0
              ? '💥 Toca los pensamientos para destruirlos'
              : destroyed < TARGET
              ? `¡Bien! Sigue destruyendo — quedan ${TARGET - Math.min(destroyed, TARGET)}`
              : '¡Último paso! Esperá la secuencia final...'}
          </div>
        )}
      </div>

      {/* Botones */}
      {!completed && (
        <div className="hurricane__actions">
          <button className="btn-secondary" onClick={handleReset}>
            🔄 Reiniciar tormenta
          </button>
          <button className="btn-secondary" onClick={() => navigate('/games')}>
            ← Volver
          </button>
        </div>
      )}

      {/* Overlay de victoria */}
      <AnimatePresence>
        {completed && (
          <motion.div
            className="hurricane__victory"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="hurricane__victory-card"
              initial={{ scale: 0.5, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 16 }}
            >
              {/* Cielo despejado animado */}
              <motion.div
                className="hurricane__victory-sky"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {['🌤️', '🌈', '✨', '🕊️', '🌿'].map((emoji, i) => (
                  <motion.span
                    key={i}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    {emoji}
                  </motion.span>
                ))}
              </motion.div>

              <h3 className="hurricane__victory-title">
                ¡Has calmado la tormenta!
              </h3>
              <p className="hurricane__victory-desc">
                Todos los pensamientos negativos se han disipado.
                <br />
                <em>Respira profundo. Estás en calma.</em>
              </p>

              <div className="hurricane__victory-actions">
                <button
                  className="btn-primary hurricane__btn-primary"
                  onClick={handleReset}
                >
                  🌀 Nueva tormenta
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => navigate('/games')}
                >
                  ← Volver a juegos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}