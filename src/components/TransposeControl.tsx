import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AccidentalPreference } from '../types';

interface TransposeControlProps {
  transpose: number;
  accidental: AccidentalPreference;
  onTransposeChange: (value: number) => void;
  onAccidentalChange: (pref: AccidentalPreference) => void;
}

const TransposeControl: React.FC<TransposeControlProps> = ({
  transpose, accidental, onTransposeChange, onAccidentalChange,
}) => (
  <View style={styles.row}>
    <TouchableOpacity style={styles.btn} onPress={() => onTransposeChange(transpose - 1)}>
      <Text style={styles.btnText}>-</Text>
    </TouchableOpacity>
    <Text style={styles.level}>{transpose > 0 ? `+${transpose}` : transpose}</Text>
    <TouchableOpacity style={styles.btn} onPress={() => onTransposeChange(transpose + 1)}>
      <Text style={styles.btnText}>+</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.btn, { marginLeft: 16 }]}
      onPress={() => onAccidentalChange(accidental === 'sharp' ? 'flat' : 'sharp')}
    >
      <Text style={styles.btnText}>{accidental === 'sharp' ? '♯' : '♭'}</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  btn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#4FC3F7',
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#121212', fontSize: 22, fontWeight: 'bold' },
  level: { fontSize: 20, marginHorizontal: 12, minWidth: 30, textAlign: 'center', color: '#FFFFFF' },
});

export default TransposeControl;