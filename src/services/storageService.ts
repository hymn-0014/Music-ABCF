import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    SONGS: 'songs',
    SETLISTS: 'setlists',
};

export const storageService = {
    // Save songs to AsyncStorage
    saveSongs: async (songs) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        } catch (error) {
            console.error('Failed to save songs:', error);
        }
    },

    // Load songs from AsyncStorage
    loadSongs: async () => {
        try {
            const songs = await AsyncStorage.getItem(STORAGE_KEYS.SONGS);
            return songs ? JSON.parse(songs) : [];
        } catch (error) {
            console.error('Failed to load songs:', error);
            return [];
        }
    },

    // Save setlists to AsyncStorage
    saveSetlists: async (setlists) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.SETLISTS, JSON.stringify(setlists));
        } catch (error) {
            console.error('Failed to save setlists:', error);
        }
    },

    // Load setlists from AsyncStorage
    loadSetlists: async () => {
        try {
            const setlists = await AsyncStorage.getItem(STORAGE_KEYS.SETLISTS);
            return setlists ? JSON.parse(setlists) : [];
        } catch (error) {
            console.error('Failed to load setlists:', error);
            return [];
        }
    },
};
