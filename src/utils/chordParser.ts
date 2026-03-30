// chordParser.ts

/**
 * Parses lyrics with embedded chords and generates chord-to-word alignment.
 */

function parseLyricsWithChords(lyrics: string): ChordAlignment[] {
    const lines = lyrics.split('\n');
    const chordAlignments: ChordAlignment[] = [];

    lines.forEach(line => {
        const words = line.split(' ');
        let currentChords: string[] = [];

        words.forEach(word => {
            const chordMatch = word.match(/\[(.*?)\]/);
            if (chordMatch) {
                // If a chord is found, push current word alignments
                if (currentChords.length) {
                    chordAlignments.push({ chords: currentChords, word: '', line: '' });
                }
                currentChords.push(chordMatch[1]);
                word = word.replace(chordMatch[0], ''); // Remove chord from word
            }
            // Align the word with the last found chords
            if (currentChords.length) {
                chordAlignments.push({ chords: [...currentChords], word, line });
            }
        });
    });
    return chordAlignments;
}

interface ChordAlignment {
    chords: string[];
    word: string;
    line: string;
}

export { parseLyricsWithChords };