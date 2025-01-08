import React, { useState, useEffect } from 'react';

const Fretboard: React.FC = () => {
  const openStringNotes = ['E', 'B', 'G', 'D', 'A', 'E'];
  const [selectedFrets, setSelectedFrets] = useState<number[]>(Array(6).fill(-1));
  const [selectedNotes, setSelectedNotes] = useState<string[]>(Array(6).fill('X'));

  const handleFretClick = (stringIndex: number, fretIndex: number) => {
    const newSelectedFrets = [...selectedFrets];
    newSelectedFrets[stringIndex] = newSelectedFrets[stringIndex] === fretIndex ? -1 : fretIndex;
    setSelectedFrets(newSelectedFrets);
  };

  const toggleOpenString = (stringIndex: number) => {
    const newSelectedFrets = [...selectedFrets];
    newSelectedFrets[stringIndex] = newSelectedFrets[stringIndex] === 0 ? -1 : 0;
    setSelectedFrets(newSelectedFrets);
  };

  const getNoteName = (stringIndex: number, fretIndex: number): string => {
    const notes = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
    const openNoteIndex = notes.indexOf(openStringNotes[stringIndex]);
    return notes[(openNoteIndex + fretIndex) % notes.length];
  };

  const fretMarkers = [3, 5, 7, 9, 12];

  useEffect(() => {
    const notes = selectedFrets.map((fret, stringIndex) => {
      if (fret === -1) return 'X'; // Muted
      if (fret === 0) return openStringNotes[stringIndex]; // Open string
      return getNoteName(stringIndex, fret);
    });
    setSelectedNotes(notes.reverse());
  }, [selectedFrets]);

  return (
    <div className="fretboard">
      {Array.from({ length: 6 }).map((_, stringIndex) => (
        <div key={stringIndex} className="string">
          {/* Open string toggle */}
          <div
            className={`fret open-string ${selectedFrets[stringIndex] === 0 ? 'selected' : ''}`}
            onClick={() => toggleOpenString(stringIndex)}
          >
            {selectedFrets[stringIndex] === 0 ? openStringNotes[stringIndex] : (selectedFrets[stringIndex] === -1 ? 'X' : '')}
          </div>
          {/* Frets 1 to 15 */}
          {Array.from({ length: 15 }).map((_, fretIndex) => (
            <div
              key={fretIndex + 1}
              className={`fret ${selectedFrets[stringIndex] === fretIndex + 1 ? 'selected' : ''}`}
              onClick={() => handleFretClick(stringIndex, fretIndex + 1)}
            >
              {selectedFrets[stringIndex] === fretIndex + 1 && (
                <div className="note-circle">
                  {getNoteName(stringIndex, fretIndex + 1)}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {/* Fret markers */}
      <div className="fret-markers">
        <div className="fret-marker"></div> {/* Placeholder for open string */}
        {Array.from({ length: 15 }).map((_, fretIndex) => (
          <div key={fretIndex + 1} className="fret-marker">
            {fretMarkers.includes(fretIndex + 1) && (
              <div className={`marker ${fretIndex + 1 === 12 ? 'double' : ''}`}></div>
            )}
          </div>
        ))}
      </div>
      {/* Display selected notes */}
      <div className="selected-notes">
        Selected Notes: {selectedNotes.join(', ')}
      </div>
    </div>
  );
};

export default Fretboard; 