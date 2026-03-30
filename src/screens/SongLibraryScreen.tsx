import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const songs = [
    { id: '1', title: 'Amazing Grace' },
    { id: '2', title: 'How Great Thou Art' },
    { id: '3', title: 'Be Thou My Vision' },
];

const SongLibraryScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Song Library</Text>
            <FlatList
                data={songs}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <Text style={styles.song}>{item.title}</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    song: {
        fontSize: 18,
        paddingVertical: 8,
    },
});

export default SongLibraryScreen;