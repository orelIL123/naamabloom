import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, getBarberColor } from '../../lib/colors';
import type { CalendarBarber } from '../../lib/firestoreQueries';

interface LegendBarProps {
  barbers: CalendarBarber[];
  selectedBarberId: string;
}

const LegendBar: React.FC<LegendBarProps> = ({ barbers, selectedBarberId }) => {
  // Filter barbers to show only selected one or all
  const visibleBarbers = selectedBarberId === 'all' 
    ? barbers 
    : barbers.filter(b => b.id === selectedBarberId);

  if (visibleBarbers.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleBarbers.map((barber, index) => (
          <View key={barber.id} style={styles.legendItem}>
            <View
              style={[
                styles.colorDot,
                {
                  backgroundColor: barber.color || getBarberColor(barber.id, index),
                },
              ]}
            />
            <Text style={styles.barberName} numberOfLines={1}>
              {barber.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.glassBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  barberName: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});

export default LegendBar;