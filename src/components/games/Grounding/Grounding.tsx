import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnxiety } from '../../context/AnxietyContext';
import './Grounding.scss';

interface Step {
  id: string;
  number: number;
  label: string;
  icon: string;
  placeholder: string;
  description: (remaining: number) => string;
}

const STEPS: Step[] = [
  {
    id: 'see', number: 5, label: 'Cosas que puedes VER', icon: '👁️',
    placeholder: 'Ej: La luz de la ventana, mi taza...',
    description: (r) => `Observa tu entorno. Te quedan ${r} por encontrar.`,
  },
  {
    id: 'touch', number: 4, label: 'Cosas que puedes TOCAR', icon: '🖐️',
    placeholder: 'Ej: La textura de mi ropa, el teclado...',
    description: (r) => `Siente las texturas a tu alcance. Te quedan ${r}.`,
  },
  {
    id: 'hear', number: 3, label: 'Cosas que puedes OÍR', icon: '👂',
    placeholder: 'Ej: El viento, mi respiración...',
    description: (r) => `Cierra los ojos. Escucha con atención. Te quedan ${r}.`,
  },
  {
    id: 'smell', number: 2, label: 'Cosas que puedes OLER', icon: '👃',
    placeholder: 'Ej: Café, aire fresco...',
    description: (r) => `Inhala profundo. ¿Qué aromas percibes? Te quedan ${r}.`,
  },
  {
    id: 'taste', number: 1, label: 'Algo que puedes SABOREAR', icon: '👅',
    placeholder: 'Ej: Menta, agua...',
    description: () => '¿Hay algún sabor en tu boca? Tómate un momento.',
  },
];

const ACCENT_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Grounding() {
  const navigate = useNavigate();
  const { reduceLevel } = useAnxiety();

  // items por paso: array de arrays
  const [items, setItems]         = useState<string[][]>(STEPS.map(() => []));
  const [stepIndex, setStepIndex] = useState(0);
  const [input, setInput]         = useState('');
  const [feedback, setFeedback]   = useState('');
  const [finished, setFinished]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const step    = STEPS[stepIndex];
  const current = items[stepIndex];
  const accent  = ACCENT_COLORS[stepIndex];
  const remaining  = step.number - current.length;
  const stepDone   = current.length === step.number;
  const totalItems = STEPS.reduce((s, st) => s + st.number, 0);
  const doneItems  = items.reduce((s, arr) => s + arr.length, 0);
  const totalPct   = (doneItems / totalItems) * 100;

  // focus al cambiar de paso
  useEffect(() => {
    if (!stepDone) setTimeout(() => inputRef.current?.focus(), 300);
  }, [stepIndex, stepDone]);

  const addItem = () => {
    const val = input.trim();
    if (!val) return;
    if (current.includes(val)) {
      setFeedback('Ya anotaste eso, intenta con otra cosa');
      setTimeout(() => setFeedback(''), 2000);
      return;
    }
    const updated = items.map((arr, i) => i === stepIndex ? [...arr, val] : arr);
    setItems(updated);
    setInput('');
    if (updated[stepIndex].length === step.number) {
      setFeedback('¡Paso completado! ✨');
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addItem();
  };

  const nextStep = () => {
    setFeedback('');
    setStepIndex(prev => prev + 1);
  };

  const finish = () => {
    reduceLevel();
    setFinished(true);
  };

  // ── pantalla de finalización ───────────────────────────────────────────────
  if (finished) {
    return (
      <motion.div
        className="grounding"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grounding__completion">
          <div className="grounding__completion-star">🌟</div>
          <h3>¡Lo lograste!</h3>
          <p>Has completado el grounding. Estás anclada al presente.</p>

          <div className="grounding__summary">
            {STEPS.map((s) => (
              <div key={s.id} className="grounding__summary-row">
                <span>{s.icon}</span>
                <span>{s.number} {s.label.toLowerCase()}</span>
                <span className="grounding__summary-check">✓</span>
              </div>
            ))}
          </div>

          <button className="btn-primary grounding__finish-btn" onClick={() => navigate('/games')}>
            ← Volver a juegos
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grounding">
      <h2 className="text-center">
        <span className="grounding__title">🌍 Técnica 5-4-3-2-1</span>
      </h2>

      {/* indicadores de paso */}
      <div className="grounding__steps-row">
        {STEPS.map((s, i) => {
          const done = items[i].length === s.number;
          const active = i === stepIndex;
          return (
            <div
              key={s.id}
              className={`grounding__step-dot${active ? ' grounding__step-dot--active' : ''}${done ? ' grounding__step-dot--done' : ''}`}
              style={{ '--dot-color': ACCENT_COLORS[i] } as React.CSSProperties}
            >
              <span className="grounding__step-dot-icon">{s.icon}</span>
              <span className="grounding__step-dot-num">{s.number}</span>
              {done && <span className="grounding__step-dot-check">✓</span>}
            </div>
          );
        })}
      </div>

      {/* barra de progreso total */}
      <div className="grounding__total-bar">
        <motion.div
          className="grounding__total-fill"
          animate={{ width: `${totalPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* contenido del paso actual con animación al cambiar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          className="grounding__step-card"
          style={{ '--accent': accent } as React.CSSProperties}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          {/* cabecera del paso */}
          <div className="grounding__step-header">
            <span className="grounding__step-icon">{step.icon}</span>
            <div>
              <h3 className="grounding__step-label">{step.label}</h3>
              <p className="grounding__step-desc">{step.description(remaining)}</p>
            </div>
            <span className="grounding__step-counter">{current.length}/{step.number}</span>
          </div>

          {/* barra del paso */}
          <div className="grounding__step-bar">
            <motion.div
              className="grounding__step-fill"
              animate={{ width: `${(current.length / step.number) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* pills de ítems */}
          <div className="grounding__pills">
            <AnimatePresence>
              {current.map((item, i) => (
                <motion.div
                  key={item + i}
                  className="grounding__pill"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <span>✓</span> {item}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* input o mensaje de completado */}
          {!stepDone ? (
            <div className="grounding__input-row">
              <input
                ref={inputRef}
                className="grounding__input"
                type="text"
                placeholder={step.placeholder}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="off"
              />
              <button
                className="grounding__add-btn"
                onClick={addItem}
                disabled={!input.trim()}
                style={{ '--accent': accent } as React.CSSProperties}
              >
                ✚ Añadir
              </button>
            </div>
          ) : (
            <motion.div
              className="grounding__step-done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span>✨ ¡Paso completado! ✨</span>
              {stepIndex < STEPS.length - 1 ? (
                <button className="btn-primary" onClick={nextStep}>
                  Siguiente sentido →
                </button>
              ) : (
                <button
                  className="btn-primary grounding__finish-btn"
                  onClick={finish}
                >
                  🌟 Finalizar grounding
                </button>
              )}
            </motion.div>
          )}

          {/* feedback inline */}
          {feedback && !stepDone && (
            <p className="grounding__feedback">{feedback}</p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* botón volver */}
      <div className="grounding__back">
        <button className="btn-secondary" onClick={() => navigate('/games')}>
          ← Volver a juegos
        </button>
      </div>
    </div>
  );
}