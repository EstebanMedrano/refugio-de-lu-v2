import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './GameCarousel.scss';

interface Game {
  id: string;
  title: string;
  desc: string;
  image?: string;
  accentColor?: string;
}

interface GameCarouselProps {
  games: Game[];
}

const AUTO_INTERVAL = 3000; // ms entre rotaciones

export default function GameCarousel({ games }: GameCarouselProps) {
  const navigate  = useNavigate();
  const [current, setCurrent]   = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = games.length;

  // ── auto-rotate ────────────────────────────────────────────────────────────
  const startAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % total);
    }, AUTO_INTERVAL);
  }, [total]);

  const stopAuto = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    startAuto();
    return () => stopAuto();
  }, [startAuto, stopAuto]);

  // ── swipe / drag ───────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    setIsDragging(false);
    stopAuto();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const delta = e.clientX - dragStartX.current;
    if (Math.abs(delta) > 40) {
      setIsDragging(true);
      setCurrent(prev =>
        delta < 0 ? (prev + 1) % total : (prev - 1 + total) % total
      );
    }
    startAuto();
  };

  const handleCardClick = (index: number) => {
    if (isDragging) return;
    if (index === current) {
      navigate(`/game/${games[index].id}`);
    } else {
      setCurrent(index);
      stopAuto();
      startAuto();
    }
  };

  // ── position helper ────────────────────────────────────────────────────────
  const getPosition = (index: number) => {
    const diff = (index - current + total) % total;
    if (diff === 0) return 'center';
    if (diff === 1 || diff === -(total - 1)) return 'right';
    if (diff === total - 1 || diff === -1) return 'left';
    return 'hidden';
  };

  return (
    <div className="carousel-wrap">
      <div
        className="carousel-viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {games.map((game, index) => {
          const pos = getPosition(index);
          if (pos === 'hidden') return null;

          return (
            <div
              key={game.id}
              className={`carousel-card carousel-card--${pos}`}
              style={{ '--accent': game.accentColor ?? '#8b5cf6' } as React.CSSProperties}
              onClick={() => handleCardClick(index)}
            >
              {/* imagen o gradiente de fondo */}
              <div className="carousel-card__bg">
                {game.image && (
                  <img
                    src={game.image}
                    alt={game.title}
                    className="carousel-card__img"
                    draggable={false}
                  />
                )}
              </div>

              {/* contenido */}
              <div className="carousel-card__body">
                <h3 className="carousel-card__title">{game.title}</h3>
                <p  className="carousel-card__desc">{game.desc}</p>
                {pos === 'center' && (
                  <span className="carousel-card__cta">Jugar →</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* dots */}
      <div className="carousel-dots">
        {games.map((_, i) => (
          <button
            key={i}
            className={`carousel-dot${i === current ? ' carousel-dot--active' : ''}`}
            onClick={() => { setCurrent(i); stopAuto(); startAuto(); }}
            aria-label={`Ir a juego ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}