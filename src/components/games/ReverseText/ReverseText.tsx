import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../../context/AnxietyContext';
import './ReverseText.scss';

const PHRASES = [
  'todo pasa',
  'estoy a salvo',
  'respira profundo',
  'confío en mí',
  'soy suficiente'
];

export default function ReverseText() {
  const navigate = useNavigate();
  const { reduceLevel } = useAnxiety();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const totalPhrases = PHRASES.length;
  const phrase = PHRASES[currentIndex];
  const progress = (completedCount / totalPhrases) * 100;

  const checkAnswer = () => {
    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedOriginal = phrase.toLowerCase();

    if (normalizedAnswer === normalizedOriginal) {
      setFeedback('✅ ¡Correcto!');
      setIsCorrect(true);
      
      if (completedCount + 1 >= totalPhrases) {
        reduceLevel();
        setCompletedCount(prev => prev + 1);
        setTimeout(() => navigate('/victory'), 1500);
      } else {
        setCompletedCount(prev => prev + 1);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setAnswer('');
          setFeedback('');
          setIsCorrect(false);
        }, 800);
      }
    } else {
      setFeedback('❌ No es correcto, intenta de nuevo');
      setAnswer('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && answer.trim() !== '') {
      checkAnswer();
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setCompletedCount(0);
    setAnswer('');
    setFeedback('');
    setIsCorrect(false);
  };

  return (
    <div className="reverse-game">
      <h2 className="text-center">
        <span style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🔄 Texto al Revés
        </span>
      </h2>
      <p className="text-center" style={{ color: '#94a3b8', marginBottom: 16 }}>
        Lee la frase rotada. {completedCount} de {totalPhrases} completadas
      </p>

      <div className="reverse-progress">
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rotated-phrase-container">
        <div className="rotated-phrase">{phrase}</div>
        <p className="hint-text">↑ Gira tu cabeza o el dispositivo ↑</p>
      </div>

      <div className="reverse-input-area">
        <input
          type="text"
          className="reverse-input"
          placeholder="Escribe la frase correcta..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isCorrect}
          autoFocus
        />
        <button
          className="btn-check"
          onClick={checkAnswer}
          disabled={answer.trim() === '' || isCorrect}
        >
          <span>✓</span> Comprobar
        </button>
      </div>

      {feedback && (
        <div className={`feedback-message ${isCorrect ? 'success' : 'error'}`}>
          {feedback}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 32 }}>
        <button className="btn-secondary" onClick={handleReset}>
          🔄 Reiniciar
        </button>
        <button className="btn-secondary" onClick={() => navigate('/games')}>
          ← Volver
        </button>
      </div>
    </div>
  );
}