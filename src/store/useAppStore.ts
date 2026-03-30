import create from 'zustand';

type UserSettings = {
    theme: string;
    notificationsEnabled: boolean;
};

type AppState = {
    songs: string[];
    setlists: string[];
    currentSong: string | null;
    transposeLevel: number;
    userSettings: UserSettings;
    setSongs: (songs: string[]) => void;
    setSetlists: (setlists: string[]) => void;
    setCurrentSong: (song: string | null) => void;
    setTransposeLevel: (level: number) => void;
    setUserSettings: (settings: UserSettings) => void;
};

const useAppStore = create<AppState>((set) => ({
    songs: [],
    setlists: [],
    currentSong: null,
    transposeLevel: 0,
    userSettings: { theme: 'light', notificationsEnabled: true },
    setSongs: (songs) => set({ songs }),
    setSetlists: (setlists) => set({ setlists }),
    setCurrentSong: (song) => set({ currentSong: song }),
    setTransposeLevel: (level) => set({ transposeLevel: level }),
    setUserSettings: (settings) => set({ userSettings: { ...settings } }),
}));

export default useAppStore;