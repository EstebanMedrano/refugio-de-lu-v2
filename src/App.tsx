import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SplashScreen from './components/common/SplashScreen';
import { AnxietyProvider } from './components/context/AnxietyContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import Welcome from './components/common/Welcome';
import GamesMenu from './components/common/GamesMenu';
import GameView from './components/common/GameView';
import Victory from './components/common/Victory';
import './styles/global.scss';

function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <SplashScreen onFinish={() => setLoading(false)} />;
  }

  return (
    <AnxietyProvider>
      <BrowserRouter>
        <div className="app-container">
          <Header />
          <main className="view-container">
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/games" element={<GamesMenu />} />
              <Route path="/game/:gameName" element={<GameView />} />
              <Route path="/victory" element={<Victory />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AnxietyProvider>
  );
}

export default App;