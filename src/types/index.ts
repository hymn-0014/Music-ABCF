// src/types/index.ts

export interface Song {
    id: string;
    title: string;
    artist: string;
    album?: string;
    year?: number;
    genre?: string;
    duration: number; // in seconds
    lyrics?: string;
}

export interface Chord {
    id: string;
    name: string;
    type: string; // major, minor, etc.
    positions: string[]; // finger positions on the fretboard
}

export interface Setlist {
    id: string;
    songs: Song[];
    date: string; // ISO date string
    location: string;
    notes?: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    passwords: { [key: string]: string }; // hashed passwords, can be with different providers
    createdAt: string; // ISO date string
}