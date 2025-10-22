import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatTime } from '../../lib/date';
import { COLORS } from '../../lib/colors';
import type { CalendarAppointment } from '../../lib/firestoreQueries';

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  style?: any;
  onPress?: () => void;
}

const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  style,
  onPress,
}) => {
  const getStatusIcon = () => {
    switch (appointment.status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />;
      case 'canceled':
        return <Ionicons name="close-circle" size={14} color="#FFFFFF" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    if (appointment.color) return appointment.color;
    
    switch (appointment.status) {
      case 'canceled':
        return COLORS.cardCanceled;
      case 'completed':
        return COLORS.cardDone;
      default:
        return COLORS.card;
    }
  };

  const getOpacity = () => {
    return appointment.status === 'canceled' ? 0.6 : 1;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          opacity: getOpacity(),
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Status icon */}
      {getStatusIcon() && (
        <View style={styles.statusIcon}>
          {getStatusIcon()}
        </View>
      )}

      {/* Canceled overlay */}
      {appointment.status === 'canceled' && (
        <View style={styles.canceledOverlay} />
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.clientName} numberOfLines={1}>
          {appointment.clientName}
        </Text>
        <Text style={styles.serviceName} numberOfLines={1}>
          {appointment.serviceName}
        </Text>
        <View style={styles.timeContainer}>
          <Text style={styles.timeRange} numberOfLines={1}>
            {formatTime(appointment.startAt)}–{formatTime(appointment.endAt)}
          </Text>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {appointment.duration ? `${appointment.duration}דק` : ''}
            </Text>
          </View>
        </View>
        {appointment.barberName && (
          <Text style={styles.barberName} numberOfLines={1}>
            {appointment.barberName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    minHeight: 52,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
  },
  canceledOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  content: {
    gap: 3,
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  serviceName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  timeRange: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    fontWeight: '600',
  },
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  barberName: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    fontStyle: 'italic',
  },
});

export default AppointmentBlock;