import React from 'react';
import Fretboard from './components/Fretboard.tsx';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>FretNot</h1>
      <Fretboard />
    </div>
  );
}

export default App;
