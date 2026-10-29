import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Chip, IconButton } from 'react-native-paper';
import { SimCard } from '../types';
import { COLORS } from '../config/constants';

interface SimIndicatorProps {
  selectedSim: SimCard | null;
  onPress?: () => void;
  showLabel?: boolean;
  compact?: boolean;
}

export default function SimIndicator({ 
  selectedSim, 
  onPress, 
  showLabel = false,
  compact = false 
}: SimIndicatorProps) {
  if (!selectedSim) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        disabled={!onPress}
      >
        <View style={styles.compactContent}>
          <View style={[styles.simDot, { backgroundColor: selectedSim.slotIndex === 0 ? COLORS.simSlot1 : COLORS.simSlot2 }]} />
          <Text style={styles.compactText}>{selectedSim.displayName}</Text>
          {onPress && <IconButton icon="chevron-down" size={16} style={styles.compactIcon} />}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        {showLabel && <Text style={styles.label}>Sending from:</Text>}
        <Chip
          mode="outlined"
          style={[
            styles.chip,
            { borderColor: selectedSim.slotIndex === 0 ? COLORS.simSlot1 : COLORS.simSlot2 }
          ]}
          textStyle={styles.chipText}
          icon={() => (
            <View style={[
              styles.simIcon,
              { backgroundColor: selectedSim.slotIndex === 0 ? COLORS.simSlot1 : COLORS.simSlot2 }
            ]} />
          )}
        >
          {selectedSim.displayName}
        </Chip>
        {onPress && (
          <IconButton 
            icon="swap-horizontal" 
            size={20} 
            iconColor={COLORS.primary}
            style={styles.swapIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  chip: {
    height: 28,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    fontSize: 12,
    marginVertical: 0,
    lineHeight: 14,
  },
  simIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  swapIcon: {
    margin: 0,
    marginLeft: -8,
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  simDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  compactIcon: {
    margin: 0,
    marginLeft: -4,
  },
});
