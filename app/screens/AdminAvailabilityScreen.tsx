import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Barber,
    BarberAvailability,
    getBarberAvailability,
    getBarbers,
    listenAllAvailability,
    listenBarberAvailability,
    updateBarberWeeklyAvailabilityOptimistic,
} from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminAvailabilityScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

// Generate next 14 days with correct Hebrew day names and debug info
const generateNext14Days = () => {
  const days: {
    date: string;
    weekday: string;
    displayDate: string;
    fullDate: string;
    isAvailable: boolean;
    timeSlots: string[];
    dayOfWeek: number; // Add this for debugging
  }[] = [];
  const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    // Get the correct day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    const hebrewDay = hebrewDays[dayOfWeek];
    const dayNum = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const isToday = i === 0;
    
    // Enhanced debug: log the date calculation with more detail
    console.log(`📅 Day ${i}: ${date.toDateString()} -> dayOfWeek: ${dayOfWeek} -> Hebrew: ${hebrewDay} -> Date: ${dayNum}/${month}/${year}`);
    
    days.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      weekday: hebrewDay,
      displayDate: `${hebrewDay}, ${dayNum}/${month}/${year}`,
      fullDate: `${isToday ? 'היום - ' : ''}${hebrewDay} ${dayNum}/${month}/${year}`,
      isAvailable: false,
      timeSlots: [], // Available hours for this specific day
      dayOfWeek: dayOfWeek // Store for debugging and sync verification
    });
  }
  return days;
};

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00'
];

const AdminAvailabilityScreen: React.FC<AdminAvailabilityScreenProps> = ({ onNavigate, onBack }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [availability, setAvailability] = useState(generateNext14Days());
  const [allAvailability, setAllAvailability] = useState<BarberAvailability[]>([]);
  const [realTimeAvailability, setRealTimeAvailability] = useState<BarberAvailability[]>([]);

  useEffect(() => {
    loadBarbers();
  }, []);

  // Set up global real-time availability listener for admin
  useEffect(() => {
    console.log('🔊 Setting up global availability listener for admin');
    const unsubscribe = listenAllAvailability((availabilityData) => {
      console.log('📡 Admin received global availability update:', availabilityData.length, 'records');
      setAllAvailability(availabilityData);
    });

    return () => {
      console.log('🔇 Cleaning up global availability listener');
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Set up real-time listener for selected barber
  useEffect(() => {
    if (!selectedBarber) {
      setRealTimeAvailability([]);
      return;
    }

    console.log('🔊 Setting up barber-specific availability listener for:', selectedBarber.name);
    const unsubscribe = listenBarberAvailability(selectedBarber.id, (availabilityData) => {
      console.log('📡 Admin received barber availability update:', availabilityData);
      setRealTimeAvailability(availabilityData);
      
      // Always update the modal availability display when data changes
      updateAvailabilityFromRealTimeData(availabilityData);
    });

    return () => {
      console.log('🔇 Cleaning up barber availability listener');
      if (unsubscribe) unsubscribe();
    };
  }, [selectedBarber?.id]);

  const loadBarbers = async () => {
    try {
      setLoading(true);
      const barbersData = await getBarbers();
      setBarbers(barbersData);
    } catch (error) {
      console.error('Error loading barbers:', error);
      showToast('שגיאה בטעינת הספרים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  // Update the modal display when real-time data changes
  const updateAvailabilityFromRealTimeData = (availabilityData: BarberAvailability[]) => {
    console.log('🔄 Updating modal display from real-time data:', availabilityData);
    
    // Create a map of dayOfWeek to availability data
    const weeklyAvailability: {[key: number]: BarberAvailability} = {};
    availabilityData.forEach(data => {
      console.log(`📊 Firebase availability: dayOfWeek ${data.dayOfWeek} -> ${data.isAvailable ? 'Available' : 'Not Available'} (${data.startTime}-${data.endTime})`);
      weeklyAvailability[data.dayOfWeek] = data;
    });
    
    // Convert weekly pattern to 14-day format
    const next14Days = generateNext14Days();
    const updatedDays = next14Days.map(day => {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      const dayAvailability = weeklyAvailability[dayOfWeek];
      
      console.log(`🔗 Syncing day ${day.date} (${day.weekday}) with dayOfWeek ${dayOfWeek}: ${dayAvailability ? 'Found in Firebase' : 'NOT found in Firebase'}`);
      
      if (dayAvailability && dayAvailability.isAvailable) {
        // Generate time slots from startTime to endTime
        const startTime = dayAvailability.startTime;
        const endTime = dayAvailability.endTime;
        const timeSlots = generateTimeSlots(startTime, endTime);
        
        console.log(`✅ Day ${day.weekday} (${day.date}) set to AVAILABLE with ${timeSlots.length} time slots`);
        
        return {
          ...day,
          isAvailable: true,
          timeSlots: timeSlots
        };
      } else {
        console.log(`❌ Day ${day.weekday} (${day.date}) set to NOT AVAILABLE`);
        return {
          ...day,
          isAvailable: false,
          timeSlots: []
        };
      }
    });
    
    console.log('📅 Updated availability display:', updatedDays.map(d => `${d.weekday} (${d.date}): ${d.isAvailable ? 'Available' : 'Not Available'}`));
    setAvailability(updatedDays);
  };

  // Helper function to generate time slots from start to end time
  const generateTimeSlots = (startTime: string, endTime: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      // Move to next slot (30 minutes)
      if (currentMin === 0) {
        currentMin = 30;
      } else {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return slots;
  };

  const openEditModal = async (barber: Barber) => {
    console.log('Opening modal for barber:', barber.name);
    setSelectedBarber(barber);
    
    // Load current availability from Firebase immediately
    try {
      console.log('📡 Loading current availability for barber:', barber.id);
      const currentAvailability = await getBarberAvailability(barber.id);
      console.log('📅 Current availability from Firebase:', currentAvailability);
      
      // Update the display with real data
      updateAvailabilityFromRealTimeData(currentAvailability);
    } catch (error) {
      console.error('❌ Error loading current availability:', error);
      // Fallback to empty 14 days if loading fails
      const empty14Days = generateNext14Days();
      setAvailability(empty14Days);
    }
    
    setModalVisible(true);
    console.log('Modal should be visible now');
  };

  const toggleDayAvailability = (date: string) => {
    console.log('🔄 Toggling day availability for date:', date);
    setAvailability(prev => prev.map(day => {
      if (day.date === date) {
        const newIsAvailable = !day.isAvailable;
        console.log(`📅 Day ${day.displayDate} availability changed to:`, newIsAvailable);
        return {
          ...day,
          isAvailable: newIsAvailable,
          timeSlots: newIsAvailable 
            ? ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
            : [] // Clear all time slots when disabling the day
        };
      }
      return day;
    }));
  };

  const toggleTimeSlot = (date: string, time: string) => {
    setAvailability(prev => prev.map(day => {
      if (day.date === date) {
        const currentSlots = day.timeSlots || [];
        const isSelected = currentSlots.includes(time);
        const newSlots = isSelected 
          ? currentSlots.filter(slot => slot !== time)
          : [...currentSlots, time].sort();
        return { ...day, timeSlots: newSlots };
      }
      return day;
    }));
  };

  const handleSave = async () => {
    if (!selectedBarber) {
      console.log('❌ No barber selected for save');
      return;
    }
    
    console.log('💾 Starting save process for barber:', selectedBarber.name);
    console.log('📅 Current availability state:', availability);
    setSaving(true);
    
    try {
      const barberId = selectedBarber.id;
      
      // Convert 14-day format to weekly dayOfWeek format - BACK TO SIMPLE VERSION
      const weeklyPattern: {[key: number]: string[]} = {};
      
      availability.forEach(day => {
        if (day.isAvailable && day.timeSlots && day.timeSlots.length > 0) {
          const date = new Date(day.date);
          const dayOfWeek = date.getDay();
          
          if (!weeklyPattern[dayOfWeek]) {
            weeklyPattern[dayOfWeek] = day.timeSlots;
          }
        }
      });

      // Convert to the format expected by the optimistic update function - BACK TO ORIGINAL SIMPLE VERSION
      const weeklySchedule = Object.entries(weeklyPattern).map(([dayOfWeek, timeSlots]) => {
        if (timeSlots.length > 0) {
          const startTime = timeSlots[0];
          const endTime = timeSlots[timeSlots.length - 1];
          // Convert "HH:mm" to next hour for endTime
          const [endHour, endMin] = endTime.split(':').map(Number);
          const finalEndTime = endMin === 30 ? `${(endHour + 1).toString().padStart(2, '0')}:00` : `${endHour.toString().padStart(2, '0')}:30`;
          
          return {
            dayOfWeek: parseInt(dayOfWeek),
            startTime,
            endTime: finalEndTime,
            isAvailable: true
          };
        }
      }).filter(Boolean) as Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[];

      // Apply optimistic update with automatic rollback on error
      await updateBarberWeeklyAvailabilityOptimistic(
        barberId, 
        weeklySchedule,
        (optimisticSchedule) => {
          console.log('✅ Optimistic update applied:', optimisticSchedule);
        },
        (error) => {
          console.error('❌ Error in optimistic update, rolling back:', error);
          showToast('שגיאה בשמירת הזמינות', 'error');
        }
      );

      showToast('הזמינות נשמרו בהצלחה', 'success');
      setModalVisible(false);
      
    } catch (error) {
      console.error('Error saving availability:', error);
      showToast('שגיאה בשמירת הזמינות', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="ניהול זמינות"
          onBellPress={() => {}}
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate('admin-home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען ספרים...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול זמינות"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>בחר איש צוות לניהול זמינות</Text>
          <Text style={styles.headerSubtitle}>
            כאן תוכל לקבוע את שעות העבודה הזמינות לכל ספר
          </Text>
        </View>

        {barbers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>אין ספרים במערכת</Text>
            <TouchableOpacity 
              style={styles.emptyAddButton} 
              onPress={() => onNavigate('admin-team')}
            >
              <Text style={styles.emptyAddButtonText}>הוסף ספר ראשון</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.barbersGrid}>
            {barbers.map((barber) => (
              <TouchableOpacity
                key={barber.id}
                style={styles.barberCard}
                onPress={() => openEditModal(barber)}
              >
                <View style={styles.barberImageContainer}>
                  <View style={styles.barberImage}>
                    <Text style={styles.barberPlaceholder}>✂️</Text>
                  </View>
                </View>
                
                <View style={styles.barberDetails}>
                  <Text style={styles.barberName}>{barber.name}</Text>
                  <Text style={styles.barberExperience}>{barber.experience}</Text>
                  <Text style={styles.editHint}>לחץ לעריכת זמינות</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Edit Availability Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                עריכת זמינות - {selectedBarber?.name}
              </Text>
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={async () => {
                    if (selectedBarber) {
                      console.log('🔄 Refreshing availability from Firebase for:', selectedBarber.name);
                      try {
                        const currentAvailability = await getBarberAvailability(selectedBarber.id);
                        console.log('📅 Refreshed availability:', currentAvailability);
                        updateAvailabilityFromRealTimeData(currentAvailability);
                        showToast('הזמינות עודכנו בהצלחה', 'success');
                      } catch (error) {
                        console.error('❌ Error refreshing availability:', error);
                        showToast('שגיאה בעדכון הזמינות', 'error');
                      }
                    }
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#FF00AA" />
                  <Text style={styles.refreshButtonText}>עדכן שעות</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.instructionText}>
                בחר ימים וסמן שעות זמינות לספר {selectedBarber?.name}
              </Text>
              
              {availability.map((day) => (
                <View key={day.date} style={styles.dayCard}>
                  <View style={styles.dayTitleContainer}>
                    <Text style={styles.dayTitle}>{day.fullDate}</Text>
                  </View>
                  <View style={styles.dayNameHeader}>
                    <Text style={styles.dayNameText}>יום {day.weekday}</Text>
                    <Text style={styles.dayDateText}>{day.displayDate}</Text>
                  </View>
                  <View style={styles.dayHeader}>
                    <TouchableOpacity 
                      onPress={() => toggleDayAvailability(day.date)} 
                      style={[styles.toggleButton, day.isAvailable ? styles.activeButton : styles.inactiveButton]}
                    >
                      <Text style={styles.toggleText}>
                        {day.isAvailable ? 'פעיל' : 'לא פעיל'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {day.isAvailable && (
                    <View style={styles.timeGrid}>
                      <Text style={styles.timeGridTitle}>בחר שעות זמינות:</Text>
                      <View style={styles.timeSlots}>
                        {timeSlots.map((time) => {
                          const dayTimeSlots: string[] = day.timeSlots || [];
                          const isSelected = dayTimeSlots.includes(time);
                          return (
                            <TouchableOpacity
                              key={`${day.date}-${time}`}
                              style={[styles.timeSlot, isSelected ? styles.selectedTimeSlot : styles.unselectedTimeSlot]}
                              onPress={() => toggleTimeSlot(day.date, time)}
                            >
                              <Text style={[styles.timeSlotText, isSelected && styles.selectedTimeSlotText]}>
                                {time}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.selectedCount}>
                        נבחרו: {day.timeSlots?.length || 0} שעות
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'שומר...' : 'שמור זמינות'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  barberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: (width - 48) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  barberImageContainer: {
    marginBottom: 16,
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barberPlaceholder: {
    fontSize: 32,
    color: '#666',
  },
  barberDetails: {
    alignItems: 'center',
  },
  barberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  editHint: {
    fontSize: 12,
    color: '#007bff',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '95%',
    maxWidth: 500,
    height: '85%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF00AA',
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#FF00AA',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  modalBody: {
    flex: 1,
    marginBottom: 20,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayTitleContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  dayNameHeader: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  dayDateText: {
    fontSize: 16,
    color: '#e3f2fd',
    textAlign: 'center',
    marginTop: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#28a745',
  },
  inactiveButton: {
    backgroundColor: '#dc3545',
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeGrid: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeGridTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  unselectedTimeSlot: {
    backgroundColor: '#f8f9fa',
    borderColor: '#ddd',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#007bff',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminAvailabilityScreen;