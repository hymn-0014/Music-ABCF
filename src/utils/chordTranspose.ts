function transposeChord(chord: string, semitones: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const index = notes.indexOf(chord);
    if (index === -1) throw new Error('Invalid chord');
    const newIndex = (index + semitones + notes.length) % notes.length;
    return notes[newIndex];
}

function convertToNashville(chord: string): string {
    const nashvilleMapping: { [key: string]: string } = {
        'C': '1',
        'D': '2',
        'E': '3',
        'F': '4',
        'G': '5',
        'A': '6',
        'B': '7',
        'C#': '1#',
        'D#': '2#',
        'F#': '4#',
        'G#': '5#',
        'A#': '6#'
    };
    return nashvilleMapping[chord] || chord;
}

function convertFromNashville(nashNumber: string): string {
    const nashvilleReverseMapping: { [key: string]: string } = {
        '1': 'C',
        '2': 'D',
        '3': 'E',
        '4': 'F',
        '5': 'G',
        '6': 'A',
        '7': 'B',
        '1#': 'C#',
        '2#': 'D#',
        '4#': 'F#',
        '5#': 'G#',
        '6#': 'A#'
    };
    return nashvilleReverseMapping[nashNumber] || nashNumber;
}

export { transposeChord, convertToNashville, convertFromNashville };