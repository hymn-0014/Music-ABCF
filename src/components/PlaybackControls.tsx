import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface PlaybackControlsProps {
  tempo: number;
  metronomeEnabled: boolean;
  autoScrollEnabled: boolean;
  autoScrollSpeed: number;
  onTempoChange: (tempo: number) => void;
  onMetronomeToggle: () => void;
  onAutoScrollToggle: () => void;
  onAutoScrollSpeedChange: (speed: number) => void;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  tempo,
  metronomeEnabled,
  autoScrollEnabled,
  autoScrollSpeed,
  onTempoChange,
  onMetronomeToggle,
  onAutoScrollToggle,
  onAutoScrollSpeedChange,
}) => (
  <View style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.sectionTitle}>Playback</Text>
      <TouchableOpacity
        style={[styles.togglePill, metronomeEnabled && styles.togglePillActive]}
        onPress={onMetronomeToggle}
      >
        <Text style={[styles.toggleText, metronomeEnabled && styles.toggleTextActive]}>
          {metronomeEnabled ? 'Stop Metronome' : 'Start Metronome'}
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.controlRow}>
      <Text style={styles.label}>Tempo</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepperButton} onPress={() => onTempoChange(tempo - 5)}>
          <Text style={styles.stepperText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{tempo} BPM</Text>
        <TouchableOpacity style={styles.stepperButton} onPress={() => onTempoChange(tempo + 5)}>
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.headerRow}>
      <Text style={styles.label}>Auto Scroll</Text>
      <TouchableOpacity
        style={[styles.togglePill, autoScrollEnabled && styles.togglePillActive]}
        onPress={onAutoScrollToggle}
      >
        <Text style={[styles.toggleText, autoScrollEnabled && styles.toggleTextActive]}>
          {autoScrollEnabled ? 'Stop' : 'Start'}
        </Text>
      </TouchableOpacity>
    </View>

    <View style={styles.controlRow}>
      <Text style={styles.label}>Speed</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onAutoScrollSpeedChange(autoScrollSpeed - 5)}
        >
          <Text style={styles.stepperText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{autoScrollSpeed}px/s</Text>
        <TouchableOpacity
          style={styles.stepperButton}
          onPress={() => onAutoScrollSpeedChange(autoScrollSpeed + 5)}
        >
          <Text style={styles.stepperText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4FC3F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: '#121212',
    fontSize: 20,
    fontWeight: '700',
  },
  value: {
    color: '#FFFFFF',
    minWidth: 88,
    textAlign: 'center',
    fontSize: 14,
  },
  togglePill: {
    backgroundColor: '#2A2A2A',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  togglePillActive: {
    backgroundColor: '#4FC3F7',
  },
  toggleText: {
    color: '#4FC3F7',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#121212',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginTop: 12,
  },
});

export default PlaybackControls;