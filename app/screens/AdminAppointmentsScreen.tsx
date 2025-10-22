import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, getFirestore, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Appointment,
    Barber,
    BarberAvailability,
    createAppointment,
    deleteAppointment,
    getAllUsers,
    getBarberAvailability,
    getBarbers,
    getCurrentMonthAppointments,
    getTreatments,
    Treatment,
    updateAppointment,
    UserProfile
} from '../../services/firebase';
import { auth } from '../config/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminAppointmentsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminAppointmentsScreen: React.FC<AdminAppointmentsScreenProps> = ({ onNavigate, onBack }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  // Add appointment form state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [appointmentNotes, setAppointmentNotes] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'existing' | 'manual'>('manual');
  const [manualClientName, setManualClientName] = useState<string>('');
  const [manualClientPhone, setManualClientPhone] = useState<string>('');
  const [barberAvailability, setBarberAvailability] = useState<BarberAvailability[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Load barber availability when a barber is selected
  useEffect(() => {
    if (selectedBarber) {
      loadBarberAvailability(selectedBarber);
    } else {
      setBarberAvailability([]);
    }
  }, [selectedBarber]);

  const loadBarberAvailability = async (barberId: string) => {
    try {
      console.log('📅 Loading availability for barber:', barberId);
      const availability = await getBarberAvailability(barberId);
      console.log('✅ Barber availability loaded:', availability);
      setBarberAvailability(availability);
    } catch (error) {
      console.error('❌ Error loading barber availability:', error);
      setBarberAvailability([]);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading admin appointments data...');

      // Check if current user is a barber first
      const currentUser = auth.currentUser;
      let userBarberId: string | undefined;

      if (currentUser) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData?.role;
          if (userRole === 'barber') {
            userBarberId = userData?.barberId;
          }
        }
      }

      // Load data with barberId filter if user is a barber
      const [appointmentsData, barbersData, usersData, treatmentsData] = await Promise.all([
        getCurrentMonthAppointments(userBarberId), // Pass barberId to filter at query level
        getBarbers(),
        getAllUsers(),
        getTreatments()
      ]);

      let filteredBarbers = barbersData;

      if (userBarberId) {
        // Filter barbers list to show only current barber
        filteredBarbers = barbersData.filter(b => b.id === userBarberId);
        // Auto-select the barber
        setSelectedBarber(userBarberId);
        console.log('✅ Barber data loaded:', {
          appointments: appointmentsData.length,
          barber: userBarberId
        });
      }

      console.log('✅ Data loaded successfully:', {
        appointments: appointmentsData.length,
        barbers: filteredBarbers.length,
        users: usersData.length,
        treatments: treatmentsData.length
      });

      setAppointments(appointmentsData);
      setBarbers(filteredBarbers);
      setUsers(usersData);
      setTreatments(treatmentsData);
      
      if (treatmentsData.length === 0) {
        console.warn('⚠️ No treatments found - this may cause the Add Treatment button to show empty list');
        showToast('לא נמצאו טיפולים במערכת. אנא הוסף טיפולים תחילה.', 'error');
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      showToast('שגיאה בטעינת הנתונים - ' + (error as Error).message, 'error');
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    // Handle both Timestamp objects and regular Date objects
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'מאושר';
      case 'pending': return 'ממתין';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getBarberName = (barberId: string) => {
    const barber = barbers.find(b => b.id === barberId);
    return barber ? barber.name : 'לא נמצא';
  };

  const getUserName = (appointment: any) => {
    // Check if this is a manual client
    if (appointment.isManualClient && appointment.clientName) {
      return appointment.clientName;
    }
    const user = users.find(u => u.uid === appointment.userId);
    return user ? user.displayName : 'לא נמצא';
  };

  const getUserPhone = (appointment: any) => {
    // Check if this is a manual client
    if (appointment.isManualClient && appointment.clientPhone) {
      return appointment.clientPhone;
    }
    const user = users.find(u => u.uid === appointment.userId);
    return user ? user.phone : null;
  };

  const handlePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('שגיאה', 'מספר טלפון לא זמין');
      return;
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    Linking.openURL(`tel:${cleanedNumber}`).catch(() => {
      Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
    });
  };

  const getTreatmentName = (treatmentId: string) => {
    const treatment = treatments.find(t => t.id === treatmentId);
    return treatment ? treatment.name : 'לא נמצא';
  };

  // Generate available dates (14 days from today)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots (9:00 AM to 8:00 PM)
  const generateTimeSlots = () => {
    const slots = [];
    const slotInterval = selectedBarber?.primaryTreatmentDuration || 20;
    
    for (let hour = 9; hour < 20; hour++) {
      for (let min = 0; min < 60; min += slotInterval) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  // Check if a time slot falls during barber's break time
  const isTimeSlotDuringBreak = (slotTime: string, selectedDate: Date, duration: number): boolean => {
    if (!selectedBarber || barberAvailability.length === 0) {
      return false;
    }

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = barberAvailability.find(a => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability || !dayAvailability.hasBreak || !dayAvailability.breakStartTime || !dayAvailability.breakEndTime) {
      return false;
    }

    // Parse the slot time
    const [slotHour, slotMin] = slotTime.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(slotHour, slotMin, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    // Parse break times
    const [breakStartHour, breakStartMin] = dayAvailability.breakStartTime.split(':').map(Number);
    const [breakEndHour, breakEndMin] = dayAvailability.breakEndTime.split(':').map(Number);
    
    const breakStart = new Date(selectedDate);
    breakStart.setHours(breakStartHour, breakStartMin, 0, 0);
    
    const breakEnd = new Date(selectedDate);
    breakEnd.setHours(breakEndHour, breakEndMin, 0, 0);

    // Check if any part of the slot overlaps with break time
    const hasOverlap = slotStart < breakEnd && slotEnd > breakStart;
    
    if (hasOverlap) {
      console.log('⏸️ Time slot during break:', {
        slot: slotTime,
        breakTime: `${dayAvailability.breakStartTime}-${dayAvailability.breakEndTime}`
      });
    }

    return hasOverlap;
  };

  // Check if time slot is within barber's working hours
  const isTimeSlotWithinWorkingHours = (slotTime: string, selectedDate: Date): boolean => {
    if (!selectedBarber || barberAvailability.length === 0) {
      return true; // If no availability data, allow all times (backward compatibility)
    }

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = barberAvailability.find(a => a.dayOfWeek === dayOfWeek);

    if (!dayAvailability || !dayAvailability.isAvailable) {
      console.log('❌ Barber not available on this day:', dayOfWeek);
      return false; // Barber not working this day
    }

    // Parse the slot time
    const [slotHour, slotMin] = slotTime.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMin;

    // Parse working hours
    const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return slotMinutes >= startMinutes && slotMinutes < endMinutes;
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime('');
    setSelectedUser('');
    setSelectedBarber('');
    setSelectedTreatment('');
    setAppointmentNotes('');
    setInputMethod('manual');
    setManualClientName('');
    setManualClientPhone('');
  };

  // Check if a time slot is available (not conflicting with existing appointments, breaks, or working hours)
  const isTimeSlotAvailable = (appointmentDateTime: Date, duration: number, existingAppointments: any[]) => {
    const slotEnd = new Date(appointmentDateTime.getTime() + duration * 60000);
    const timeString = `${appointmentDateTime.getHours().toString().padStart(2, '0')}:${appointmentDateTime.getMinutes().toString().padStart(2, '0')}`;
    
    // Check if time is within working hours
    if (!isTimeSlotWithinWorkingHours(timeString, appointmentDateTime)) {
      console.log('❌ Time slot outside working hours:', timeString);
      return false;
    }
    
    // Check if time is during break
    if (isTimeSlotDuringBreak(timeString, appointmentDateTime, duration)) {
      return false;
    }
    
    // Check for appointment conflicts
    for (const appt of existingAppointments) {
      try {
        // Handle Firestore Timestamp objects
        let apptStart: Date;
        if (appt.date && typeof appt.date.toDate === 'function') {
          apptStart = appt.date.toDate();
        } else if (appt.date) {
          apptStart = new Date(appt.date);
        } else {
          continue;
        }
        
        const apptDuration = appt.duration || 60; // Default 60min for manual appointments
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
        
        // Check for overlap - if any part of the slot overlaps with appointment
        const hasOverlap = appointmentDateTime < apptEnd && slotEnd > apptStart;
        
        if (hasOverlap) {
          console.log('❌ Time slot blocked by existing appointment:', {
            newSlot: `${appointmentDateTime.getHours()}:${appointmentDateTime.getMinutes().toString().padStart(2, '0')}`,
            existingAppt: `${apptStart.getHours()}:${apptStart.getMinutes().toString().padStart(2, '0')}`,
            existingDuration: apptDuration,
            existingStatus: appt.status
          });
          return false;
        }
      } catch (error) {
        console.error('Error processing appointment for conflict check:', appt, error);
        continue;
      }
    }
    
    return true;
  };

  const handleCreateAppointment = async () => {
    // Validate required fields based on input method
    if (!selectedDate || !selectedTime || !selectedBarber || !selectedTreatment) {
      showToast('אנא מלא את כל השדות החובה', 'error');
      return;
    }

    if (inputMethod === 'manual') {
      if (!manualClientName.trim() || !manualClientPhone.trim()) {
        showToast('אנא מלא שם ומספר טלפון של הלקוח', 'error');
        return;
      }
    } else {
      if (!selectedUser) {
        showToast('אנא בחר לקוח מהרשימה', 'error');
        return;
      }
    }

    try {
      // Create appointment date with selected date and time
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const selectedTreatmentObj = treatments.find(t => t.id === selectedTreatment);
      const duration = selectedTreatmentObj?.duration || 60;

      // Check for time slot conflicts before creating appointment
      console.log('🔍 Checking for time slot conflicts...');
      const { getBarberAppointmentsForDay } = await import('../../services/firebase');
      const existingAppointments = await getBarberAppointmentsForDay(selectedBarber, selectedDate);
      
      if (!isTimeSlotAvailable(appointmentDateTime, duration, existingAppointments)) {
        showToast('זמן התור עמוס. אנא בחר זמן אחר.', 'error');
        return;
      }

      console.log('✅ Time slot is available, creating appointment...');

      const appointmentData = {
        userId: inputMethod === 'manual' ? 'manual-client' : selectedUser,
        barberId: selectedBarber,
        treatmentId: selectedTreatment,
        date: Timestamp.fromDate(appointmentDateTime),
        status: 'confirmed' as const, // Changed from 'pending' to 'confirmed'
        notes: appointmentNotes,
        duration: duration,
        // Add manual client info if using manual input
        ...(inputMethod === 'manual' && {
          clientName: manualClientName.trim(),
          clientPhone: manualClientPhone.trim(),
          isManualClient: true
        })
      };

      await createAppointment(appointmentData);
      
      // Reload appointments
      await loadData();
      
      showToast('התור נוסף בהצלחה');
      setAddModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error creating appointment:', error);
      showToast('שגיאה ביצירת התור', 'error');
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus as any });
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId ? { ...apt, status: newStatus as any } : apt
        )
      );
      showToast('הסטטוס עודכן בהצלחה');
      setModalVisible(false);
    } catch (error) {
      showToast('שגיאה בעדכון הסטטוס', 'error');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    Alert.alert(
      'מחיקת תור',
      'האם אתה בטוח שברצונך למחוק תור זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId);
              setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
              showToast('התור נמחק בהצלחה');
              setModalVisible(false);
            } catch (error) {
              showToast('שגיאה במחיקת התור', 'error');
            }
          }
        }
      ]
    );
  };

  const filteredAppointments = appointments
    .filter(apt => {
      if (filter === 'all') return true;
      return apt.status === filter;
    })
    .sort((a, b) => {
      // Sort by date - nearest first
      const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
      const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
      return aTime - bTime;
    });

  // Get the nearest upcoming appointment for highlighting
  const getNearestUpcomingAppointment = () => {
    const now = new Date();
    const upcomingAppointments = filteredAppointments
      .filter(apt => apt.status === 'confirmed')
      .filter(apt => {
        const aptTime = apt.date.toMillis ? apt.date.toMillis() : new Date(apt.date).getTime();
        return aptTime > now.getTime();
      });
    
    return upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;
  };

  const nearestUpcomingAppointment = getNearestUpcomingAppointment();

  const getNextClient = () => {
    const now = new Date();
    const upcomingAppointments = appointments
      .filter(apt => apt.status === 'confirmed')
      .filter(apt => {
        const aptTime = apt.date.toMillis ? apt.date.toMillis() : new Date(apt.date).getTime();
        return aptTime > now.getTime();
      })
      .sort((a, b) => {
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date).getTime();
        return aTime - bTime;
      });
    
    return upcomingAppointments[0] || null;
  };

  const nextClient = getNextClient();

  const filterButtons = [
    { key: 'all', label: 'הכל', count: appointments.length },
    { key: 'pending', label: 'ממתין', count: appointments.filter(a => a.status === 'pending').length },
    { key: 'confirmed', label: 'מאושר', count: appointments.filter(a => a.status === 'confirmed').length },
    { key: 'completed', label: 'הושלם', count: appointments.filter(a => a.status === 'completed').length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="ניהול תורים"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />
      
      <View style={styles.content}>
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filterButtons.map((button) => (
              <TouchableOpacity
                key={button.key}
                style={[
                  styles.filterButton,
                  filter === button.key && styles.activeFilterButton
                ]}
                onPress={() => setFilter(button.key as any)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filter === button.key && styles.activeFilterButtonText
                ]}>
                  {button.label} ({button.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Next Client Button */}
        {nextClient && (
          <View style={styles.nextClientContainer}>
            <TouchableOpacity 
              style={styles.nextClientButton}
              onPress={() => {
                setSelectedAppointment(nextClient);
                setModalVisible(true);
              }}
            >
              <Ionicons name="person" size={16} color="#fff" />
              <Text style={styles.nextClientText}>
                הלקוח הבא: {getUserName(nextClient)} ב-{formatDate(nextClient.date)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Appointments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען תורים...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.appointmentsList}
            ref={(ref) => {
              // Auto-scroll to nearest appointment when component loads
              if (ref && nearestUpcomingAppointment && filteredAppointments.length > 0) {
                setTimeout(() => {
                  const nearestIndex = filteredAppointments.findIndex(apt => apt.id === nearestUpcomingAppointment.id);
                  if (nearestIndex > 0) {
                    // Calculate approximate position to center the nearest appointment
                    const cardHeight = 120; // Approximate height of appointment card
                    const scrollPosition = nearestIndex * cardHeight - 100;
                    ref.scrollTo({ y: Math.max(0, scrollPosition), animated: true });
                  }
                }, 500);
              }
            }}
          >
            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>אין תורים למצב זה</Text>
              </View>
            ) : (
              filteredAppointments.map((appointment) => {
                const isNearestUpcoming = nearestUpcomingAppointment && appointment.id === nearestUpcomingAppointment.id;
                
                return (
                  <TouchableOpacity
                    key={appointment.id}
                    style={[
                      styles.appointmentCard,
                      isNearestUpcoming && styles.nearestAppointmentCard
                    ]}
                    onPress={() => {
                      setSelectedAppointment(appointment);
                      setModalVisible(true);
                    }}
                  >
                    {isNearestUpcoming && (
                      <View style={styles.nearestAppointmentBadge}>
                        <Ionicons name="time" size={12} color="#fff" />
                        <Text style={styles.nearestAppointmentText}>הבא בתור</Text>
                      </View>
                    )}
                    <View style={styles.appointmentHeader}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(appointment.status) }
                      ]}>
                        <Text style={styles.statusText}>
                          {getStatusText(appointment.status)}
                        </Text>
                      </View>
                      <Text style={styles.appointmentDate}>
                        {formatDate(appointment.date)}
                      </Text>
                    </View>
                  
                  <View style={styles.appointmentDetails}>
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>ספר:</Text>
                      <Text style={styles.appointmentValue}>
                        {getBarberName(appointment.barberId)}
                      </Text>
                    </View>
                    
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>טיפול:</Text>
                      <Text style={styles.appointmentValue}>
                        {getTreatmentName(appointment.treatmentId)}
                      </Text>
                    </View>
                    
                    <View style={styles.appointmentRow}>
                      <Text style={styles.appointmentLabel}>לקוח:</Text>
                      <View style={styles.clientInfoContainer}>
                        <Text style={styles.appointmentValue}>
                          {getUserName(appointment)}
                        </Text>
                        {getUserPhone(appointment) && (
                          <View style={styles.phoneContainer}>
                            <Text style={styles.phoneNumber}>
                              {getUserPhone(appointment)}
                            </Text>
                            <TouchableOpacity
                              style={styles.callButton}
                              onPress={() => handlePhoneCall(getUserPhone(appointment)!)}
                            >
                              <Ionicons name="call" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
            )}
          </ScrollView>
        )}
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => {
          console.log('➕ Add appointment button pressed');
          console.log('📱 Current addModalVisible state:', addModalVisible);
          setAddModalVisible(true);
          console.log('📱 Set addModalVisible to true');
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Appointment Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>פרטי התור</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>תאריך: </Text>
                    {formatDate(selectedAppointment.date)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>ספר: </Text>
                    {getBarberName(selectedAppointment.barberId)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>טיפול: </Text>
                    {getTreatmentName(selectedAppointment.treatmentId)}
                  </Text>
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>לקוח: </Text>
                    {getUserName(selectedAppointment)}
                  </Text>
                  {getUserPhone(selectedAppointment) && (
                    <View style={styles.modalPhoneRow}>
                      <Text style={styles.modalLabel}>טלפון: </Text>
                      <View style={styles.modalPhoneContainer}>
                        <Text style={styles.modalPhoneNumber}>
                          {getUserPhone(selectedAppointment)}
                        </Text>
                        <TouchableOpacity
                          style={styles.modalCallButton}
                          onPress={() => handlePhoneCall(getUserPhone(selectedAppointment)!)}
                        >
                          <Ionicons name="call" size={18} color="#fff" />
                          <Text style={styles.modalCallButtonText}>התקשר</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  <Text style={styles.modalDetail}>
                    <Text style={styles.modalLabel}>סטטוס: </Text>
                    {getStatusText(selectedAppointment.status)}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'confirmed')}
                  >
                    <Text style={styles.actionButtonText}>אשר</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'completed')}
                  >
                    <Text style={styles.actionButtonText}>השלם</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleStatusChange(selectedAppointment.id, 'cancelled')}
                  >
                    <Text style={styles.actionButtonText}>בטל</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteAppointment(selectedAppointment.id)}
                  >
                    <Text style={styles.actionButtonText}>מחק</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Appointment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => {
          console.log('❌ Add modal closed');
          setAddModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>הוספת תור חדש</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              {/* Date Selection */}
              <Text style={styles.formLabel}>בחר תאריך *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateContainer}>
                {generateAvailableDates().map((date, index) => (
                  <TouchableOpacity
                    key={`date-${date.getTime()}`}
                    style={[
                      styles.dateButton,
                      selectedDate.toDateString() === date.toDateString() && styles.selectedDateButton
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.dateButtonText,
                      selectedDate.toDateString() === date.toDateString() && styles.selectedDateButtonText
                    ]}>
                      {date.toLocaleDateString('he-IL', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Time Selection */}
              <Text style={styles.formLabel}>בחר שעה * {selectedBarber && barberAvailability.length > 0 && '(אדום = מחוץ לשעות עבודה או הפסקה)'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeContainer}>
                {generateTimeSlots().map((time, index) => {
                  const isWithinHours = isTimeSlotWithinWorkingHours(time, selectedDate);
                  const isDuringBreak = selectedTreatment && isTimeSlotDuringBreak(
                    time, 
                    selectedDate, 
                    treatments.find(t => t.id === selectedTreatment)?.duration || 60
                  );
                  const isUnavailable = !isWithinHours || isDuringBreak;
                  
                  return (
                    <TouchableOpacity
                      key={`time-${time}`}
                      style={[
                        styles.timeButton,
                        selectedTime === time && styles.selectedTimeButton,
                        isUnavailable && styles.unavailableTimeButton
                      ]}
                      onPress={() => {
                        if (isUnavailable) {
                          showToast(
                            isDuringBreak ? 'שעה זו בזמן הפסקה של הספר' : 'שעה זו מחוץ לשעות העבודה של הספר',
                            'error'
                          );
                        } else {
                          setSelectedTime(time);
                        }
                      }}
                    >
                      <Text style={[
                        styles.timeButtonText,
                        selectedTime === time && styles.selectedTimeButtonText,
                        isUnavailable && styles.unavailableTimeButtonText
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Client Input Method Toggle */}
              <Text style={styles.formLabel}>פרטי לקוח *</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    inputMethod === 'manual' && styles.activeToggleButton
                  ]}
                  onPress={() => setInputMethod('manual')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    inputMethod === 'manual' && styles.activeToggleButtonText
                  ]}>
                    הזנה ידנית
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    inputMethod === 'existing' && styles.activeToggleButton
                  ]}
                  onPress={() => setInputMethod('existing')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    inputMethod === 'existing' && styles.activeToggleButtonText
                  ]}>
                    בחירה מרשימה
                  </Text>
                </TouchableOpacity>
              </View>

              {inputMethod === 'manual' ? (
                <View>
                  <Text style={styles.subFormLabel}>שם הלקוח *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="הזן שם מלא"
                    value={manualClientName}
                    onChangeText={setManualClientName}
                    textAlign="right"
                  />
                  
                  <Text style={styles.subFormLabel}>מספר טלפון *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="050-123-4567"
                    value={manualClientPhone}
                    onChangeText={setManualClientPhone}
                    keyboardType="phone-pad"
                    textAlign="right"
                  />
                </View>
              ) : (
                <ScrollView style={styles.selectionContainer}>
                  {users.map((user) => (
                    <TouchableOpacity
                      key={user.uid}
                      style={[
                        styles.selectionButton,
                        selectedUser === user.uid && styles.selectedSelectionButton
                      ]}
                      onPress={() => setSelectedUser(user.uid)}
                    >
                      <Text style={[
                        styles.selectionButtonText,
                        selectedUser === user.uid && styles.selectedSelectionButtonText
                      ]}>
                        {user.displayName}
                      </Text>
                      <Text style={styles.selectionButtonSubtext}>
                        {user.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* Barber Selection */}
              <Text style={styles.formLabel}>בחר ספר *</Text>
              <ScrollView style={styles.selectionContainer}>
                {barbers.map((barber) => (
                  <TouchableOpacity
                    key={barber.id}
                    style={[
                      styles.selectionButton,
                      selectedBarber === barber.id && styles.selectedSelectionButton
                    ]}
                    onPress={() => setSelectedBarber(barber.id)}
                  >
                    <Text style={[
                      styles.selectionButtonText,
                      selectedBarber === barber.id && styles.selectedSelectionButtonText
                    ]}>
                      {barber.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Treatment Selection */}
              <Text style={styles.formLabel}>בחר טיפול *</Text>
              <ScrollView style={styles.selectionContainer}>
                {treatments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cut-outline" size={32} color="#ccc" />
                    <Text style={styles.emptyText}>אין טיפולים במערכת</Text>
                    <TouchableOpacity 
                      style={styles.emptyButton}
                      onPress={() => onNavigate('admin-treatments')}
                    >
                      <Text style={styles.emptyButtonText}>הוסף טיפולים</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  treatments.map((treatment) => (
                    <TouchableOpacity
                      key={treatment.id}
                      style={[
                        styles.selectionButton,
                        selectedTreatment === treatment.id && styles.selectedSelectionButton
                      ]}
                      onPress={() => setSelectedTreatment(treatment.id)}
                    >
                      <Text style={[
                        styles.selectionButtonText,
                        selectedTreatment === treatment.id && styles.selectedSelectionButtonText
                      ]}>
                        {treatment.name}
                      </Text>
                      <Text style={styles.selectionButtonSubtext}>
                        ₪{treatment.price} • {treatment.duration} דקות
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {/* Notes */}
              <Text style={styles.formLabel}>הערות</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                numberOfLines={3}
                placeholder="הערות לתור..."
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                textAlign="right"
              />
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelFormButton}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelFormButtonText}>ביטול</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveFormButton}
                onPress={handleCreateAppointment}
              >
                <Text style={styles.saveFormButtonText}>שמור תור</Text>
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
    paddingTop: 100,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  activeFilterButton: {
    backgroundColor: '#007bff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  appointmentsList: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appointmentLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentValue: {
    fontSize: 14,
    color: '#222',
    fontWeight: '600',
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
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  modalLabel: {
    fontWeight: 'bold',
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // New styles for Add Appointment functionality
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  addModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  formContainer: {
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
    textAlign: 'right',
  },
  dateContainer: {
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 80,
  },
  selectedDateButton: {
    backgroundColor: '#007bff',
  },
  dateButtonText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedDateButtonText: {
    color: '#fff',
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 60,
  },
  selectedTimeButton: {
    backgroundColor: '#007bff',
  },
  unavailableTimeButton: {
    backgroundColor: '#ffe6e6',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    opacity: 0.7,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedTimeButtonText: {
    color: '#fff',
  },
  unavailableTimeButtonText: {
    color: '#ff6b6b',
    textDecorationLine: 'line-through',
  },
  selectionContainer: {
    maxHeight: 150,
    marginBottom: 8,
  },
  selectionButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedSelectionButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007bff',
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'right',
  },
  selectedSelectionButtonText: {
    color: '#007bff',
  },
  selectionButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelFormButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelFormButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveFormButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveFormButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // New styles for client input method
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#007bff',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeToggleButtonText: {
    color: '#fff',
  },
  subFormLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 16,
    marginBottom: 8,
  },
  // Next client button styles
  nextClientContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nextClientButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextClientText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    textAlign: 'center',
  },
  // Phone call styles
  clientInfoContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  phoneNumber: {
    fontSize: 13,
    color: '#007bff',
    fontWeight: '500',
  },
  callButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 4,
    paddingHorizontal: 8,
  },
  modalPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
  },
  modalPhoneNumber: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  modalCallButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  modalCallButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Empty state styles
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Nearest appointment styles
  nearestAppointmentCard: {
    borderWidth: 3,
    borderColor: '#28a745',
    backgroundColor: '#f8fff9',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  nearestAppointmentBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nearestAppointmentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default AdminAppointmentsScreen;