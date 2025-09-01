import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  addToWaitlist,
  Barber,
  BarberTreatment,
  createAppointment,
  getBarberAppointmentsForDay,
  getBarberByUserId,
  getBarbers,
  getBarberTreatments,
  getCurrentUser,
  getTreatments,
  listenBarberAvailability,
  Treatment,
  type BarberAvailability
} from '../../services/firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import TopNav from '../components/TopNav';

const { width, height } = Dimensions.get('window');

interface BookingScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
  onClose?: () => void;
  route?: {
    params?: {
      barberId?: string;
    };
  };
}

const BookingScreen: React.FC<BookingScreenProps> = ({ onNavigate, onBack, onClose, route }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUserBarber, setCurrentUserBarber] = useState<Barber | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [barberTreatments, setBarberTreatments] = useState<BarberTreatment[]>([]);
  const [displayTreatments, setDisplayTreatments] = useState<(Treatment | BarberTreatment)[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [barberAvailability, setBarberAvailability] = useState<BarberAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [detailsBarber, setDetailsBarber] = useState<Barber | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Calendar month state for proper month view and navigation
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const getMonthDays = (monthDate: Date): Date[] => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Date[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const preSelectedBarberId = route?.params?.barberId;

  useEffect(() => {
    loadData();
  }, []);

  // Listen to barber availability in real-time when a barber is selected
  useEffect(() => {
    if (!selectedBarber) {
      console.log('🔇 No barber selected, clearing availability listener');
      setBarberAvailability([]);
      return;
    }
    
    console.log(`🔊 Setting up real-time availability listener for barber: ${selectedBarber.id}`);
    const unsubscribe = listenBarberAvailability(selectedBarber.id, (newAvailability) => {
      console.log(`📡 Received availability update for ${selectedBarber.id}:`, newAvailability);
      setBarberAvailability(newAvailability);
    });
    
    return () => {
      console.log(`🔇 Cleaning up availability listener for barber: ${selectedBarber.id}`);
      unsubscribe && unsubscribe();
    };
  }, [selectedBarber?.id]);

  // Load barber-specific treatments when a barber is selected
  useEffect(() => {
    if (!selectedBarber) {
      setDisplayTreatments([]);
      return;
    }
    loadBarberTreatments(selectedBarber.id);
  }, [selectedBarber?.id]);

  // Regenerate times automatically when availability updates in realtime
  useEffect(() => {
    if (!selectedBarber || !selectedDate || !selectedTreatment) return;
    (async () => {
      const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
      const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setAvailableTimes(timeStrings);
    })();
  }, [barberAvailability]);

  const loadData = async () => {
    try {
      const [barbersData, treatmentsData] = await Promise.all([
        getBarbers(),
        getTreatments()
      ]);
      
      setBarbers(barbersData);
      setTreatments(treatmentsData);
      
      // Check if current user is a barber
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userBarber = await getBarberByUserId(currentUser.uid);
          setCurrentUserBarber(userBarber);
        }
      } catch (error) {
        console.log('User is not a barber or not logged in');
      }
      
      // If barber is pre-selected, set it and skip to next step
      if (preSelectedBarberId) {
        const preSelectedBarber = barbersData.find(b => b.id === preSelectedBarberId);
        if (preSelectedBarber) {
          setSelectedBarber(preSelectedBarber);
          setCurrentStep(2);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('common.error'), t('errors.load_data_error'));
    } finally {
      setLoading(false);
    }
  };

  const loadBarberTreatments = async (barberId: string) => {
    try {
      console.log(`🔍 Loading treatments for barber: ${barberId}`);
      
      // Load barber-specific treatments
      const barberSpecificTreatments = await getBarberTreatments(barberId);
      
      if (barberSpecificTreatments.length > 0) {
        // Use barber-specific treatments only
        console.log(`✅ Found ${barberSpecificTreatments.length} barber-specific treatments`);
        setDisplayTreatments(barberSpecificTreatments);
      } else {
        // Fallback to global treatments if no barber-specific treatments
        console.log(`📋 No barber-specific treatments found, using global treatments`);
        setDisplayTreatments(treatments);
      }
    } catch (error) {
      console.error('Error loading barber treatments:', error);
      // Fallback to global treatments on error
      setDisplayTreatments(treatments);
    }
  };

  // Check if a slot is available (no overlap with existing appointments)
  function isSlotAvailable(slotStart: Date, slotDuration: number, appointments: any[]) {
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
    
    console.log('Checking slot availability:', {
      slotStart: `${slotStart.getHours()}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
      slotDuration,
      totalAppointments: appointments.length
    });
    
    for (const appt of appointments) {
      try {
        // Handle Firestore Timestamp objects
        let apptStart: Date;
        if (appt.date && typeof appt.date.toDate === 'function') {
          // Firestore Timestamp
          apptStart = appt.date.toDate();
        } else if (appt.date) {
          // Regular date string or number
          apptStart = new Date(appt.date);
        } else if (appt.time) {
          // Fallback to time field
          apptStart = new Date(appt.time);
        } else {
          console.warn('Appointment missing date/time:', appt);
          continue;
        }
        
        const apptDuration = appt.duration || 30; // Default 30min
        const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
        
        // Check for overlap - if any part of the slot overlaps with appointment
        const hasOverlap = slotStart < apptEnd && slotEnd > apptStart;
        
        if (hasOverlap) {
          console.log('❌ Slot blocked by appointment:', {
            slotTime: `${slotStart.getHours()}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
            apptTime: `${apptStart.getHours()}:${apptStart.getMinutes().toString().padStart(2, '0')}`,
            apptDuration,
            apptStatus: appt.status,
            apptId: appt.id
          });
          return false;
        }
      } catch (error) {
        console.error('Error processing appointment:', appt, error);
        continue;
      }
    }
    
    console.log('✅ Slot is available');
    return true;
  }

  // Check if a time slot overlaps with break hours
  function isSlotDuringBreak(slotStart: Date, slotDuration: number, dayAvailability: any) {
    if (!dayAvailability.hasBreak || !dayAvailability.breakStartTime || !dayAvailability.breakEndTime) {
      return false;
    }
    
    const [breakStartHour, breakStartMin] = dayAvailability.breakStartTime.split(':').map(Number);
    const [breakEndHour, breakEndMin] = dayAvailability.breakEndTime.split(':').map(Number);
    
    const breakStart = new Date(slotStart);
    breakStart.setHours(breakStartHour, breakStartMin, 0, 0);
    
    const breakEnd = new Date(slotStart);
    breakEnd.setHours(breakEndHour, breakEndMin, 0, 0);
    
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);
    
    // Check if any part of the slot overlaps with break time
    const hasOverlap = slotStart < breakEnd && slotEnd > breakStart;
    
    if (hasOverlap) {
      console.log('❌ Slot blocked by break time:', {
        slotTime: `${slotStart.getHours()}:${slotStart.getMinutes().toString().padStart(2, '0')}`,
        breakTime: `${dayAvailability.breakStartTime}-${dayAvailability.breakEndTime}`
      });
    }
    
    return hasOverlap;
  }

  // Generate available slots for the selected barber, date, and treatment duration
  async function generateAvailableSlots(barberId: string, date: Date, treatmentDuration: number) {
    try {
      console.log('=== GENERATING TIME SLOTS ===');
      console.log('Barber ID:', barberId);
      console.log('Date:', date.toDateString());
      console.log('Treatment Duration:', treatmentDuration, 'minutes');
      
      // Get barber's availability for the selected day (from realtime state)
      const dayOfWeek = date.getDay();
      
      // Do not auto-initialize defaults here to avoid overriding admin/barber changes
      
      console.log('📅 Current barber availability state:', barberAvailability);
      console.log('🔍 Looking for day:', dayOfWeek, ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]);
      
      const dayAvailability = barberAvailability.find(a => a.dayOfWeek === dayOfWeek);
      
      if (!dayAvailability) {
        console.log('❌ No availability record found for day', dayOfWeek);
        console.log('Available days in data:', barberAvailability.map(a => `Day ${a.dayOfWeek} (${a.isAvailable ? 'available' : 'unavailable'})`));
        return [];
      }
      
      if (!dayAvailability.isAvailable) {
        console.log('❌ Barber marked as unavailable on this day');
        return [];
      }
      
      console.log('✅ Barber is available on this day');
      console.log('Available hours:', dayAvailability.startTime, '-', dayAvailability.endTime);
      
      // Get appointments for this day
      const appointments = await getBarberAppointmentsForDay(barberId, date);
      console.log('Found', appointments.length, 'appointments for this day');
      
      const slots = [];
      
      // Parse the barber's working hours for this day
      const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
      const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
      
      // Generate time slots based on barber's actual availability
      const startTime = new Date(date);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      const currentSlot = new Date(startTime);
      
      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot.getTime() + treatmentDuration * 60000);
        if (slotEnd > endTime) {
          break;
        }
        
        // Skip past times if it's today
        const now = new Date();
        if (date.toDateString() === now.toDateString() && currentSlot <= now) {
          currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
          continue;
        }
        
        if (isSlotAvailable(currentSlot, treatmentDuration, appointments)) {
          slots.push(new Date(currentSlot));
        }
        
        currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
      }
      
      console.log('Generated slots:', slots.length);
      return slots;
    } catch (error) {
      console.error('Error generating time slots:', error);
      return [];
    }
  }

  const generateAvailableTimes = async () => {
    if (!selectedBarber || !selectedDate || !selectedTreatment) return;
    
    const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
    const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setAvailableTimes(timeStrings);
  };

  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Include all days - let barber availability determine what's bookable
      dates.push(date);
    }
    
    return dates;
  };

  const handleBarberSelect = async (barber: Barber) => {
    console.log('🔄 Barber selected, refreshing barber data to get latest pricing...');
    
    try {
      // Refresh barber data to ensure we have the latest pricing
      const updatedBarbers = await getBarbers();
      const updatedBarber = updatedBarbers.find(b => b.id === barber.id);
      
      if (updatedBarber) {
        console.log('✅ Updated barber pricing:', updatedBarber.pricing);
        setBarbers(updatedBarbers);
        setSelectedBarber(updatedBarber);
      } else {
        console.warn('⚠️ Could not find updated barber data, using current data');
        setSelectedBarber(barber);
      }
    } catch (error) {
      console.error('❌ Error refreshing barber data:', error);
      setSelectedBarber(barber);
    }
    
    setCurrentStep(2);
  };

  const handleTreatmentSelect = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setCurrentStep(3);
    // If we already have a selected date, generate times now
    if (selectedDate && selectedBarber) {
      generateAvailableSlots(selectedBarber.id, selectedDate, treatment.duration).then(slots => {
        const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setAvailableTimes(timeStrings);
      });
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setCurrentStep(4);
    if (selectedBarber && selectedTreatment) {
      try {
        const slots = await generateAvailableSlots(selectedBarber.id, date, selectedTreatment.duration);
        const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        
        // If no slots available, only attempt fallback when the day is actually marked available.
        // If the day is unavailable or has no availability record, show no times at all.
        if (timeStrings.length === 0) {
          const dayAvailability = barberAvailability.find(a => a.dayOfWeek === date.getDay());
          if (!dayAvailability || !dayAvailability.isAvailable) {
            console.log('Day is unavailable or missing availability record. Skipping fallback times.');
            setAvailableTimes([]);
            return;
          }

          console.log('No generated slots but day is available — computing safe fallback times');
          const fallbackTimes: string[] = [];

          // Get existing appointments for filtering
          const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, date);

          for (let hour = 9; hour <= 18; hour++) {
            const timeSlots = [
              `${hour.toString().padStart(2, '0')}:00`,
              hour < 18 ? `${hour.toString().padStart(2, '0')}:30` : null
            ].filter((slot): slot is string => slot !== null);

            for (const timeSlot of timeSlots) {
              const slotDateTime = new Date(date);
              const [slotHour, slotMin] = timeSlot.split(':').map(Number);
              slotDateTime.setHours(slotHour, slotMin, 0, 0);

              // Respect break windows
              if (isSlotDuringBreak(slotDateTime, selectedTreatment.duration, dayAvailability)) {
                continue;
              }

              if (isSlotAvailable(slotDateTime, selectedTreatment.duration, existingAppointments)) {
                fallbackTimes.push(timeSlot);
              }
            }
          }

          console.log('Filtered fallback times:', fallbackTimes);
          setAvailableTimes(fallbackTimes);
        } else {
          setAvailableTimes(timeStrings);
        }
      } catch (error) {
        console.error('Error generating slots, using fallback:', error);
        // If we fail to generate slots, do NOT show any fallback when the day is unavailable
        const dayAvailability = barberAvailability.find(a => a.dayOfWeek === date.getDay());
        if (!dayAvailability || !dayAvailability.isAvailable) {
          setAvailableTimes([]);
          return;
        }

        // Safe fallback with respect to breaks and existing appointments
        const fallbackTimes: string[] = [];
        try {
          const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, date);
          for (let hour = 9; hour <= 18; hour++) {
            const timeSlots = [
              `${hour.toString().padStart(2, '0')}:00`,
              hour < 18 ? `${hour.toString().padStart(2, '0')}:30` : null
            ].filter((slot): slot is string => slot !== null);

            for (const timeSlot of timeSlots) {
              const slotDateTime = new Date(date);
              const [slotHour, slotMin] = timeSlot.split(':').map(Number);
              slotDateTime.setHours(slotHour, slotMin, 0, 0);

              if (isSlotDuringBreak(slotDateTime, selectedTreatment.duration, dayAvailability)) {
                continue;
              }

              if (isSlotAvailable(slotDateTime, selectedTreatment.duration, existingAppointments)) {
                fallbackTimes.push(timeSlot);
              }
            }
          }
        } catch (innerError) {
          console.error('Error in fallback filtering:', innerError);
        }
        setAvailableTimes(fallbackTimes);
      }
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert(t('common.error'), t('booking.login_required'));
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedTreatment || !selectedDate || !selectedTime) {
      Alert.alert(t('common.error'), t('booking.select_all_details'));
      return;
    }

    setBooking(true);
    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      console.log('Creating appointment:', {
        barberId: selectedBarber.id,
        date: appointmentDateTime.toISOString(),
        duration: selectedTreatment.duration
      });

      // Double-check availability before creating appointment
      const existingAppointments = await getBarberAppointmentsForDay(selectedBarber.id, selectedDate);
      const isStillAvailable = isSlotAvailable(appointmentDateTime, selectedTreatment.duration, existingAppointments);
      
      if (!isStillAvailable) {
        Alert.alert(
          t('booking.slot_taken'),
          t('booking.slot_taken_message'),
          [{ text: t('common.confirm'), style: 'default' }]
        );
        setBooking(false);
        setShowConfirmModal(false);
        // Refresh available times
        if (selectedBarber && selectedTreatment) {
          const slots = await generateAvailableSlots(selectedBarber.id, selectedDate, selectedTreatment.duration);
          const timeStrings = slots.map(slot => slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          setAvailableTimes(timeStrings);
        }
        return;
      }

      await createAppointment({
        userId: user.uid,
        barberId: selectedBarber.id,
        treatmentId: selectedTreatment.id,
        date: Timestamp.fromDate(appointmentDateTime),
        duration: selectedTreatment.duration, // Save duration!
        status: 'confirmed' // Changed from 'pending' to 'confirmed' - auto-approve appointments
      });

      console.log('Appointment created successfully');
      setShowConfirmModal(false);
      setSuccessMessage(t('booking.appointment_details', { 
        date: selectedDate.toLocaleDateString('he-IL'), 
        time: selectedTime 
      }));
      setShowSuccessModal(true);

      // אחרי יצירת התור בהצלחה - ההתראות נשלחות אוטומטית דרך Firebase
      console.log('Appointment created successfully with automatic notifications');

    } catch (error) {
      console.error('Error creating appointment:', error);
      Alert.alert(t('common.error'), t('booking.booking_error'));
    } finally {
      setBooking(false);
    }
  };

  const handleWaitlistJoin = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('כניסה נדרשת', 'יש להתחבר כדי להצטרף לרשימת ההמתנה');
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedTreatment) {
      Alert.alert('פרטים חסרים', 'יש לבחור ספר וטיפול כדי להצטרף לרשימת ההמתנה');
      return;
    }

    // Show time picker for preferred time
    Alert.prompt(
      'שעה רצויה',
      'באיזו שעה היית רוצה את התור? (למשל: 09:00, 14:30)',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'אישור',
          onPress: async (preferredTime) => {
            if (!preferredTime || preferredTime.trim() === '') {
              preferredTime = '09:00'; // Default time
            }
            
            try {
              // Use current date if no specific date is selected
              const currentDate = selectedDate || new Date();
              const dateStr = currentDate.toISOString().split('T')[0];
              
              await addToWaitlist({
                clientId: user.uid,
                clientName: user.displayName || 'לקוח',
                clientPhone: user.phoneNumber || '',
                barberId: selectedBarber.id,
                requestedDate: dateStr,
                requestedTime: preferredTime.trim(),
                treatmentId: selectedTreatment.id,
                treatmentName: selectedTreatment.name,
                status: 'waiting',
                notes: `לקוח מעוניין ב${selectedTreatment.name} אצל ${selectedBarber.name} בשעה ${preferredTime.trim()}`
              });

              Alert.alert(
                'נעדכן אותך שתור יתפנה!',
                `הוספנו אותך לרשימת ההמתנה של ${selectedBarber.name} בשעה ${preferredTime.trim()}.\nהספר יקבל התראה וידע אם יש תור פנוי.`,
                [{ text: 'הבנתי', onPress: () => onNavigate('profile') }]
              );
            } catch (error) {
              console.error('Error adding to waitlist:', error);
              Alert.alert('שגיאה', 'שגיאה בהצטרפות לרשימת ההמתנה');
            }
          }
        }
      ],
      'plain-text',
      '09:00'
    );
  };

  const resetBooking = () => {
    setCurrentStep(preSelectedBarberId ? 2 : 1);
    if (!preSelectedBarberId) {
      setSelectedBarber(null);
    }
    setSelectedTreatment(null);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      
      switch (currentStep) {
        case 2:
          if (!preSelectedBarberId) {
            setSelectedBarber(null);
          }
          break;
        case 3:
          setSelectedTreatment(null);
          break;
        case 4:
          setSelectedDate(null);
          break;
      }
    }
  };

  const formatDate = (date: Date) => {
    const days = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const months = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    return `יום ${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'בחר ספר';
      case 2: return 'בחר טיפול';
      case 3: return 'בחר תאריך';
      case 4: return 'בחר שעה';
      default: return 'הזמנת תור';
    }
  };

  // ההתראות נשלחות אוטומטית דרך Firebase - אין צורך בפונקציה מקומית

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title={t('booking.title')} 
          onBellPress={() => {}} 
          onMenuPress={() => {}} 
          showBackButton={true}
          onBackPress={onBack}
          showCloseButton={true}
          onClosePress={onClose}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('booking.title')} 
        onBellPress={() => {}} 
        onMenuPress={() => {}} 
        showBackButton={true}
        onBackPress={onBack}
        showCloseButton={true}
        onClosePress={onClose}
      />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / 4) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{t('booking.step_of', { current: currentStep, total: 4 })}</Text>
      </View>

      {/* Step Header */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Barber */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <View style={styles.barbersGrid}>
              {barbers.map((barber) => (
                <TouchableOpacity
                  key={barber.id}
                  style={[
                    styles.barberCard,
                    selectedBarber?.id === barber.id && styles.selectedCard
                  ]}
                  onPress={() => handleBarberSelect(barber)}
                  disabled={false}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.barberGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.barberImage}>
                      {barber.image ? (
                        <Image
                          source={{ uri: barber.image }}
                          style={styles.barberPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.barberPlaceholder}>✂️</Text>
                      )}
                    </View>
                    <Text style={styles.barberName}>{barber.name}</Text>
                    <Text style={styles.barberExperience}>{barber.experience}</Text>
                    <TouchableOpacity style={styles.detailsButton} onPress={() => setDetailsBarber(barber)}>
                      <Text style={styles.detailsButtonText}>{t('booking.details')}</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Select Treatment */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.treatmentsContainer}>
              {displayTreatments.length === 0 ? (
                <View style={styles.emptyTreatments}>
                  <Text style={styles.emptyTreatmentsText}>
                    אין טיפולים זמינים עבור הספר הזה
                  </Text>
                </View>
              ) : (
                displayTreatments.map((treatment) => (
                <TouchableOpacity
                  key={treatment.id}
                  style={[
                    styles.treatmentCard,
                    selectedTreatment?.id === treatment.id && styles.selectedCard
                  ]}
                  onPress={() => handleTreatmentSelect(treatment)}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.treatmentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.treatmentImage}>
                      <Text style={styles.treatmentPlaceholder}>💇</Text>
                    </View>
                    <View style={styles.treatmentInfo}>
                      <Text style={styles.treatmentName}>{treatment.name}</Text>
                      <Text style={styles.treatmentDescription}>{treatment.description}</Text>
                      <View style={styles.treatmentDetails}>
                        <Text style={styles.treatmentPrice}>
                          {(() => {
                            // Debug logging for pricing
                            console.log('Pricing debug:', {
                              treatmentId: treatment.id,
                              treatmentName: treatment.name,
                              treatmentBasePrice: treatment.price,
                              selectedBarberId: selectedBarber?.id,
                              barberPricing: selectedBarber?.pricing,
                              customPrice: selectedBarber?.pricing?.[treatment.id],
                              currentUserBarber: currentUserBarber?.id
                            });
                            
                            // If current user is a barber, only show their own prices
                            if (currentUserBarber && selectedBarber && selectedBarber.id !== currentUserBarber.id) {
                              return "מחיר לפי בחירת ספר";
                            }
                            
                            // Show the actual price - prioritize custom pricing over base price
                            const customPrice = selectedBarber?.pricing?.[treatment.id];
                            if (customPrice && customPrice !== treatment.price) {
                              console.log(`Using custom price ₪${customPrice} for ${treatment.name}`);
                              return `₪${customPrice}`;
                            } else {
                              console.log(`Using base price ₪${treatment.price} for ${treatment.name}`);
                              return `₪${treatment.price}`;
                            }
                          })()}
                        </Text>
                        <Text style={styles.treatmentDuration}>{t('booking.duration', { duration: treatment.duration })}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* Step 3: Select Date */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <View style={styles.calendarContainer}>
              {/* Calendar Top Header (black) */}
              <View style={styles.calendarTopBar}>
                <TouchableOpacity
                  accessibilityLabel="Previous Month"
                  onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={styles.topBarArrowLeft}
                >
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>בחירת תאריך</Text>
                <TouchableOpacity
                  accessibilityLabel="Next Month"
                  onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  style={styles.topBarArrowRight}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Days of Week */}
              <View style={styles.daysOfWeekContainer}>
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map((day) => (
                  <View key={day} style={styles.dayOfWeekCell}>
                    <Text style={styles.dayOfWeek}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {(() => {
                  const monthDays = getMonthDays(currentMonth); // מחזיר מערך Date לכל ימי החודש
                  const firstWeekday = new Date(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    1
                  ).getDay(); // 0=ראשון

                  // ריקים בתחילת החודש (RTL עם row-reverse – זה הערך הנכון)
                  const leadingBlanks = Array.from({ length: firstWeekday }).map((_, i) => (
                    <View key={`lb-${i}`} style={styles.calendarDayBlank} />
                  ));

                  // קבועים להשוואה ללא שינוי האובייקט:
                  const now = new Date();
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                  const dayCells = monthDays.map((date) => {
                    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                    const key = date.toISOString();

                    const isPast = dateStart < todayStart;
                    const isToday = dateStart === todayStart;
                    const isSelected = selectedDate?.getTime?.() === dateStart;

                    // זמינות ספר
                    const dayOfWeek = date.getDay();
                    const dayAvailability = barberAvailability.find(a => a.dayOfWeek === dayOfWeek);
                    const isAvailable = Boolean(dayAvailability && dayAvailability.isAvailable);

                    const disabled = isPast || !isAvailable;

                    const dayStyles = [
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      !isPast && !isAvailable && styles.calendarDayUnavailable,
                      isPast && styles.calendarDayPast,
                      isToday && !isSelected && styles.calendarDayToday,
                    ];
                    const textStyles = [
                      styles.calendarDayText,
                      isSelected && styles.calendarDayTextSelected,
                      !isPast && !isAvailable && styles.calendarDayTextUnavailable,
                      isPast && styles.calendarDayTextPast,
                      isToday && !isSelected && styles.calendarDayTextToday,
                    ];

                    return (
                      <TouchableOpacity
                        key={key}
                        style={dayStyles}
                        onPress={() => !disabled && handleDateSelect(date)}
                        disabled={disabled}
                      >
                        <Text style={textStyles}>{date.getDate()}</Text>
                      </TouchableOpacity>
                    );
                  });

                  // ריקים בסוף כדי להשלים שורה
                  const total = firstWeekday + monthDays.length;
                  const trailingCount = (7 - (total % 7)) % 7;
                  const trailingBlanks = Array.from({ length: trailingCount }).map((_, i) => (
                    <View key={`tb-${i}`} style={styles.calendarDayBlank} />
                  ));

                  return [...leadingBlanks, ...dayCells, ...trailingBlanks];
                })()}
              </View>

              {/* Legend */}
              <View style={styles.calendarLegend}>
                <View style={styles.legendItem}>
                  <View style={styles.legendLine} />
                  <Text style={styles.legendText}>יש תורים</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendLine, styles.legendLineRed]} />
                  <Text style={styles.legendText}>אין תורים</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.calendarActions}>
                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>לא מצאת תור לזמן שלך?</Text>
                  <Text style={styles.actionSubtitle}>בחר שעה רצויה ותיכנס לרשימת המתנה</Text>
                  <TouchableOpacity style={styles.waitlistButton} onPress={handleWaitlistJoin}>
                    <Text style={styles.waitlistButtonText}>נעדכן אותך שתור יתפנה!</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionSection}>
                  <Text style={styles.actionTitle}>חייב תור דחוף?</Text>
                  <TouchableOpacity style={styles.urgentButton}>
                    <Text style={styles.urgentButtonText}>התורים הקרובים ביותר</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Select Time */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <View style={styles.timesContainer}>
              {availableTimes.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeCard,
                    selectedTime === time && styles.selectedCard
                  ]}
                  onPress={() => handleTimeSelect(time)}
                >
                  <LinearGradient
                    colors={['#1a1a1a', '#000000', '#1a1a1a']}
                    style={styles.timeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.timeText}>{time}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Selected Summary */}
        {currentStep > 1 && (
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#000000', '#1a1a1a']}
              style={styles.summaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.summaryTitle}>{t('booking.booking_summary')}</Text>
              
              {selectedBarber && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.barber')}</Text>
                  <Text style={styles.summaryValue}>{selectedBarber.name}</Text>
                </View>
              )}
              
              {selectedTreatment && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.treatment')}</Text>
                  <Text style={styles.summaryValue}>{selectedTreatment.name}</Text>
                </View>
              )}
              
              {selectedDate && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.date')}</Text>
                  <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
                </View>
              )}
              
              {selectedTime && (
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>{t('booking.time')}</Text>
                  <Text style={styles.summaryValue}>{selectedTime}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showConfirmModal}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('booking.confirm_booking')}</Text>
            
            <View style={styles.confirmationDetails}>
              <Text style={styles.confirmationText}>
                {t('booking.barber')} {selectedBarber?.name}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.treatment')} {selectedTreatment?.name}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.date')} {selectedDate && formatDate(selectedDate)}
              </Text>
              <Text style={styles.confirmationText}>
                {t('booking.time')} {selectedTime}
              </Text>
              <Text style={styles.confirmationPrice}>
                {t('booking.price', { price: selectedTreatment?.price })}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmBooking}
                disabled={booking}
              >
                <Text style={styles.confirmButtonText}>
                  {booking ? t('common.loading') : t('booking.confirm_booking')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={booking}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barber Details Modal */}
      <Modal
        visible={!!detailsBarber}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsBarber(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320, alignItems: 'center' }}>
            {detailsBarber?.image && (
              <Image source={{ uri: detailsBarber.image }} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12 }} />
            )}
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 6 }}>{detailsBarber?.name}</Text>
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>{detailsBarber?.experience}</Text>
            {detailsBarber?.phone && (
              <Text style={{ fontSize: 16, color: '#3b82f6', marginBottom: 8 }}>{t('profile.phone')} {detailsBarber.phone}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {/* אייקון וואטסאפ */}
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20 }}>🟢</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setDetailsBarber(null)} style={{ marginTop: 18 }}>
              <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          resetBooking();
          onNavigate('profile');
        }}
        title={t('booking.appointment_booked')}
        message={successMessage}
        type="success"
        icon="checkmark-circle"
        confirmText={t('profile.view_all')}
        onConfirm={() => {
          setShowSuccessModal(false);
          resetBooking();
          onNavigate('profile');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  barbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  barberCard: {
    width: (width - 48) / 2,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  barberGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  barberImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  barberPlaceholder: {
    fontSize: 30,
    color: '#fff',
  },
  barberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  barberExperience: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  unavailableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  barberPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 6,
  },
  treatmentsContainer: {
    marginBottom: 16,
  },
  treatmentCard: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  treatmentGradient: {
    padding: 20,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  treatmentImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  treatmentPlaceholder: {
    fontSize: 30,
    color: '#fff',
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'right',
  },
  treatmentDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'right',
  },
  treatmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  treatmentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  treatmentDuration: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dateCard: {
    width: (width - 48) / 2,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  dateGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeCard: {
    width: (width - 60) / 3,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  timeGradient: {
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryContainer: {
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'right',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.9,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationDetails: {
    marginBottom: 24,
  },
  confirmationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'right',
  },
  confirmationPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginTop: 8,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyTreatments: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTreatmentsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  calendarNavButton: {
    padding: 16,
  },
  calendarMonthYear: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
  },
  daysOfWeekContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  dayOfWeekCell: {
    width: '14.2857%',   // 100/7
    alignItems: 'center',
  },
  dayOfWeek: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    writingDirection: 'rtl',
  },
  calendarGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 24,
  },
  calendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#000',
  },
  calendarDayBlank: {
    width: '14.2857%',
    aspectRatio: 1,
  },
  calendarDaySelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  calendarDayToday: {
    borderColor: '#007bff',
    borderWidth: 2,
    backgroundColor: '#eef5ff',
  },
  calendarDayUnavailable: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  calendarDayPast: {
    backgroundColor: '#f1f3f5',
    borderColor: '#e9ecef',
  },
  
  calendarDayText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarDayTextSelected: {
    color: '#222',
  },
  calendarDayTextToday: {
    color: '#0b62d6',
  },
  calendarDayTextUnavailable: {
    color: '#fff',
  },
  calendarDayTextPast: {
    color: '#adb5bd',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginRight: 8,
    backgroundColor: '#000',
  },
  legendLineRed: {
    backgroundColor: '#dc3545',
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  calendarActions: {
    marginTop: 20,
  },
  actionSection: {
    marginBottom: 15,
  },
  actionTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  waitlistButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  waitlistButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  urgentButton: {
    backgroundColor: '#c9b38a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  urgentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarTopBar: {
    backgroundColor: '#000',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  topBarArrowRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  topBarArrowLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
});

export default BookingScreen; 