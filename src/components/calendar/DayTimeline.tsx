import React, { useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import { minutesFromDayStart, diffMinutes, getTimeSlots } from '../../lib/date';
import { COLORS } from '../../lib/colors';
import AppointmentBlock from './AppointmentBlock';
import type { CalendarAppointment } from '../../lib/firestoreQueries';

const { width } = Dimensions.get('window');
const ROW_HEIGHT = 80; // Height for 1 hour in pixels (increased for better readability)
const TIME_COLUMN_WIDTH = 70; // Increased width for better time display

interface DayTimelineProps {
  appointments: CalendarAppointment[];
  onAppointmentPress?: (appointment: CalendarAppointment) => void;
}

interface TimeSlotData {
  time: string;
  isHour: boolean;
  appointments: CalendarAppointment[];
}

const DayTimeline: React.FC<DayTimelineProps> = ({
  appointments,
  onAppointmentPress,
}) => {
  const timeSlots = useMemo(() => {
    const slots = getTimeSlots();
    return slots.map((time) => ({
      time,
      isHour: time.endsWith(':00'),
      appointments: [], // We'll position appointments absolutely
    }));
  }, []);

  const positionedAppointments = useMemo(() => {
    // Calculate position and height for each appointment
    return appointments.map((appointment) => {
      const startMinutes = minutesFromDayStart(appointment.startAt);
      const durationMinutes = diffMinutes(appointment.startAt, appointment.endAt);
      
      // Convert to timeline position (6:00 AM = 0 minutes)
      const timelineStartMinutes = startMinutes - 360; // 6 hours * 60 minutes
      
      // More precise positioning: each 15-minute slot is ROW_HEIGHT/4
      const top = (timelineStartMinutes / 15) * (ROW_HEIGHT / 4);
      const height = Math.max((durationMinutes / 15) * (ROW_HEIGHT / 4), 40); // Minimum height 40px

      return {
        appointment,
        top,
        height,
        startMinutes,
        durationMinutes,
      };
    }).filter(item => item.top >= 0 && item.startMinutes >= 360); // Filter appointments before 6 AM
  }, [appointments]);

  // Handle overlapping appointments
  const layoutAppointments = useMemo(() => {
    const positioned = [...positionedAppointments];
    
    // Simple overlap detection and layout
    positioned.forEach((item, index) => {
      let column = 0;
      let width = 100; // Full width percentage
      
      // Check for overlaps with previous appointments
      for (let i = 0; i < index; i++) {
        const other = positioned[i];
        const itemBottom = item.top + item.height;
        const otherBottom = other.top + (other as any).height;
        
        // Check if they overlap
        if (item.top < otherBottom && itemBottom > other.top) {
          column = Math.max(column, ((other as any).column || 0) + 1);
          width = 50; // Split width for overlapping appointments
        }
      }
      
      (item as any).column = column;
      (item as any).width = width;
      (item as any).left = column * 55; // 55% for second column
    });
    
    return positioned;
  }, [positionedAppointments]);

  const renderTimeSlot = ({ item, index }: { item: TimeSlotData; index: number }) => {
    const isNow = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${Math.floor(now.getMinutes() / 15) * 15}`;
      return item.time === currentTime;
    };

    return (
      <View style={[styles.timeSlotContainer, isNow() && styles.currentTimeSlot]}>
        <View style={styles.timeColumn}>
          {item.isHour && (
            <Text style={[styles.hourText, isNow() && styles.currentTimeText]}>{item.time}</Text>
          )}
          {item.time.endsWith(':30') && (
            <Text style={styles.halfHourText}>{item.time}</Text>
          )}
        </View>
        <View style={[
          styles.timeSlotLine,
          !item.isHour && styles.subHourLine,
          isNow() && styles.currentTimeLine
        ]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={timeSlots}
        renderItem={renderTimeSlot}
        keyExtractor={(item) => item.time}
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        initialScrollIndex={0} // Start from 6 AM
        getItemLayout={(data, index) => ({
          length: ROW_HEIGHT / 4, // Each 15-min slot
          offset: (ROW_HEIGHT / 4) * index,
          index,
        })}
      />
      
      {/* Appointments overlay */}
      <View style={styles.appointmentsContainer}>
        {layoutAppointments.map((item, index) => {
          const { appointment, top, height } = item;
          const column = (item as any).column || 0;
          const width = (item as any).width || 100;
          const left = (item as any).left || 0;
          return (
          <View
            key={`${appointment.id}-${index}`}
            style={[
              styles.appointmentWrapper,
              {
                top,
                height,
                left: TIME_COLUMN_WIDTH + ((left || 0) / 100) * (width - TIME_COLUMN_WIDTH),
                width: ((width || 100) / 100) * (width - TIME_COLUMN_WIDTH - 8),
              },
            ]}
          >
            <AppointmentBlock
              appointment={appointment}
              onPress={() => onAppointmentPress?.(appointment)}
              style={{ height: '100%' }}
            />
          </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  timeline: {
    flex: 1,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    height: ROW_HEIGHT / 4, // 15 minutes
    alignItems: 'flex-start',
    position: 'relative',
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    paddingRight: 8,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  hourText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'right',
    fontWeight: '600',
  },
  halfHourText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'right',
    fontWeight: '400',
    opacity: 0.7,
  },
  currentTimeSlot: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  currentTimeText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  currentTimeLine: {
    backgroundColor: '#3b82f6',
    height: 2,
  },
  timeSlotLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.hourLine,
    marginTop: 2,
  },
  subHourLine: {
    backgroundColor: COLORS.subHourLine,
  },
  appointmentsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // Allow touches to pass through to appointments
  },
  appointmentWrapper: {
    position: 'absolute',
    paddingRight: 4,
    pointerEvents: 'box-none',
  },
});

export default DayTimeline;