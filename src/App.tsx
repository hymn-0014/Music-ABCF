import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import SongLibraryScreen from './screens/SongLibraryScreen';
import SetlistScreen from './screens/SetlistScreen';
import ViewerScreen from './screens/ViewerScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import AddSongScreen from './screens/AddSongScreen';
import { onAuthChange } from './services/authService';
import useAppStore from './store/useAppStore';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="SongLibrary" component={SongLibraryScreen} options={{ title: 'Songs' }} />
      <Tab.Screen name="Setlists" component={SetlistScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const uid = useAppStore((s) => s.uid);
  const setUid = useAppStore((s) => s.setUid);
  const pullFromCloud = useAppStore((s) => s.pullFromCloud);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUid(user?.uid ?? null);
      if (user) {
        await pullFromCloud();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!uid) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Viewer" component={ViewerScreen} options={{ title: 'Now Playing' }} />
        <Stack.Screen name="AddSong" component={AddSongScreen} options={{ title: 'Add Song' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}