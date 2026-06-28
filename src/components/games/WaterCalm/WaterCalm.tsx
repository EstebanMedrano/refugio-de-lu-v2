import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import { Howl } from 'howler';
import './WaterCalm.scss';

// ── tipos ────────────────────────────────────────────────────────────────────
interface Ripple {
  x: number; y: number;
  radius: number; maxRadius: number;
  color: string; speed: number;
}

interface Dog {
  x: number; y: number;
  vx: number; vy: number;
  frameX: number;        // frame actual del sprite (0-7)
  frameTimer: number;    // acumulador para cambiar frame
  facingLeft: boolean;
  label: string;
}

interface ColorOption {
  name: string;
  color: string;
  emoji: string;
}

// ── constantes ───────────────────────────────────────────────────────────────
const COLORS: ColorOption[] = [
  { name: 'Calma',      color: '#3b82f6', emoji: '🔵' },
  { name: 'Naturaleza', color: '#10b981', emoji: '🟢' },
  { name: 'Serenidad',  color: '#8b5cf6', emoji: '🟣' },
  { name: 'Alegría',    color: '#fbbf24', emoji: '🟡' },
  { name: 'Amor',       color: '#f472b6', emoji: '🩷' },
  { name: 'Energía',    color: '#fb923c', emoji: '🟠' },
  { name: 'Claridad',   color: '#e5e7eb', emoji: '⚪' },
  { name: 'Arcoíris',   color: 'rainbow', emoji: '🌈' },
];

const SPRITE_FRAMES   = 8;
const SPRITE_MS       = 100;   // ms por frame
const CATCH_RADIUS    = 55;
const CATCH_COOLDOWN  = 800;
const MAX_CATCHES     = 10;
const RIPPLE_INTERVAL = 30;
const MAX_RIPPLES     = 60;
const IDLE_TIMEOUT    = 3000;  // ms sin movimiento → modo relajación

const hexToRgba = (hex: string, alpha: number): string => {
  if (hex.startsWith('hsl') || hex === 'rainbow') return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const getRippleColor = (color: string): string => {
  if (color === 'rainbow') return `hsl(${(Date.now() / 10) % 360}, 80%, 60%)`;
  return color;
};

// ── componente ───────────────────────────────────────────────────────────────
export default function WaterCalm() {
  const navigate = useNavigate();
  const { reduceLevel } = useAnxiety();

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const stateRef    = useRef({
    ripples:       [] as Ripple[],
    tito:          { x: 120, y: 120, vx: 0, vy: 0, frameX: 0, frameTimer: 0, facingLeft: false, label: '🦊 Tito' } as Dog,
    lia:           { x: 0,   y: 120, vx: 0, vy: 0, frameX: 0, frameTimer: 0, facingLeft: true,  label: '🤍 Lia'  } as Dog,
    titoImg:       null as HTMLImageElement | null,
    liaImg:        null as HTMLImageElement | null,
    dogsLoaded:    false,
    mouseX:        -999,
    mouseY:        -999,
    isPressed:     false,
    selectedColor: COLORS[0].color,
    bgColor:       '#0a1220',
    bgTarget:      '#0a1220',
    catchCount:    0,
    lastCatch:     0,
    gameActive:    true,
    running:       true,
    animId:        0 as ReturnType<typeof requestAnimationFrame>,
    rippleTimer:   null as ReturnType<typeof setInterval> | null,
    lastMoveTime:  Date.now(),
    idleAngle:     0,
  });

  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [catchCount,       setCatchCount]        = useState(0);
  const [gameOver,         setGameOver]          = useState(false);
  const [winner,           setWinner]            = useState<'tito'|'lia'|null>(null);
  const [showHint,         setShowHint]          = useState(true);

  // ── sonido ────────────────────────────────────────────────────────────────
  const soundRef = useRef<Howl | null>(null);
  useEffect(() => {
    soundRef.current = new Howl({
      src: ['/assets/sounds/water-drop.mp3'],
      loop: true, volume: 0.25,
    });
    return () => { soundRef.current?.stop(); };
  }, []);

  // ── cargar sprites ────────────────────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    let loaded = 0;
    const onLoad = () => { loaded++; if (loaded === 2) s.dogsLoaded = true; };

    const titoImg = new Image();
    titoImg.src = '/assets/img/perros/tito-sprites.png';
    titoImg.onload = onLoad;
    s.titoImg = titoImg;

    const liaImg = new Image();
    liaImg.src = '/assets/img/perros/lia-sprites.png';
    liaImg.onload = onLoad;
    s.liaImg = liaImg;
  }, []);

  // ── helpers de ripple ─────────────────────────────────────────────────────
  const createRipple = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    s.ripples.push({
      x, y, radius: 8,
      maxRadius: Math.min(canvas.width, canvas.height) * 0.5,
      color: getRippleColor(s.selectedColor),
      speed: 4,
    });
    if (s.ripples.length > MAX_RIPPLES) s.ripples.shift();
  }, []);

  const startRippleStream = useCallback(() => {
    const s = stateRef.current;
    if (s.rippleTimer) clearInterval(s.rippleTimer);
    s.rippleTimer = setInterval(() => {
      if (s.isPressed && s.gameActive) createRipple(s.mouseX, s.mouseY);
    }, RIPPLE_INTERVAL);
  }, [createRipple]);

  const stopRippleStream = useCallback(() => {
    const s = stateRef.current;
    if (s.rippleTimer) { clearInterval(s.rippleTimer); s.rippleTimer = null; }
  }, []);

  // ── lógica de perros ──────────────────────────────────────────────────────
  const updateDog = useCallback((dog: Dog, canvas: HTMLCanvasElement, dt: number) => {
    const s = stateRef.current;
    const speed = s.isPressed ? 3.8 : 2.2;

    // perseguir cursor
    const dx = s.mouseX - dog.x;
    const dy = s.mouseY - dog.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 5) {
      dog.vx = (dx / dist) * speed + (Math.random() - 0.5) * 0.5;
      dog.vy = (dy / dist) * speed + (Math.random() - 0.5) * 0.5;
    }

    dog.x += dog.vx;
    dog.y += dog.vy;

    // dirección para flip del sprite
    dog.facingLeft = dog.vx < 0;

    // bounce en bordes
    const margin = 40;
    dog.x = Math.max(margin, Math.min(canvas.width  - margin, dog.x));
    dog.y = Math.max(margin, Math.min(canvas.height - margin - 80, dog.y));

    // avanzar frame del sprite
    dog.frameTimer += dt;
    if (dog.frameTimer >= SPRITE_MS) {
      dog.frameTimer = 0;
      dog.frameX = (dog.frameX + 1) % SPRITE_FRAMES;
    }
  }, []);

  const checkCatch = useCallback(() => {
    const s = stateRef.current;
    if (!s.isPressed || !s.gameActive) return;
    const now = Date.now();
    if (now - s.lastCatch < CATCH_COOLDOWN) return;

    const check = (dog: Dog, who: 'tito'|'lia') => {
      const dx = s.mouseX - dog.x;
      const dy = s.mouseY - dog.y;
      if (Math.sqrt(dx*dx + dy*dy) < CATCH_RADIUS) {
        s.catchCount++;
        s.lastCatch = now;
        setCatchCount(s.catchCount);
        // rebote
        dog.vx = -(dx * 0.4);
        dog.vy = -(dy * 0.4);
        if (s.catchCount >= MAX_CATCHES) {
          s.gameActive = false;
          reduceLevel();
          setWinner(who);
          setGameOver(true);
          stopRippleStream();
          soundRef.current?.stop();
        }
      }
    };
    check(s.tito, 'tito');
    if (s.gameActive) check(s.lia, 'lia');
  }, [reduceLevel, stopRippleStream]);

  // ── dibujar sprite ────────────────────────────────────────────────────────
  const drawSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dog: Dog,
    size: number,
  ) => {
    const frameW = img.naturalWidth  / SPRITE_FRAMES;
    const frameH = img.naturalHeight;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur  = 16;
    ctx.shadowOffsetY = 4;

    if (dog.facingLeft) {
      ctx.translate(dog.x + size/2, dog.y - size/2);
      ctx.scale(-1, 1);
      ctx.drawImage(img,
        dog.frameX * frameW, 0, frameW, frameH,
        -size, 0, size, size,
      );
    } else {
      ctx.drawImage(img,
        dog.frameX * frameW, 0, frameW, frameH,
        dog.x - size/2, dog.y - size/2, size, size,
      );
    }

    // etiqueta
    ctx.restore();
    ctx.save();
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(dog.label, dog.x, dog.y - size/2 - 6);
    ctx.restore();
  }, []);

  // ── loop de animación ─────────────────────────────────────────────────────
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const w = canvas.width, h = canvas.height;
    const dt = 16; // ~60fps

    // ── fondo dinámico ──
    // interpolar bgColor hacia bgTarget
    ctx.fillStyle = s.bgColor;
    ctx.fillRect(0, 0, w, h);

    // ── modo relajación: ondas automáticas desde el centro ──
    const idleMs = Date.now() - s.lastMoveTime;
    if (idleMs > IDLE_TIMEOUT && !s.isPressed) {
      s.idleAngle += 0.02;
      const cx = w/2 + Math.cos(s.idleAngle) * 80;
      const cy = h/2 + Math.sin(s.idleAngle * 0.7) * 50;
      if (Math.random() < 0.15) {
        const hue = (Date.now() / 15) % 360;
        s.ripples.push({
          x: cx, y: cy, radius: 8,
          maxRadius: Math.min(w,h) * 0.35,
          color: `hsl(${hue}, 60%, 65%)`,
          speed: 2.5,
        });
        if (s.ripples.length > MAX_RIPPLES) s.ripples.shift();
      }
    }

    // ── ripples ──
    s.ripples = s.ripples.filter(r => {
      const prog  = r.radius / r.maxRadius;
      const alpha = Math.max(0, 0.65 - prog * 0.55);

      // relleno degradado
      const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
      grad.addColorStop(0,   hexToRgba(r.color, alpha * 0.45));
      grad.addColorStop(0.5, hexToRgba(r.color, alpha * 0.2));
      grad.addColorStop(1,   'transparent');
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();

      // anillos concéntricos (3 en vez de 2)
      for (let i = 0; i < 3; i++) {
        const ring = r.radius - i * 18;
        if (ring > 4) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, ring, 0, Math.PI*2);
          ctx.strokeStyle = hexToRgba('#ffffff', alpha * (0.25 - i*0.06));
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      r.radius += r.speed;
      return r.radius < r.maxRadius;
    });

    // ── perros ──
    if (s.dogsLoaded && s.gameActive) {
      updateDog(s.tito, canvas, dt);
      updateDog(s.lia,  canvas, dt);
      checkCatch();
      if (s.titoImg) drawSprite(ctx, s.titoImg, s.tito, 72);
      if (s.liaImg)  drawSprite(ctx, s.liaImg,  s.lia,  62);
    }

    // ── fondo del canvas según color seleccionado cuando está presionado ──
    if (s.isPressed && s.selectedColor !== 'rainbow') {
      const r2 = parseInt(s.selectedColor.slice(1,3), 16);
      const g2 = parseInt(s.selectedColor.slice(3,5), 16);
      const b2 = parseInt(s.selectedColor.slice(5,7), 16);
      s.bgColor = `rgb(${Math.floor(r2*0.12)},${Math.floor(g2*0.12)},${Math.floor(b2*0.12)})`;
    } else if (s.isPressed && s.selectedColor === 'rainbow') {
      const hue = (Date.now()/10) % 360;
      s.bgColor = `hsl(${hue}, 30%, 10%)`;
    } else {
      s.bgColor = '#0a1220';
    }

    if (s.running) s.animId = requestAnimationFrame(animate);
  }, [updateDog, checkCatch, drawSprite]);

  // ── setup del canvas y eventos ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = stateRef.current;

    const resize = () => {
      const wrap = canvas.parentElement;
      if (!wrap) return;
      canvas.width  = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      s.lia.x = canvas.width - 120;
    };
    resize();
    window.addEventListener('resize', resize);

    s.running = true;
    s.animId  = requestAnimationFrame(animate);

    // hint desaparece después de 4s
    const hintTimer = setTimeout(() => setShowHint(false), 4000);

    // ── eventos de puntero ──
    const getPos = (clientX: number, clientY: number) => {
      const rect   = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top)  * scaleY,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      const p = getPos(e.clientX, e.clientY);
      s.mouseX = p.x; s.mouseY = p.y;
      s.lastMoveTime = Date.now();
    };
    const onMouseDown = (e: MouseEvent) => {
      const p = getPos(e.clientX, e.clientY);
      s.mouseX = p.x; s.mouseY = p.y;
      s.isPressed = true;
      s.lastMoveTime = Date.now();
      startRippleStream();
      soundRef.current?.play();
    };
    const onMouseUp = () => {
      s.isPressed = false;
      stopRippleStream();
      soundRef.current?.stop();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const p = getPos(e.touches[0].clientX, e.touches[0].clientY);
      s.mouseX = p.x; s.mouseY = p.y;
      s.isPressed = true;
      s.lastMoveTime = Date.now();
      startRippleStream();
      soundRef.current?.play();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const p = getPos(e.touches[0].clientX, e.touches[0].clientY);
      s.mouseX = p.x; s.mouseY = p.y;
      s.lastMoveTime = Date.now();
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      s.isPressed = false;
      stopRippleStream();
      soundRef.current?.stop();
    };

    canvas.addEventListener('mousemove',  onMouseMove);
    canvas.addEventListener('mousedown',  onMouseDown);
    canvas.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

    return () => {
      s.running = false;
      cancelAnimationFrame(s.animId);
      stopRippleStream();
      soundRef.current?.stop();
      clearTimeout(hintTimer);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove',  onMouseMove);
      canvas.removeEventListener('mousedown',  onMouseDown);
      canvas.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
    };
  }, [animate, startRippleStream, stopRippleStream]);

  // ── cambiar color ─────────────────────────────────────────────────────────
  const selectColor = (idx: number) => {
    setSelectedColorIdx(idx);
    stateRef.current.selectedColor = COLORS[idx].color;
  };

  // ── reiniciar ─────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    s.catchCount  = 0;
    s.gameActive  = true;
    s.lastCatch   = 0;
    s.ripples     = [];
    s.tito        = { x: 120, y: 120, vx: 0, vy: 0, frameX: 0, frameTimer: 0, facingLeft: false, label: '🦊 Tito' };
    s.lia         = { x: (canvas?.width ?? 600) - 120, y: 120, vx: 0, vy: 0, frameX: 0, frameTimer: 0, facingLeft: true, label: '🤍 Lia' };
    setCatchCount(0);
    setGameOver(false);
    setWinner(null);
  }, []);

  // ── render ────────────────────────────────────────────────────────────────
  const winnerName = winner === 'tito' ? 'Tito 🦊' : 'Lia 🤍';
  const winnerImg  = winner === 'tito'
    ? '/assets/img/perros/tito.png'
    : '/assets/img/perros/lia.png';

  return (
    <div className="watercalm">
      {/* cabecera */}
      <motion.div
        className="watercalm__header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="watercalm__title">
          <span className="watercalm__title-gradient">💧 Lago de Calma</span>
        </h2>
        <p className="watercalm__subtitle">Mantén presionado para crear ondas · ¡Cuidado con Tito y Lia!</p>
      </motion.div>

      {/* HUD */}
      <div className="watercalm__hud">
        <div className="watercalm__hud-dogs">
          <img src="/assets/img/perros/tito.png" alt="Tito" className="watercalm__hud-dog" />
          <img src="/assets/img/perros/lia.png"  alt="Lia"  className="watercalm__hud-dog" />
        </div>
        <div className="watercalm__hud-counter">
          <span className="watercalm__hud-count">{catchCount}</span>
          <span className="watercalm__hud-sep">/</span>
          <span className="watercalm__hud-max">{MAX_CATCHES}</span>
          <span className="watercalm__hud-label">atrapadas</span>
        </div>
      </div>

      {/* canvas */}
      <div className="watercalm__canvas-wrap">
        <canvas ref={canvasRef} className="watercalm__canvas" />

        {/* hint */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              className="watercalm__hint"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              💧 Mantén presionado para crear ondas y elegir color
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* paleta de colores */}
      <div className="watercalm__palette">
        {COLORS.map((c, i) => (
          <button
            key={c.name}
            className={`watercalm__color-btn${i === selectedColorIdx ? ' watercalm__color-btn--active' : ''}${c.color === 'rainbow' ? ' watercalm__color-btn--rainbow' : ''}`}
            style={c.color !== 'rainbow' ? { background: c.color } : undefined}
            onClick={() => selectColor(i)}
            title={c.name}
          >
            <span>{c.emoji}</span>
          </button>
        ))}
      </div>

      {/* botón volver */}
      <div className="watercalm__back">
        <button className="btn-secondary" onClick={() => navigate('/games')}>
          ← Volver a juegos
        </button>
      </div>

      {/* overlay game over */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            className="watercalm__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="watercalm__gameover-card"
              initial={{ scale: 0.5, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <img src={winnerImg} alt={winnerName} className="watercalm__gameover-dog" />
              <div className="watercalm__gameover-bubble">
                <p>¡Te atrapé! 🐾<br /><em>¿Jugamos otra vez?</em></p>
              </div>
              <p className="watercalm__gameover-stats">
                {winnerName} te atrapó {catchCount} veces
              </p>
              <div className="watercalm__gameover-actions">
                <button className="btn-primary" onClick={resetGame}>¡Otra vez! 🎮</button>
                <button className="btn-secondary" onClick={() => navigate('/games')}>← Volver</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}