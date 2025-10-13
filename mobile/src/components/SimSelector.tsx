import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, RadioButton, Portal, Modal, Button, Chip } from 'react-native-paper';
import { SimCard } from '../types';
import { COLORS } from '../config/constants';
import dualSimService from '../services/dualSimService';

interface SimSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (sim: SimCard) => void;
  currentSimId?: number;
  phoneNumber?: string;
}

export default function SimSelector({
  visible,
  onDismiss,
  onSelect,
  currentSimId,
  phoneNumber
}: SimSelectorProps) {
  const [simCards, setSimCards] = useState<SimCard[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<number | undefined>(currentSimId);
  const [recommendedSimId, setRecommendedSimId] = useState<number | undefined>();

  useEffect(() => {
    loadSimCards();
  }, [visible, phoneNumber]);

  const loadSimCards = async () => {
    const cards = dualSimService.getSimCards();
    setSimCards(cards);

    // Set initial selection
    if (currentSimId !== undefined) {
      setSelectedSimId(currentSimId);
    } else if (phoneNumber) {
      // Get recommended SIM for this contact
      const recommended = await dualSimService.getRecommendedSimForContact(phoneNumber);
      if (recommended) {
        setSelectedSimId(recommended.subscriptionId);
        setRecommendedSimId(recommended.subscriptionId);
      }
    } else {
      // Use default SIM
      const defaultSim = dualSimService.getDefaultSimCard();
      if (defaultSim) {
        setSelectedSimId(defaultSim.subscriptionId);
      }
    }
  };

  const handleSelect = () => {
    const selectedSim = simCards.find(sim => sim.subscriptionId === selectedSimId);
    if (selectedSim) {
      onSelect(selectedSim);
    }
    onDismiss();
  };

  if (simCards.length === 0) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
          <Card>
            <Card.Title title="No SIM Cards Found" />
            <Card.Content>
              <Text>No active SIM cards detected. Please check your device settings.</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={onDismiss}>Close</Button>
            </Card.Actions>
          </Card>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card>
          <Card.Title title="Select SIM Card" />
          <Card.Content>
            <ScrollView style={styles.scrollView}>
              <RadioButton.Group
                onValueChange={(value) => setSelectedSimId(parseInt(value))}
                value={selectedSimId?.toString() || ''}
              >
                {simCards.map((sim, index) => (
                  <TouchableOpacity
                    key={sim.subscriptionId}
                    style={[
                      styles.simOption,
                      selectedSimId === sim.subscriptionId && styles.simOptionSelected
                    ]}
                    onPress={() => setSelectedSimId(sim.subscriptionId)}
                  >
                    <View style={styles.simInfo}>
                      <View style={styles.simHeader}>
                        <Text style={styles.simDisplayName}>{sim.displayName}</Text>
                        <View style={styles.badges}>
                          {sim.isDefaultSms && (
                            <Chip mode="flat" compact style={styles.defaultBadge} textStyle={styles.badgeText}>
                              Default
                            </Chip>
                          )}
                          {recommendedSimId === sim.subscriptionId && (
                            <Chip mode="flat" compact style={styles.recommendedBadge} textStyle={styles.badgeText}>
                              Recommended
                            </Chip>
                          )}
                        </View>
                      </View>
                      
                      <Text style={styles.simCarrier}>{sim.carrierName}</Text>
                      
                      {sim.phoneNumber && (
                        <Text style={styles.simPhone}>{sim.phoneNumber}</Text>
                      )}
                      
                      <Text style={styles.simSlot}>SIM Slot {sim.slotIndex + 1}</Text>
                    </View>
                    
                    <RadioButton.Android
                      value={sim.subscriptionId.toString()}
                      status={selectedSimId === sim.subscriptionId ? 'checked' : 'unchecked'}
                    />
                  </TouchableOpacity>
                ))}
              </RadioButton.Group>
              
              {phoneNumber && recommendedSimId && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 The recommended SIM is based on your previous messages with this contact.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Card.Content>
          
          <Card.Actions style={styles.actions}>
            <Button onPress={onDismiss}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSelect}
              disabled={selectedSimId === undefined}
            >
              Select
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: 20,
    maxHeight: '80%',
  },
  scrollView: {
    maxHeight: 400,
  },
  simOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E0E0E0',
    backgroundColor: COLORS.surface || '#FFFFFF',
  },
  simOptionSelected: {
    borderColor: COLORS.primary || '#1976D2',
    backgroundColor: COLORS.primaryLight || '#E3F2FD',
  },
  simInfo: {
    flex: 1,
    marginRight: 12,
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  simDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#000000',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  defaultBadge: {
    backgroundColor: COLORS.success || '#4CAF50',
    height: 20,
  },
  recommendedBadge: {
    backgroundColor: COLORS.primary || '#1976D2',
    height: 20,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginVertical: 0,
    lineHeight: 14,
  },
  simCarrier: {
    fontSize: 14,
    color: COLORS.textSecondary || '#666666',
    marginBottom: 2,
  },
  simPhone: {
    fontSize: 13,
    color: COLORS.textSecondary || '#666666',
    marginBottom: 2,
  },
  simSlot: {
    fontSize: 12,
    color: COLORS.textSecondary || '#999999',
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.primaryLight || '#E3F2FD',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.text || '#000000',
    lineHeight: 18,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingTop: 8,
  },
});
