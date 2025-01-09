import React, { useState, useEffect } from 'react';
import { Chord } from '@tonaljs/tonal';

const Fretboard: React.FC = () => {
  const openStringNotes = ['E', 'B', 'G', 'D', 'A', 'E'];
  const [selectedFrets, setSelectedFrets] = useState<number[]>(Array(6).fill(-1));
  const [selectedNotes, setSelectedNotes] = useState<string[]>(Array(6).fill('X'));
  const [possibleChords, setPossibleChords] = useState<string[]>([]);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);

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

  // Add array of all notes
  const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Function to find fret position for a note on a string
  const findFretForNote = (targetNote: string, stringIndex: number): number => {
    let currentNote = openStringNotes[stringIndex];
    let fret = 0;
    
    while (fret <= 15) { // Search up to fret 15
      if (currentNote === targetNote) return fret;
      const noteIndex = allNotes.indexOf(currentNote);
      currentNote = allNotes[(noteIndex + 1) % allNotes.length];
      fret++;
    }
    return -1; // Note not found within 15 frets
  };

  // Function to set chord
  const setChord = (rootNote: string, chordType: string) => {
    // Get the notes in the chord
    const chordNotes = Chord.get(`${rootNote}${chordType}`).notes;
    
    const newSelectedFrets = [-1, -1, -1, -1, -1, -1];
    
    if (chordNotes.length >= 3) {
      const rootOnSixth = findFretForNote(rootNote, 5);
      if (rootOnSixth <= 3) {
        newSelectedFrets[5] = rootOnSixth;
        newSelectedFrets[4] = findFretForNote(chordNotes[2], 4);
        newSelectedFrets[3] = findFretForNote(chordNotes[1], 3);
        newSelectedFrets[2] = findFretForNote(chordNotes[0], 2);
        newSelectedFrets[1] = findFretForNote(chordNotes[2], 1);
        newSelectedFrets[0] = findFretForNote(chordNotes[0], 0);
      } else {
        const rootOnFifth = findFretForNote(rootNote, 4);
        newSelectedFrets[4] = rootOnFifth;
        newSelectedFrets[3] = findFretForNote(chordNotes[2], 3);
        newSelectedFrets[2] = findFretForNote(chordNotes[1], 2);
        newSelectedFrets[1] = findFretForNote(chordNotes[0], 1);
        newSelectedFrets[0] = findFretForNote(chordNotes[2], 0);
      }
    }

    setSelectedFrets(newSelectedFrets);
  };

  useEffect(() => {
    const notes = selectedFrets.map((fret, stringIndex) => {
      if (fret === -1) return 'X'; // Muted
      if (fret === 0) return openStringNotes[stringIndex]; // Open string
      return getNoteName(stringIndex, fret);
    });
    setSelectedNotes(notes.reverse());

    // Get unique notes (excluding muted strings 'X')
    const uniqueNotes = Array.from(new Set(notes.filter(note => note !== 'X')));
    
    // Find possible chords
    if (uniqueNotes.length > 0) {
      const detected = Chord.detect(uniqueNotes);
      setPossibleChords(detected);
    } else {
      setPossibleChords([]);
    }
  }, [selectedFrets]);

  return (
    <div className="fretboard-container">
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
        {/* Display selected notes and possible chords */}
        <div className="selected-notes">
          Selected Notes: {selectedNotes.join(', ')}
        </div>
        <div className="possible-chords">
          Possible Chords: {possibleChords.length > 0 
            ? possibleChords.join(', ') 
            : 'No chord detected'}
        </div>
      </div>
      
      {/* Root note selection */}
      <div className="root-note-buttons">
        {allNotes.map((note) => (
          <button
            key={note}
            onClick={() => setSelectedRoot(note)}
            className={`note-button ${selectedRoot === note ? 'selected' : ''}`}
          >
            {note}
          </button>
        ))}
      </div>

      {/* Chord type selection */}
      <div className="chord-type-buttons">
        <button
          className="chord-type-button"
          onClick={() => selectedRoot && setChord(selectedRoot, 'maj')}
          disabled={!selectedRoot}
        >
          Major
        </button>
        <button
          className="chord-type-button"
          onClick={() => selectedRoot && setChord(selectedRoot, 'm')}
          disabled={!selectedRoot}
        >
          Minor
        </button>
        <button
          className="chord-type-button"
          onClick={() => selectedRoot && setChord(selectedRoot, 'dim')}
          disabled={!selectedRoot}
        >
          Diminished
        </button>
        <button
          className="chord-type-button"
          onClick={() => selectedRoot && setChord(selectedRoot, 'aug')}
          disabled={!selectedRoot}
        >
          Augmented
        </button>
      </div>
    </div>
  );
};

export default Fretboard; 