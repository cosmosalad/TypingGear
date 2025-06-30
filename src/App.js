import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PracticeHome from './components/PracticeHome';
import TypingSession from './components/TypingSession';
import './App.css';

function App() {
  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="App">
        <Routes>
          <Route path="/" element={<PracticeHome />} />
          <Route path="/practice/:mode/:language" element={<TypingSession />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
