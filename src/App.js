import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import PracticeHome from './components/PracticeHome';
import TypingSession from './components/TypingSession';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<PracticeHome />} />
          <Route path="/practice/:language" element={<TypingSession />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;