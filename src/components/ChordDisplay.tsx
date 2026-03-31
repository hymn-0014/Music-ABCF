import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NotationMode } from '../types';

interface ChordDisplayProps {
  notation: NotationMode;
  onToggle: () => void;
}

const ChordDisplay: React.FC<ChordDisplayProps> = ({ notation, onToggle }) => (
  <View style={styles.row}>
    <Text style={styles.label}>Notation:</Text>
    <TouchableOpacity style={styles.pill} onPress={onToggle}>
      <Text style={styles.pillText}>
        {notation === 'standard' ? 'Standard (A, B, C…)' : 'Nashville (1, 2, 3…)'}
      </Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  label: { fontSize: 16, marginRight: 8 },
  pill: { backgroundColor: '#333', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  pillText: { color: '#fff', fontSize: 14 },
});

export default ChordDisplay;