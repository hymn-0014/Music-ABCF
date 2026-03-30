import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.welcome}>Welcome to the Music ABCF App!</Text>
            <Text style={styles.features}>App Features:</Text>
            <Text>- Explore various music genres</Text>
            <Text>- Create and share playlists</Text>
            <Text>- Discover new artists</Text>
            <Text>- Join live music events</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    welcome: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    features: {
        marginVertical: 10,
        fontSize: 18,
        fontWeight: '600',
    },
});

export default HomeScreen;