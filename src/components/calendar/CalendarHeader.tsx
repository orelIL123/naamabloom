import { BlurView } from 'expo-blur';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { MirroredIcon } from '../../../app/components/MirroredIcon';
import { COLORS } from '../../lib/colors';
import { formatHebrewDate, isTodayLocal } from '../../lib/date';
import type { CalendarBarber } from '../../lib/firestoreQueries';

// RTL is handled in _layout.tsx

interface CalendarHeaderProps {
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'list';
  selectedBarberId: string;
  barbers: CalendarBarber[];
  onDateChange: (direction: 'prev' | 'next' | 'today') => void;
  onViewModeChange: (mode: 'day' | 'week' | 'list') => void;
  onBarberChange: (barberId: string) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  selectedDate,
  viewMode,
  selectedBarberId,
  barbers,
  onDateChange,
  onViewModeChange,
  onBarberChange,
}) => {
  const formatCurrentTime = () => {
    return new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSelectedBarberName = () => {
    if (selectedBarberId === 'all') return 'כל הספרים';
    const barber = barbers.find(b => b.id === selectedBarberId);
    return barber?.name || 'ספר לא ידוע';
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandContainer}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>יומן ספרים</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.currentTime}>{formatCurrentTime()}</Text>
          <Text style={styles.timeText}>{formatCurrentTime()}</Text>
        </View>
        
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, isTodayLocal(selectedDate) && styles.navButtonToday]}
            onPress={() => onDateChange('today')}
          >
            <Text style={[styles.navButtonText, isTodayLocal(selectedDate) && styles.navButtonTextToday]}>
              היום
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => onDateChange('prev')}
          >
            <MirroredIcon
              name="chevron-forward"
              size={20}
              color={COLORS.textPrimary}
              type="ionicons"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => onDateChange('next')}
          >
            <MirroredIcon 
              name="chevron-forward" 
              size={20} 
              color={COLORS.textPrimary} 
              type="ionicons"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Display */}
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {formatHebrewDate(selectedDate)}
        </Text>
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        {/* View Mode Buttons */}
        <View style={styles.viewModeContainer}>
          {(['list', 'week', 'day'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.modeButton,
                viewMode === mode && styles.modeButtonActive,
              ]}
              onPress={() => onViewModeChange(mode)}
            >
              <BlurView
                intensity={viewMode === mode ? 80 : 40}
                style={styles.modeButtonBlur}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    viewMode === mode && styles.modeButtonTextActive,
                  ]}
                >
                  {mode === 'day' ? 'יום' : mode === 'week' ? 'שבוע' : 'רשימה'}
                </Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>

        {/* Barber Selector */}
        <View style={styles.barberSelectorContainer}>
          <Text style={styles.barberSelectorLabel}>עובד נוכחי</Text>
          <View style={styles.barberSelector}>
            <BlurView intensity={40} style={styles.barberSelectorBlur}>
              <TouchableOpacity
                style={styles.barberDropdown}
                onPress={() => {
                  // TODO: Implement dropdown picker
                  console.log('Open barber selector');
                }}
              >
                <Text style={styles.barberSelectedText}>
                  {getSelectedBarberName()}
                </Text>
                <MirroredIcon 
                  name="chevron-down" 
                  size={16} 
                  color={COLORS.textMuted} 
                  type="ionicons"
                />
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.headerBg,
    paddingTop: 50, // For status bar
    paddingBottom: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  brandContainer: {
    alignItems: 'flex-end', // RTL alignment
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 2,
  },
  currentTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
  },
  navButtonToday: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  navButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  navButtonTextToday: {
    color: '#FFFFFF',
  },
  dateContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  viewModeContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
  },
  modeButton: {
    overflow: 'hidden',
  },
  modeButtonBlur: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeButtonActive: {
    backgroundColor: COLORS.glassActiveBg,
  },
  modeButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  barberSelectorContainer: {
    alignItems: 'flex-end', // RTL
  },
  barberSelectorLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  barberSelector: {
    borderRadius: 20,
    overflow: 'hidden',
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
  },
  barberSelectorBlur: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  barberDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  barberSelectedText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CalendarHeader;