import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AdminPage from './pages/AdminPage.jsx';

import WordlePage from './games/wordle/WordlePage.jsx';
import ZipPage from './games/zip/ZipPage.jsx';
import WordSearchPage from './games/wordsearch/WordSearchPage.jsx';
import MathSprintPage from './games/mathsprint/MathSprintPage.jsx';
import MemoryPage from './games/memory/MemoryPage.jsx';
import HangmanPage from './games/hangman/HangmanPage.jsx';
import NumberHuntPage from './games/numguess/NumberHuntPage.jsx';
import ConnectionsPage from './games/connections/ConnectionsPage.jsx';
import EmojiRiddlesPage from './games/emoji/EmojiRiddlesPage.jsx';
import MiniCrosswordPage from './games/minicrossword/MiniCrosswordPage.jsx';
import RiddleRushPage from './games/riddlerush/RiddleRushPage.jsx';
import WordChainPage from './games/wordchain/WordChainPage.jsx';
import TypingPage from './games/typing/TypingPage.jsx';
import FinaleWordlePage from './games/finalewordle/FinaleWordlePage.jsx';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<HomePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="admin" element={<AdminPage />} />

          <Route path="games/wordle" element={<WordlePage />} />
          <Route path="games/zip" element={<ZipPage />} />
          <Route path="games/wordsearch" element={<WordSearchPage />} />
          <Route path="games/mathsprint" element={<MathSprintPage />} />
          <Route path="games/memory" element={<MemoryPage />} />
          <Route path="games/hangman" element={<HangmanPage />} />
          <Route path="games/number-hunt" element={<NumberHuntPage />} />
          <Route path="games/connections" element={<ConnectionsPage />} />
          <Route path="games/emoji-riddles" element={<EmojiRiddlesPage />} />
          <Route path="games/mini-crossword" element={<MiniCrosswordPage />} />
          <Route path="games/riddle-rush" element={<RiddleRushPage />} />
          <Route path="games/word-chain" element={<WordChainPage />} />
          <Route path="games/typing" element={<TypingPage />} />
          <Route path="games/championship-wordle" element={<FinaleWordlePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
