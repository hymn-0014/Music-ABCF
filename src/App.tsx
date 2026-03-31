import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform, Image } from 'react-native';
import SongLibraryScreen from './screens/SongLibraryScreen';
import SetlistScreen from './screens/SetlistScreen';
import ViewerScreen from './screens/ViewerScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import AddSongScreen from './screens/AddSongScreen';
import EditSongScreen from './screens/EditSongScreen';
import { onAuthChange } from './services/authService';
import useAppStore from './store/useAppStore';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AppDarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4FC3F7',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
    notification: '#4FC3F7',
  },
};

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <Text style={{ fontSize: 11, color: focused ? '#4FC3F7' : '#888', marginTop: 2 }}>{label}</Text>
);

const MUSIC_LOGO_ASSET = '/assets/logos/music-ministry-logo.png';
const MUSIC_LOGO_SVG = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40"><text x="4" y="28" font-family="sans-serif" font-size="18" font-weight="700" fill="%234FC3F7">♪</text><text x="24" y="28" font-family="sans-serif" font-size="16" font-weight="700" fill="%23FFFFFF">Music</text><text x="80" y="28" font-family="sans-serif" font-size="16" font-weight="700" fill="%234FC3F7">ABCF</text></svg>')}`;

const LogoHeader = () => {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Image
        source={{ uri: logoFailed ? MUSIC_LOGO_SVG : MUSIC_LOGO_ASSET }}
        style={{ width: 120, height: 30, resizeMode: 'contain' }}
        alt="Music ABCF"
        onError={() => setLogoFailed(true)}
      />
    </View>
  );
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1E1E1E', shadowColor: '#000' },
        headerTitle: () => <LogoHeader />,
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: '#1E1E1E',
          borderTopColor: '#333',
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: '#4FC3F7',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Songs"
        component={SongLibraryScreen}
        options={{
          title: 'Songs',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '🎵' : '🎵'}</Text>,
        }}
      />
      <Tab.Screen
        name="Setlists"
        component={SetlistScreen}
        options={{
          title: 'Setlists',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '📋' : '📋'}</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 22 }}>{focused ? '⚙️' : '⚙️'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

const linking = Platform.OS === 'web' ? { 
  prefixes: ['https://hymn-0014.github.io/Music-ABCF', 'music-abcf://'],
  config: { screens: { Main: '', Viewer: 'viewer', AddSong: 'add-song', EditSong: 'edit-song' } } 
} : undefined;

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#4FC3F7" />
      </View>
    );
  }

  if (!uid) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer theme={AppDarkTheme} linking={linking} documentTitle={{ formatter: () => 'Music-ABCF' }}>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1E1E1E' }, headerTintColor: '#FFFFFF', headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Viewer" component={ViewerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddSong" component={AddSongScreen} options={{ title: 'Add Song' }} />
        <Stack.Screen name="EditSong" component={EditSongScreen} options={{ title: 'Edit Song' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}