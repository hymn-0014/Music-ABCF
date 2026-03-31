import { Song, Setlist } from '../types';

export const songs: Song[] = [
  {
    id: '1',
    title: 'Amazing Grace',
    artist: 'John Newton',
    key: 'G',
    tempo: 84,
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
    tempo: 76,
    lines: [
      { chords: 'Bb       Eb       Bb',        lyrics: 'O Lord my God when I in awesome wonder' },
      { chords: 'Bb       F        Bb',        lyrics: 'Consider all the worlds Thy hands have made' },
      { chords: 'Eb       Bb       F',         lyrics: 'Then sings my soul my Saviour God to Thee' },
      { chords: 'Bb       Eb  F    Bb',        lyrics: 'How great Thou art how great Thou art' },
    ],
  },
  {
    id: '3',
    title: 'Be Thou My Vision',
    artist: 'Traditional Irish Hymn',
    key: 'D',
    tempo: 78,
    lines: [
      { chords: 'D        G        D',         lyrics: 'Be Thou my vision O Lord of my heart' },
      { chords: 'Bm       G   A    D',         lyrics: 'Naught be all else to me save that Thou art' },
      { chords: 'D        G        D',         lyrics: 'Thou my best thought by day or by night' },
      { chords: 'Bm       G   A    D',         lyrics: 'Waking or sleeping Thy presence my light' },
    ],
  },
  {
    id: '4',
    title: 'Beautiful Savior',
    artist: 'Planet Shakers',
    key: 'G',
    tempo: 72,
    lines: [
      { chords: 'G        D/F#     Em       C', lyrics: 'Beautiful Savior You have brought me near' },
      { chords: 'G        D/F#     C',          lyrics: 'You pulled me from the ashes' },
      { chords: 'G        D/F#     Em       C', lyrics: 'You have broken every curse' },
      { chords: 'G        D/F#     C',          lyrics: 'Blessed Redeemer You have set this captive free' },
    ],
  },
  {
    id: '5',
    title: 'Celebrate Jesus Celebrate',
    artist: 'Unknown',
    key: 'C',
    tempo: 118,
    lines: [
      { chords: 'C        F        C',         lyrics: 'Celebrate Jesus celebrate' },
      { chords: 'C        G        C',         lyrics: 'Celebrate Jesus celebrate' },
      { chords: 'F        C        Am',        lyrics: 'He is risen He is risen' },
      { chords: 'F        G        C',         lyrics: 'And He lives forevermore' },
    ],
  },
  {
    id: '6',
    title: 'My Redeemer Lives',
    artist: 'Unknown',
    key: 'E',
    tempo: 124,
    lines: [
      { chords: 'E        B        C#m      A', lyrics: 'I know He rescued my soul His blood has covered my sin' },
      { chords: 'E        B        A',          lyrics: 'I believe I believe' },
      { chords: 'E        B        C#m      A', lyrics: 'My shame He has taken away My pain is healed in His name' },
      { chords: 'E        B        A',          lyrics: 'I believe I believe' },
    ],
  },
  {
    id: '7',
    title: 'Grace to Grace',
    artist: 'Unknown',
    key: 'D',
    tempo: 70,
    lines: [
      { chords: 'D        A        Bm       G', lyrics: 'If love endured that ancient cross how precious is my Savior\'s blood' },
      { chords: 'D        A        G',          lyrics: 'The beauty of heaven wrapped in my shame' },
      { chords: 'D        A        Bm       G', lyrics: 'The image of love upon death\'s frame' },
      { chords: 'D        A        G',          lyrics: 'If having my heart was worth the pain' },
    ],
  },
  {
    id: '8',
    title: 'At the Cross',
    artist: 'Unknown',
    key: 'D',
    tempo: 74,
    lines: [
      { chords: 'D        A        Bm       G', lyrics: 'Oh Lord You\'ve searched me You know my way' },
      { chords: 'D        A        G',          lyrics: 'Even when I fail You I know You love me' },
      { chords: 'D        A        Bm       G', lyrics: 'At the cross I bow my knee where Your blood was shed for me' },
      { chords: 'D        A        G',          lyrics: 'There\'s no greater love than this' },
    ],
  },
  {
    id: '9',
    title: 'Forever',
    artist: 'Kari Jobe',
    key: 'G',
    tempo: 68,
    lines: [
      { chords: 'G        D/F#     Em       C', lyrics: 'The moon and stars they wept the morning sun was dead' },
      { chords: 'G        D/F#     Em       C', lyrics: 'The Savior of the world was fallen' },
      { chords: 'G        D/F#     Em       C', lyrics: 'His body on the cross His blood poured out for us' },
      { chords: 'G        D/F#     Em       C', lyrics: 'The weight of every curse upon Him' },
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