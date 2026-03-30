import React, { useState } from 'react';
import { View, Text, Switch, TextInput, Button } from 'react-native';

const SettingsScreen = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [sharpFlat, setSharpFlat] = useState('sharp');
  const [syncEnabled, setSyncEnabled] = useState(false);

  return (
    <View style={{ padding: 20 }}>
      <Text>Settings</Text>

      <View>
        <Text>Dark Mode:</Text>
        <Switch
          value={isDarkMode}
          onValueChange={setIsDarkMode}
        />
      </View>

      <View>
        <Text>Font Size:</Text>
        <TextInput
          value={fontSize}
          onChangeText={setFontSize}
          keyboardType="numeric"
        />
      </View>

      <View>
        <Text>Prefer Sharps or Flats:</Text>
        <Switch
          value={sharpFlat === 'sharp'}
          onValueChange={(value) => setSharpFlat(value ? 'sharp' : 'flat')}
        />
      </View>

      <View>
        <Text>Enable Sync:</Text>
        <Switch
          value={syncEnabled}
          onValueChange={setSyncEnabled}
        />
      </View>

      <Button title="Save Settings" onPress={() => {/* Save settings logic */}} />
    </View>
  );
};

export default SettingsScreen;