import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import { Howl } from 'howler';
import BedroomScene from './BedroomScene';
import './Puzzle.scss';
import { createPortal } from 'react-dom';

export type Phase = 'idle' | 'calling' | 'intro' | 'breaking' | 'puzzle' | 'complete';
export type DogType = 'tito' | 'lia';

const ALL_PUZZLES = [
  { name: 'Tu refugio',       src: '/assets/img/refugio-webp/exterior-casa.webp',    message: '🏡 Este es tu lugar seguro' },
  { name: 'Tulipanes',        src: '/assets/img/refugio-webp/jardin-tulipanes.webp', message: '🌷 Floreces con cada respiración' },
  { name: 'Noche estrellada', src: '/assets/img/refugio-webp/noche-estrellas.webp',  message: '✨ El universo conspira a tu favor' },
  { name: 'Patio',            src: '/assets/img/refugio-webp/patio-piscina.webp',    message: '🌊 Fluye con la calma del agua' },
  { name: 'Fuente mágica',    src: '/assets/img/refugio-webp/fuente-colores.webp',   message: '🌈 La magia está en ti' },
  { name: 'Interior',         src: '/assets/img/refugio-webp/interior-sala.webp',    message: '🛋️ Tu rincón de paz' },
];
const TOTAL = 16;

function subtitleFor(phase: Phase, dog: DogType, placed: number): string {
  const label = dog === 'tito' ? 'Tito 🦊' : 'Lia 🤍';
  switch (phase) {
    case 'idle':     return '¿A quién llamamos para que rompa el cuadro?';
    case 'calling':  return `Llamando a ${label}...`;
    case 'intro':    return `¡${label} viene corriendo!`;
    case 'breaking': return `¡${label} rompió el cuadro!`;
    case 'puzzle':   return `Arrastra las piezas a su lugar · ${placed}/${TOTAL}`;
    case 'complete': return '¡Lo lograste! 🎉';
    default: return '';
  }
}

export default function Puzzle() {
  const navigate   = useNavigate();
  const { reduceLevel } = useAnxiety();

  const puzzlesRef = useRef([...ALL_PUZZLES].sort(() => Math.random() - 0.5).slice(0, 3));

  const [phase,     setPhase]     = useState<Phase>('idle');
  const [dogType,   setDogType]   = useState<DogType>('tito');
  const [callId,    setCallId]    = useState(0);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [placed,    setPlaced]    = useState(0);
  const [message,   setMessage]   = useState('');
  const [completed, setCompleted] = useState(false);
  const [allDone,   setAllDone]   = useState(false);

  const sfx    = useRef<{ snap?: Howl; bark?: Howl; success?: Howl }>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    sfx.current = {
      snap:    new Howl({ src: ['/assets/sounds/water-drop.mp3'],   volume: 0.22 }),
      bark:    new Howl({ src: ['/assets/sounds/lia-bark.mp3'],     volume: 0.32 }),
      success: new Howl({ src: ['/assets/sounds/magia-brillo.mp3'], volume: 0.28 }),
    };
    return () => {
      Object.values(sfx.current).forEach(s => s?.unload());
      timers.current.forEach(clearTimeout);
    };
  }, []);

  const showMsg = useCallback((text: string, dur = 3000) => {
    setMessage(text);
    const t = setTimeout(() => setMessage(''), dur);
    timers.current.push(t);
  }, []);

  const callDog = (dog: DogType) => {
    setDogType(dog);
    setPhase('calling');
    const t = setTimeout(() => { setPhase('intro'); setCallId(id => id + 1); }, 700);
    timers.current.push(t);
    showMsg(`¡${dog === 'tito' ? 'Tito 🦊' : 'Lia 🤍'}, ven aquí!`, 2000);
  };

  const handleImpact   = useCallback(() => { setPhase('breaking'); sfx.current.bark?.play(); }, []);
  const handleSettled  = useCallback(() => setPhase('puzzle'), []);

  const handleSnap = useCallback((count: number) => {
    setPlaced(count);
    sfx.current.snap?.play();
    if (count > 0 && count % 4 === 0 && count < TOTAL) {
      const msgs = ['¡Vas increíble! 🌟', '¡Sigue así! 💪', '¡Casi lo tienes! ✨'];
      showMsg(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, [showMsg]);

  const handleComplete = useCallback(() => {
    reduceLevel();
    sfx.current.success?.play();
    setCompleted(true);
    setPhase('complete');
    showMsg(puzzlesRef.current[puzzleIdx]?.message ?? '', 5000);
  }, [reduceLevel, puzzleIdx, showMsg]);

  const nextPuzzle = () => {
    if (puzzleIdx >= puzzlesRef.current.length - 1) { setAllDone(true); return; }
    setPlaced(0); setCompleted(false); setMessage(''); setPhase('idle');
    setPuzzleIdx(p => p + 1);
  };

  const cur = puzzlesRef.current[puzzleIdx];
  const progress = (placed / TOTAL) * 100;

  return createPortal(
    <div className="puzzle">
      <div className="puzzle__canvas-wrap">
        <Canvas
          shadows
          camera={{ position: [0, 1.6, 4.6], fov: 58, near: 0.1, far: 60 }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
          style={{ touchAction: 'none' }}
        >
          <Suspense fallback={null}>
            <BedroomScene
              phase={phase} dogType={dogType} callId={callId}
              texture={cur.src}
              onImpact={handleImpact} onSettled={handleSettled}
              onSnap={handleSnap} onComplete={handleComplete}
            />
          </Suspense>
          <EffectComposer>
            <Bloom intensity={0.3} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.22} darkness={0.45} />
          </EffectComposer>
        </Canvas>

        {/* ── Top bar ── */}
        <div className="puzzle__topbar">
          <button className="puzzle__back-btn" onClick={() => navigate('/games')}>← Volver</button>
          <div className="puzzle__title-block">
            <h2 className="puzzle__title">🧩 <span className="puzzle__gradient">Rompecabezas del Refugio</span></h2>
            <p className="puzzle__subtitle">{subtitleFor(phase, dogType, placed)}</p>
          </div>
        </div>

        {/* ── Dog selector ── */}
        <AnimatePresence>
          {phase === 'idle' && (
            <motion.div
              className="puzzle__dog-select"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="puzzle__dog-select-label">¿Quién rompe el cuadro hoy?</p>
              <div className="puzzle__dog-btns">
                <button className="puzzle__call-btn puzzle__call-btn--tito" onClick={() => callDog('tito')}>
                  🦊 Llamar a Tito
                </button>
                <button className="puzzle__call-btn puzzle__call-btn--lia" onClick={() => callDog('lia')}>
                  🤍 Llamar a Lia
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hint during puzzle ── */}
        {phase === 'puzzle' && (
          <div className="puzzle__hint">
            Arrastra las piezas de los costados hacia el cuadro · tócalas en celular
          </div>
        )}

        {/* ── Floating message ── */}
        <AnimatePresence>
          {message && (
            <motion.div className="puzzle__msg" key={message}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress bar (bottom) ── */}
        {phase === 'puzzle' && (
          <div className="puzzle__progress">
            <motion.div className="puzzle__progress-fill"
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
        )}
      </div>

      {/* ── Victory overlay ── */}
      <AnimatePresence>
        {(completed || allDone) && (
          <motion.div className="puzzle__overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="puzzle__victory"
              initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <div className="puzzle__victory-emoji">{allDone ? '🏆' : '🎉'}</div>
              <h3>{allDone ? '¡Increíble!' : '¡Lo lograste!'}</h3>
              <p>{allDone ? 'Completaste todos los rompecabezas.\nEres maravillosa 🌟' : cur.message}</p>
              <div className="puzzle__victory-actions">
                {!allDone && (
                  <button className="btn-primary" onClick={nextPuzzle}>
                    {puzzleIdx < puzzlesRef.current.length - 1 ? 'Siguiente imagen →' : 'Finalizar 🌟'}
                  </button>
                )}
                <button className="btn-secondary" onClick={() => navigate('/games')}>← Volver</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}