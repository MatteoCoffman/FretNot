import React, { useState } from 'react';

const Fretboard: React.FC = () => {
  const [selectedFrets, setSelectedFrets] = useState<number[]>(Array(6).fill(-1));

  const handleFretClick = (stringIndex: number, fretIndex: number) => {
    const newSelectedFrets = [...selectedFrets];
    newSelectedFrets[stringIndex] = fretIndex;
    setSelectedFrets(newSelectedFrets);
  };

  const getNoteName = (fretIndex: number): string => {
    // Simplified note names for demonstration
    const notes = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G'];
    return notes[fretIndex % notes.length];
  };

  return (
    <div className="fretboard">
      {Array.from({ length: 6 }).map((_, stringIndex) => (
        <div key={stringIndex} className="string">
          {Array.from({ length: 17 }).map((_, fretIndex) => (
            <div
              key={fretIndex}
              className={`fret ${selectedFrets[stringIndex] === fretIndex ? 'selected' : ''}`}
              onClick={() => handleFretClick(stringIndex, fretIndex)}
            >
              {selectedFrets[stringIndex] === fretIndex && fretIndex !== 16 && (
                <div className="note-circle">{getNoteName(fretIndex)}</div>
              )}
              {fretIndex === 16 && selectedFrets[stringIndex] === fretIndex && (
                <div className="note-circle">X</div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Fretboard; 