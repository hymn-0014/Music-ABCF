import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

const ViewerScreen = () => {
    const currentSong = {
        title: 'Song Title Here',
        lyrics: ['Line 1 of the lyrics', 'Line 2 of the lyrics', 'Line 3 of the lyrics'],
        chords: ['C', 'G', 'Am', 'F'],
    };

    const handleTranspose = (direction) => {
        // Logic for transposing chords
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{currentSong.title}</Text>
            {currentSong.chords.map((chord, index) => (
                <Text key={index} style={styles.chord}>{chord}</Text>
            ))}
            {currentSong.lyrics.map((line, index) => (
                <Text key={index} style={styles.lyric}>{line}</Text>
            ))}
            <View style={styles.controls}>
                <Button title='Transpose Up' onPress={() => handleTranspose('up')} />
                <Button title='Transpose Down' onPress={() => handleTranspose('down')} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    chord: {
        fontSize: 18,
        color: '#007AFF',
    },
    lyric: {
        fontSize: 16,
        marginVertical: 5,
    },
    controls: {
        marginTop: 20,
    },
});

export default ViewerScreen;
