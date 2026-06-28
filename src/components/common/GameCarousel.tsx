import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gameIcons } from '../../utils/icons';
import { useNavigate } from 'react-router-dom';
import './GameCarousel.scss';

interface Game {
  id: string;
  title: string;
  desc: string;
}

interface GameCarouselProps {
  games: Game[];
}

export default function GameCarousel({ games }: GameCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? games.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === games.length - 1 ? 0 : prev + 1));
  };

  const getVisibleGames = () => {
    const total = games.length;
    const prev = (currentIndex - 1 + total) % total;
    const next = (currentIndex + 1) % total;
    return [prev, currentIndex, next];
  };

  const visibleIndices = getVisibleGames();

  return (
    <div className="carousel-container">
      <button className="carousel-btn carousel-btn-left" onClick={handlePrev}>
        ‹
      </button>

      <div className="carousel-viewport">
        <AnimatePresence initial={false}>
          {visibleIndices.map((index) => {
            const game = games[index];
            const IconComponent = gameIcons[game.id];
            const isCenter = index === currentIndex;
            const position = index === currentIndex ? 'center' : index === visibleIndices[0] ? 'left' : 'right';

            return (
              <motion.div
                key={game.id}
                className={`carousel-card ${position}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: isCenter ? 1 : 0.85,
                  x: position === 'left' ? -120 : position === 'right' ? 120 : 0,
                  zIndex: isCenter ? 2 : 1,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                onClick={() => isCenter && navigate(`/game/${game.id}`)}
              >
                {IconComponent && <IconComponent size={48} strokeWidth={1.5} />}
                <h3>{game.title}</h3>
                <p>{game.desc}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button className="carousel-btn carousel-btn-right" onClick={handleNext}>
        ›
      </button>
    </div>
  );
}