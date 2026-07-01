// WaterCalm.tsx — Lago de Calma 3D: orquestador de etapas, colores, sonido, overlays
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Howl } from 'howler';
import * as THREE from 'three';
import { useAnxiety } from '../../context/AnxietyContext';
import CliffScene from './CliffScene';
import { LAKE_Y, LAKE_CENTER_Z, MAX_BEAMS, SHOTS_FOR_CLOSURE } from './lakeConstants';
import './WaterCalm.scss';

export type Stage = 'arriving' | 'approaching' | 'seated' | 'lasering';

export interface BeamSlot {
  active: boolean;
  from: THREE.Vector3;
  to: THREE.Vector3;
  color: THREE.Color;
  startTime: number;
}

export interface LakeWorld {
  targetPoint: THREE.Vector3;
  handPosition: THREE.Vector3;
  beams: BeamSlot[];
  beamCursor: number;
  getColor: () => THREE.Color;
  fireShot: (x: number, z: number, color: THREE.Color) => void;
  onShotFired?: () => void;
}

const PALETTE = [
  { name: 'Calma',      hex: '#3b82f6' },
  { name: 'Naturaleza', hex: '#10b981' },
  { name: 'Serenidad',  hex: '#8b5cf6' },
  { name: 'Alegría',    hex: '#fbbf24' },
  { name: 'Amor',       hex: '#f472b6' },
  { name: 'Energía',    hex: '#fb923c' },
  { name: 'Claridad',   hex: '#e5e7eb' },
];

export default function WaterCalm() {
  const navigate = useNavigate();
  const { reduceLevel } = useAnxiety();

  const [stage, setStage]               = useState<Stage>('arriving');
  const [selected, setSelected]         = useState<number[]>([0]);
  const [rainbow, setRainbow]           = useState(false);
  const [shotsFired, setShotsFired]     = useState(0);
  const [closureShown, setClosureShown] = useState(false);

  // ── Sonido ──────────────────────────────────────────────────────────────────
  const ambientRef = useRef<Howl | null>(null);
  const dropRef    = useRef<Howl | null>(null);
  const audioRef   = useRef<AudioContext | null>(null);

  useEffect(() => {
    ambientRef.current = new Howl({ src: ['/assets/sounds/ambient-432hz.mp3'], loop: true, volume: 0.15 });
    dropRef.current    = new Howl({ src: ['/assets/sounds/water-drop.mp3'], volume: 0.30 });
    return () => { ambientRef.current?.stop(); };
  }, []);

  useEffect(() => {
    if (stage === 'seated' || stage === 'lasering') {
      ambientRef.current?.play();
    } else {
      ambientRef.current?.stop();
    }
  }, [stage]);

  const playLaserZap = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(130, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.065, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.20);
      osc.start(); osc.stop(ctx.currentTime + 0.22);
    } catch { /* AudioContext bloqueado */ }
  }, []);

  // ── Color activo (multi-selección + arcoíris) ─────────────────────────────
  const colorCfg = useRef({ selected: [0], rainbow: false });
  useEffect(() => { colorCfg.current = { selected, rainbow }; }, [selected, rainbow]);

  const getColor = useCallback((): THREE.Color => {
    const { selected: sel, rainbow: rb } = colorCfg.current;
    if (rb) {
      const h = ((Date.now() / 1800) % 1);
      return new THREE.Color().setHSL(h, 0.78, 0.60);
    }
    const idxs = sel.length ? sel : [0];
    const c = new THREE.Color(0, 0, 0);
    idxs.forEach(i => c.add(new THREE.Color(PALETTE[i].hex)));
    c.multiplyScalar(1 / idxs.length);
    return c;
  }, []);

  // ── Estado compartido con la escena ───────────────────────────────────────
  const world = useRef<LakeWorld>({
    // El laser dispara hacia el centro del lago inicialmente
    targetPoint:  new THREE.Vector3(0, LAKE_Y, LAKE_CENTER_Z),
    handPosition: new THREE.Vector3(2.2, 0.76, -11.5), // ← misma que IDLE_LASER_POS
    beams: Array.from({ length: MAX_BEAMS }, () => ({
      active: false,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      color: new THREE.Color('#00ffd0'),
      startTime: 0,
    })),
    beamCursor: 0,
    getColor,
    fireShot: (x, z, color) => {
      const w = world.current;
      w.targetPoint.set(x, LAKE_Y, z);
      const slot = w.beams[w.beamCursor % MAX_BEAMS];
      w.beamCursor = (w.beamCursor + 1) % MAX_BEAMS;
      slot.active    = true;
      slot.from.copy(w.handPosition);
      slot.to.set(x, LAKE_Y + 0.1, z);
      slot.color.copy(color);
      slot.startTime = performance.now();
      playLaserZap();
      dropRef.current?.play();
      w.onShotFired?.();
    },
  });

  useEffect(() => {
    world.current.onShotFired = () => {
      setShotsFired(n => {
        const next = n + 1;
        if (next >= SHOTS_FOR_CLOSURE && !closureShown) {
          reduceLevel();
          setClosureShown(true);
        }
        return next;
      });
    };
  }, [reduceLevel, closureShown]);

  // ── Paleta ────────────────────────────────────────────────────────────────
  const toggleColor = (idx: number) => {
    setRainbow(false);
    setSelected(prev => {
      if (prev.includes(idx)) {
        const next = prev.filter(i => i !== idx);
        return next.length ? next : prev;
      }
      return [...prev, idx];
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const content = (
    <div className="watercalm-3d">
      <CliffScene
        stage={stage}
        world={world}
        onIdleAdvance={() => setStage('approaching')}
        onApproachComplete={() => setStage('seated')}
      />

      <button
        className="watercalm-3d__back btn-secondary"
        onClick={() => navigate('/games')}
      >
        ← Volver a juegos
      </button>

      {/* Hint inicial al llegar */}
      <AnimatePresence>
        {stage === 'arriving' && (
          <motion.p
            className="watercalm-3d__hint"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            Mirá las estrellas... te acercarás al borde sola.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Hint durante acercamiento */}
      <AnimatePresence>
        {stage === 'approaching' && (
          <motion.p
            className="watercalm-3d__hint"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            ¿Ves el lago allá abajo? Qué hermoso...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Hotspot para agarrar el láser */}
      <AnimatePresence>
        {stage === 'seated' && (
          <motion.button
            className="watercalm-3d__hotspot"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setStage('lasering')}
          >
            🔫 Agarrar el láser
          </motion.button>
        )}
      </AnimatePresence>

      {/* Paleta de colores */}
      <AnimatePresence>
        {stage === 'lasering' && (
          <motion.div
            className="watercalm-3d__palette"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <div className="watercalm-3d__palette-row">
              {PALETTE.map((c, i) => (
                <button
                  key={c.name}
                  className={`watercalm-3d__swatch${selected.includes(i) && !rainbow ? ' watercalm-3d__swatch--active' : ''}`}
                  style={{ background: c.hex }}
                  title={c.name}
                  onClick={() => toggleColor(i)}
                />
              ))}
              <button
                className={`watercalm-3d__swatch watercalm-3d__swatch--rainbow${rainbow ? ' watercalm-3d__swatch--active' : ''}`}
                title="Arcoíris"
                onClick={() => setRainbow(r => !r)}
              />
            </div>
            <p className="watercalm-3d__palette-label">
              {rainbow
                ? 'Arcoíris activo ✨'
                : selected.length > 1
                  ? `${selected.length} colores mezclándose`
                  : PALETTE[selected[0]]?.name ?? 'Color seleccionado'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contador de disparos */}
      {stage === 'lasering' && (
        <div className="watercalm-3d__counter">
          {Math.min(shotsFired, SHOTS_FOR_CLOSURE)}/{SHOTS_FOR_CLOSURE}
        </div>
      )}

      {/* Overlay de cierre / victoria */}
      <AnimatePresence>
        {closureShown && (
          <motion.div
            className="watercalm-3d__closure"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="watercalm-3d__closure-card"
              initial={{ scale: 0.6, y: 50 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 170, damping: 16 }}
            >
              <div className="watercalm-3d__closure-emoji">🌊</div>
              <h3>Has iluminado la laguna</h3>
              <p>
                Tito y Lia reman felices junto a tu luz.
                <br />
                <em>Podés seguir jugando o descansar cuando quieras.</em>
              </p>
              <div className="watercalm-3d__closure-actions">
                <button className="btn-primary" onClick={() => setClosureShown(false)}>
                  Seguir en el lago
                </button>
                <button className="btn-secondary" onClick={() => navigate('/games')}>
                  ← Volver a juegos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}