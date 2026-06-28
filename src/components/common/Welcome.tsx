import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../context/AnxietyContext';

const emojis = ['😊', '😊', '😊', '😟', '😟', '😟', '😰', '😰', '😰', '🌋'];

export default function Welcome() {
  const { setLevel } = useAnxiety();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (level: number) => {
    setSelected(level);
    setLevel(level);
  };

  const handleStart = () => {
    if (selected !== null) {
      navigate('/games');
    }
  };

  return (
    <div className="welcome-card">
      <h2>Hola, ¿cómo te sientes?</h2>
      <p>Este es tu espacio seguro. Sin prisas. Sin juicios.</p>
      <div className="emojis-scale">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            className={`emotion-btn ${selected === index + 1 ? 'selected' : ''}`}
            onClick={() => handleSelect(index + 1)}
          >
            <span className="emotion-emoji">{emoji}</span>
            <span className="emotion-label">{index + 1}</span>
          </button>
        ))}
      </div>
      <button
        className="btn-primary"
        disabled={selected === null}
        onClick={handleStart}
      >
        Comenzar
      </button>
    </div>
  );
}