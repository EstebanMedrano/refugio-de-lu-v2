import { useNavigate } from 'react-router-dom';
import { useAnxiety } from '../context/AnxietyContext';

export default function Victory() {
  const navigate = useNavigate();
  const { setLevel } = useAnxiety();

  const handleReset = () => {
    setLevel(0);
    navigate('/');
  };

  return (
    <div className="text-center" style={{ padding: '60px 20px' }}>
      <div style={{ fontSize: '5rem', marginBottom: 24 }}>🎉</div>
      <h2 style={{ color: '#5e63b6', marginBottom: 16 }}>¡Lo lograste!</h2>
      <p style={{ fontSize: '1.25rem', marginBottom: 32 }}>
        Has reducido tu ansiedad a cero.
      </p>
      <p style={{ marginBottom: 32 }}>
        Respira profundo. Estás bien. Este momento es tuyo.
      </p>
      <button className="btn-primary" onClick={handleReset}>
        Comenzar de nuevo
      </button>
    </div>
  );
}