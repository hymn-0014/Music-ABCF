import { Song, Setlist } from '../types';

export const songs: Song[] = [
  {
    id: '1',
    title: 'Amazing Grace',
    artist: 'John Newton',
    key: 'G',
    lines: [
      { chords: 'G        G7       C        G', lyrics: 'Amazing grace how sweet the sound' },
      { chords: 'G        Em       A7       D', lyrics: 'That saved a wretch like me' },
      { chords: 'G        G7       C        G', lyrics: 'I once was lost but now am found' },
      { chords: 'G        Em  D    G',          lyrics: 'Was blind but now I see' },
    ],
  },
  {
    id: '2',
    title: 'How Great Thou Art',
    artist: 'Carl Boberg',
    key: 'Bb',
    lines: [
      { chords: 'Bb       Eb       Bb',        lyrics: 'O Lord my God when I in awesome wonder' },
      { chords: 'Bb       F        Bb',         lyrics: 'Consider all the worlds Thy hands have made' },
      { chords: 'Eb       Bb       F',          lyrics: 'Then sings my soul my Saviour God to Thee' },
      { chords: 'Bb       Eb  F    Bb',         lyrics: 'How great Thou art how great Thou art' },
    ],
  },
  {
    id: '3',
    title: 'Be Thou My Vision',
    artist: 'Traditional Irish Hymn',
    key: 'D',
    lines: [
      { chords: 'D        G        D',          lyrics: 'Be Thou my vision O Lord of my heart' },
      { chords: 'Bm       G   A    D',          lyrics: 'Naught be all else to me save that Thou art' },
      { chords: 'D        G        D',          lyrics: 'Thou my best thought by day or by night' },
      { chords: 'Bm       G   A    D',          lyrics: 'Waking or sleeping Thy presence my light' },
    ],
  },
];

export const setlists: Setlist[] = [
  {
    id: 'sl-1',
    name: 'Sunday Service',
    songIds: ['1', '2'],
    createdAt: '2026-03-28T10:00:00Z',
  },
  {
    id: 'sl-2',
    name: 'Special Event',
    songIds: ['3', '1'],
    createdAt: '2026-03-29T18:00:00Z',
  },
];