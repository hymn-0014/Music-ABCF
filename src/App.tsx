import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './screens/HomeScreen';
import SongLibraryScreen from './screens/SongLibraryScreen';
import SetlistScreen from './screens/SetlistScreen';
import ViewerScreen from './screens/ViewerScreen';
import SettingsScreen from './screens/SettingsScreen';

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
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Viewer" component={ViewerScreen} options={{ title: 'Now Playing' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}