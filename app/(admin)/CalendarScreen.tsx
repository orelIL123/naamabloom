import { Ionicons } from '@expo/vector-icons';
import { addDays, subDays } from 'date-fns';
import { router } from 'expo-router';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth } from '../config/firebase';
import { MirroredIcon } from '../components/MirroredIcon';

// RTL is handled in _layout.tsx

import {
    formatHebrewDate,
    formatTime,
    range14Days,
    toDayKey,
    todayLocal
} from '../../src/lib/date';
import {
    getBarbers,
    getTreatments,
    listenAppointmentsRange,
    type CalendarAppointment,
    type CalendarBarber
} from '../../src/lib/firestoreQueries';

const { width, height } = Dimensions.get('window');

type ViewMode = 'day' | 'week' | 'list';

interface AppointmentsByDay {
  [dayKey: string]: CalendarAppointment[];
}

const CalendarScreen: React.FC = () => {
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(todayLocal());
  const [selectedBarberId, setSelectedBarberId] = useState<string>('main');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [appointmentsByDay, setAppointmentsByDay] = useState<AppointmentsByDay>({});
  const [barbers, setBarbers] = useState<CalendarBarber[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Memoized date range for data fetching
  const dateRange = useMemo(() => range14Days(selectedDate), [selectedDate]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [barbersData, treatmentsData] = await Promise.all([
          getBarbers(),
          getTreatments(),
        ]);

        // Check if current user is a barber
        const currentUser = auth.currentUser;
        let filteredBarbers = barbersData;

        if (currentUser) {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userRole = userData?.role;
            const userBarberId = userData?.barberId;

            // If user is a barber, filter to show only themselves
            if (userRole === 'barber' && userBarberId) {
              filteredBarbers = barbersData.filter(b => b.id === userBarberId);
            }
          }
        }

        // Sort barbers: main barber (רן אלגריסי) first, then others
        const sortedBarbers = filteredBarbers.sort((a, b) => {
          if (a.name === 'רן אלגריסי') return -1;
          if (b.name === 'רן אלגריסי') return 1;
          return a.name.localeCompare(b.name);
        });

        setBarbers(sortedBarbers);
        setTreatments(treatmentsData);

        // Set default to first barber (רן אלגריסי or the barber's own)
        if (sortedBarbers.length > 0) {
          setSelectedBarberId(sortedBarbers[0].id);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Listen to appointments in real-time
  useEffect(() => {
    if (loading) return;

    const unsubscribe = listenAppointmentsRange(
      {
        start: dateRange.start,
        end: dateRange.end,
        barberId: selectedBarberId,
      },
      (appointments) => {
        // Group appointments by day
        const grouped: AppointmentsByDay = {};
        appointments.forEach((appointment) => {
          const dayKey = toDayKey(appointment.startAt);
          if (!grouped[dayKey]) {
            grouped[dayKey] = [];
          }
          grouped[dayKey].push(appointment);
        });
        
        // Sort appointments within each day
        Object.keys(grouped).forEach((dayKey) => {
          grouped[dayKey].sort((a, b) => 
            a.startAt.getTime() - b.startAt.getTime()
          );
        });
        
        setAppointmentsByDay(grouped);
      },
      treatments,
      barbers
    );

    return unsubscribe;
  }, [dateRange, selectedBarberId, loading, treatments]);

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    const dayKey = toDayKey(selectedDate);
    let appointments = appointmentsByDay[dayKey] || [];
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      appointments = appointments.filter(
        (apt) =>
          apt.clientName.toLowerCase().includes(term) ||
          apt.serviceName.toLowerCase().includes(term)
      );
    }
    
    return appointments;
  }, [appointmentsByDay, selectedDate, searchTerm]);

  // Navigation handlers
  const handleDateNavigation = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setSelectedDate(todayLocal());
    } else if (direction === 'prev') {
      setSelectedDate(prev => subDays(prev, 1));
    } else if (direction === 'next') {
      setSelectedDate(prev => addDays(prev, 1));
    }
  }, []);

  const handleAppointmentPress = useCallback((appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  }, []);

  const handleAppointmentUpdate = useCallback((appointment: CalendarAppointment) => {
    console.log('Update appointment:', appointment);
    Alert.alert('הצלחה', 'התור עודכן בהצלחה');
  }, []);

  const handleAppointmentDelete = useCallback((appointmentId: string) => {
    console.log('Delete appointment:', appointmentId);
    Alert.alert('הצלחה', 'התור נמחק בהצלחה');
  }, []);

  // Generate time slots for the day (6 AM to 10 PM) with 10-minute intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let slot = 0; slot < 6; slot++) {
        const minutes = slot * 10;
        const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        slots.push({
          time: timeString,
          hour,
          minutes,
          slotIndex: slot,
          appointments: []
        });
      }
    }
    return slots;
  };

  // Get current time slot index for auto-scroll
  const getCurrentTimeSlotIndex = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Calculate which 10-minute slot we're in
    const currentSlot = Math.floor(currentMinutes / 10);
    
    // Calculate the index in our slots array
    const hourIndex = (currentHour - 6) * 6; // 6 slots per hour
    const slotIndex = hourIndex + currentSlot;
    
    // Make sure we're within bounds
    return Math.max(0, Math.min(slotIndex, generateTimeSlots().length - 1));
  };

  // Get appointments for each 10-minute slot
  const getAppointmentsForSlot = (hour: number, minutes: number) => {
    return selectedDateAppointments.filter(apt => {
      const aptHour = apt.startAt.getHours();
      const aptMinutes = apt.startAt.getMinutes();
      // Check if appointment starts in this 10-minute slot
      return aptHour === hour && aptMinutes >= minutes && aptMinutes < minutes + 10;
    });
  };

  // Calculate how many slots an appointment should span based on duration
  const getAppointmentSpan = (duration: number) => {
    return Math.max(1, Math.ceil(duration / 10)); // Each slot is 10 minutes
  };

  // Render appointment block - wider with more details
  const renderAppointmentBlock = (appointment: CalendarAppointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={styles.appointmentBlock}
      onPress={() => handleAppointmentPress(appointment)}
    >
      <View style={styles.appointmentContent}>
        <View style={styles.appointmentRow}>
          <Text style={styles.appointmentTime}>
            {formatTime(appointment.startAt)}
          </Text>
          <Text style={styles.appointmentClient} numberOfLines={1}>
            {appointment.clientName}
          </Text>
        </View>
        <View style={styles.appointmentRow}>
          <Text style={styles.appointmentService} numberOfLines={1}>
            {appointment.serviceName}
          </Text>
          <Text style={styles.appointmentPhone} numberOfLines={1}>
            {appointment.clientPhone || 'ללא טלפון'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען יומן ספרים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MirroredIcon name="arrow-back" size={24} color="#333" type="ionicons" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>יומן ספרים</Text>
          <Text style={styles.headerDate}>{formatHebrewDate(selectedDate)}</Text>
        </View>
        
        <View style={styles.headerControls}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => handleDateNavigation('prev')}
          >
            <MirroredIcon name="chevron-back" size={20} color="#FFFFFF" type="ionicons" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navButton, { paddingHorizontal: 16 }]}
            onPress={() => handleDateNavigation('today')}
          >
            <Text style={styles.todayButton}>היום</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => handleDateNavigation('next')}
          >
            <MirroredIcon name="chevron-back" size={20} color="#FFFFFF" type="ionicons" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barber Selector */}
      <View style={styles.barberSelector}>
        <Text style={styles.barberLabel}>ספר:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.barberButton,
              selectedBarberId === 'all' && styles.barberButtonActive
            ]}
            onPress={() => setSelectedBarberId('all')}
          >
            <Text style={[
              styles.barberButtonText,
              selectedBarberId === 'all' && styles.barberButtonTextActive
            ]}>
              כולם
            </Text>
          </TouchableOpacity>
          {barbers.map((barber) => (
            <TouchableOpacity
              key={barber.id}
              style={[
                styles.barberButton,
                selectedBarberId === barber.id && styles.barberButtonActive
              ]}
              onPress={() => setSelectedBarberId(barber.id)}
            >
              <Text style={[
                styles.barberButtonText,
                selectedBarberId === barber.id && styles.barberButtonTextActive
              ]}>
                {barber.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי לקוח או שירות..."
            placeholderTextColor="#666"
            value={searchTerm}
            onChangeText={setSearchTerm}
            textAlign="right"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Timeline */}
      <ScrollView 
        style={styles.timelineContainer}
        ref={(ref) => {
          // Auto-scroll to current time when component loads
          if (ref && !loading) {
            setTimeout(() => {
              const currentIndex = getCurrentTimeSlotIndex();
              const slotHeight = 30; // Height of each time slot
              const scrollPosition = currentIndex * slotHeight - 200; // Center the current time
              ref.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
            }, 500);
          }
        }}
      >
        {generateTimeSlots().map((slot, index) => {
          const slotAppointments = getAppointmentsForSlot(slot.hour, slot.minutes);
          const isCurrentTime = index === getCurrentTimeSlotIndex();
          
          return (
            <View 
              key={slot.time} 
              style={[
                styles.timeSlot,
                isCurrentTime && styles.currentTimeSlot
              ]}
            >
              <View style={styles.timeColumn}>
                <Text style={[
                  styles.timeText,
                  isCurrentTime && styles.currentTimeText
                ]}>
                  {slot.time}
                </Text>
              </View>
              <View style={styles.appointmentsColumn}>
                {slotAppointments.length > 0 ? (
                  slotAppointments.map((appointment) => {
                    const span = getAppointmentSpan(appointment.duration || 30);
                    return (
                      <View key={appointment.id} style={[styles.appointmentWrapper, { width: `${span * 16.66}%` }]}>
                        {renderAppointmentBlock(appointment)}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptySlot}>
                    <Text style={styles.emptySlotText}>-</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Appointment Modal */}
      {selectedAppointment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>פרטי התור</Text>
              <TouchableOpacity onPress={() => setSelectedAppointment(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalLabel}>לקוח: </Text>
                {selectedAppointment.clientName}
              </Text>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalLabel}>שעה: </Text>
                {formatTime(selectedAppointment.startAt)}
              </Text>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalLabel}>טיפול: </Text>
                {selectedAppointment.serviceName}
              </Text>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalLabel}>ספר: </Text>
                {selectedAppointment.barberName}
              </Text>
              <Text style={styles.modalDetail}>
                <Text style={styles.modalLabel}>טלפון: </Text>
                {selectedAppointment.clientPhone || 'אין טלפון'}
              </Text>
            </View>
            
            <View style={styles.modalActions}>
              {selectedAppointment.clientPhone ? (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => {
                    // TODO: Implement phone call
                    Alert.alert('התקשרות', `מתקשר ל-${selectedAppointment.clientPhone}`);
                  }}
                >
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.callButtonText}>התקשר</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noPhoneContainer}>
                  <Text style={styles.noPhoneText}>אין טלפון</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert(
                    'מחיקת תור',
                    'האם אתה בטוח שברצונך למחוק תור זה?',
                    [
                      { text: 'ביטול', style: 'cancel' },
                      {
                        text: 'מחק',
                        style: 'destructive',
                        onPress: () => {
                          handleAppointmentDelete(selectedAppointment.id);
                          setSelectedAppointment(null);
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.deleteButtonText}>מחק תור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginLeft: 8, // Fixed: Changed from marginRight to marginLeft for RTL
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  headerDate: {
    fontSize: 15,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '600',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  barberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  barberLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginRight: 12,
  },
  barberButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5E5',
    marginRight: 8,
  },
  barberButtonActive: {
    backgroundColor: '#007AFF',
  },
  barberButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  barberButtonTextActive: {
    color: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  timelineContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  timeSlot: {
    flexDirection: 'row',
    minHeight: 45,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  timeColumn: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRightWidth: 2,
    borderRightColor: '#DEE2E6',
  },
  timeText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '700',
    letterSpacing: 0,
  },
  currentTimeSlot: {
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  currentTimeText: {
    color: '#007AFF',
    fontWeight: '900',
    fontSize: 16,
  },
  appointmentsColumn: {
    flex: 1,
    padding: 6,
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  appointmentWrapper: {
    marginRight: 1,
    marginBottom: 1,
    width: '100%',
  },
  appointmentBlock: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 4,
    minHeight: 50,
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appointmentLeft: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  appointmentRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  appointmentTime: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.3,
    minWidth: 50,
  },
  appointmentClient: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
  },
  appointmentService: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
  },
  appointmentPhone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.90)',
    minWidth: 100,
    textAlign: 'right',
  },
  emptySlot: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 20,
  },
  emptySlotText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    gap: 12,
  },
  modalDetail: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noPhoneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  noPhoneText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarScreen;