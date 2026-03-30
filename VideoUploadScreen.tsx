import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, FlatList, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { firebaseService } from '../services/firebaseService';

const VideoUploadScreen = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [videos, setVideos] = useState([]);
    const [videoTitle, setVideoTitle] = useState('');

    const pickVideoFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', });
            if (result.type === 'success') {
                setVideoFile(result);
                setVideoTitle(result.name || 'Untitled Video');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick video file');
        }
    };

    const uploadVideoFile = async () => {
        if (!videoFile) {
            Alert.alert('Error', 'Please select a video file first');
            return;
        }
        setUploading(true);
        try {
            const videoData = {
                filename: videoTitle || videoFile.name,
                uri: videoFile.uri,
                type: videoFile.mimeType,
            };
            const uploadedUrl = await firebaseService.uploadVideo(videoData);
            if (uploadedUrl) {
                Alert.alert('Success', 'Video uploaded successfully!');
                setVideoUrl(uploadedUrl);
                setVideoFile(null);
                setVideoTitle('');
                fetchVideos();
            }
        } catch (error) {
            Alert.alert('Error', `Upload failed: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const addVideoLink = async () => {
        if (!videoUrl.trim()) {
            Alert.alert('Error', 'Please enter a video URL');
            return;
        }
        try {
            const autoDetected = await autoDetectVideoMetadata(videoUrl);
            await firebaseService.addVideoLink({
                url: videoUrl,
                title: autoDetected.title || videoTitle || 'Untitled',
                duration: autoDetected.duration || 0,
                platform: autoDetected.platform || 'unknown',
                uploadedAt: new Date().toISOString(),
            });
            Alert.alert('Success', 'Video link added and metadata detected!');
            setVideoUrl('');
            setVideoTitle('');
            fetchVideos();
        } catch (error) {
            Alert.alert('Error', `Failed to add video link: ${error.message}`);
        }
    };

    const autoDetectVideoMetadata = async (url) => {
        try {
            let platform = 'unknown';
            let videoId = null;
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                platform = 'youtube';
                videoId = extractYouTubeId(url);
            } else if (url.includes('vimeo.com')) {
                platform = 'vimeo';
                videoId = url.split('/').pop();
            } else if (url.includes('firebase')) {
                platform = 'firebase';
            }
            const metadata = await firebaseService.getVideoMetadata(url, platform, videoId);
            return { ...metadata, platform };
        } catch (error) {
            console.error('Auto-detection failed:', error);
            return { platform: 'unknown', duration: 0 };
        }
    };

    const extractYouTubeId = (url) => {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    };

    const fetchVideos = async () => {
        try {
            const videoList = await firebaseService.getVideos();
            setVideos(videoList);
        } catch (error) {
            console.error('Failed to fetch videos:', error);
        }
    };

    const deleteVideo = async (videoId) => {
        try {
            await firebaseService.deleteVideo(videoId);
            Alert.alert('Success', 'Video deleted');
            fetchVideos();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete video');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Upload Video</Text>
            <Button title="Pick a Video" onPress={pickVideoFile} />
            <Button title="Upload Video" onPress={uploadVideoFile} disabled={uploading} />
            <TextInput 
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="Enter video URL"
                style={styles.input}
            />
            <Button title="Add Video Link" onPress={addVideoLink} />
            <FlatList
                data={videos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.videoItem}>
                        <Text>{item.title}</Text>
                        <Button title="Delete" onPress={() => deleteVideo(item.id)} />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
        marginBottom: 16,
    },
    videoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
});

export default VideoUploadScreen;