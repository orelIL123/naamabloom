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
  getBarberAvailableSlots,
  getBarberByUserId,
  getBarbers,
  getBarberTreatments,
  getCurrentUser,
  getTreatments,
  listenBarberAvailability,
  listenBarbers,
  Treatment,
  type BarberAvailability
} from '../../services/firebase';
import ConfirmationModal from '../components/ConfirmationModal';
import { MirroredIcon } from '../components/MirroredIcon';
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
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistStartTime, setWaitlistStartTime] = useState('09:00');
  const [waitlistEndTime, setWaitlistEndTime] = useState('18:00');
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

  // helpers
  const MS_DAY = 1000 * 60 * 60 * 24;
  const utcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  type Availability = { dayOfWeek: number; isAvailable: boolean };

  type DayState = {
    disabled: boolean;     // true = לא ניתן לבחור
    isWithin14Days: boolean; // backwards compat (actually window-based)
    isWithinWindow?: boolean; // clearer name
    isPast: boolean;
    isAvailable: boolean;  // זמינות ספר ביום השבוע
    color: 'grey' | 'red' | 'black';  // לתצוגה בלבד
    daysFromToday: number;
    // debug fields optional
    debugReason?: string;
  };

  // Cache for date-specific availability
  const [dateSpecificAvailability, setDateSpecificAvailability] = useState<{[dateStr: string]: boolean}>({});

  // date = היום שמצויר בתא של הלוח
  const getDayState = (
    date: Date,
    barberAvailability: Availability[],
    windowDays = 30, // booking window in days (1 month)
    now: Date = new Date()
  ): DayState => {
    // >>> שינוי כאן: חישוב הבדל ימים ב-UTC <<<
    const daysFromToday = Math.floor((utcDay(date) - utcDay(now)) / MS_DAY);

    const isPast = daysFromToday < 0;
    const withinWindow = daysFromToday >= 0 && daysFromToday < windowDays;

    const dayOfWeek = date.getDay();
    const weeklyAvailable = !!barberAvailability.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);

    const dateStr = new Date(utcDay(date)).toISOString().slice(0,10); // YYYY-MM-DD
    const dateSpecificAvailable = dateSpecificAvailability?.[dateStr];

    const isAvailable = (dateSpecificAvailable ?? weeklyAvailable);

    let debugReason = '';
    const disabled = (() => {
      if (isPast) { debugReason = 'past'; return true; }
      if (!withinWindow) { debugReason = 'outside-window'; return true; }
      if (!isAvailable) { debugReason = 'not-available'; return true; }
      return false;
    })();
    const color: DayState['color'] =
      !withinWindow || isPast ? 'grey' : (!isAvailable ? 'red' : 'black');

    // Diagnostic log for early next-month days (small date) if inside window but disabled
    if (date.getDate() <= 7 && daysFromToday > 0 && daysFromToday < windowDays) {
      console.log('[DAY_STATE]', dateStr, { daysFromToday, withinWindow, weeklyAvailable, dateSpecificAvailable, isAvailable, disabled, debugReason });
    }

    return { disabled, isWithin14Days: withinWindow, isWithinWindow: withinWindow, isPast, isAvailable, color, daysFromToday, debugReason };
  };

  useEffect(() => {
    loadData();
    
    // Set up real-time listener for barbers - sync changes from admin
    console.log('🔊 Setting up barbers listener in BookingScreen');
    const unsubscribe = listenBarbers((updatedBarbers) => {
      console.log('📡 Barbers updated in real-time (BookingScreen):', updatedBarbers.length);
      setBarbers(updatedBarbers);
      
      // Update selected barber if it was edited
      if (selectedBarber) {
        const updatedSelected = updatedBarbers.find(b => b.id === selectedBarber.id);
        if (updatedSelected) {
          setSelectedBarber(updatedSelected);
        }
      }
    });
    
    return () => {
      console.log('🔇 Cleaning up barbers listener (BookingScreen)');
      unsubscribe();
    };
  }, []);

  // Listen to barber availability in real-time when a barber is selected
  useEffect(() => {
    if (!selectedBarber) {
      console.log('🔇 No barber selected, clearing availability listener');
      setBarberAvailability([]);
      setDateSpecificAvailability({});
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

  // Load date-specific availability for next 30 days when barber is selected
  useEffect(() => {
    if (!selectedBarber) {
      setDateSpecificAvailability({});
      return;
    }

    const loadDateSpecificAvailability = async () => {
      console.log(`📅 Loading date-specific availability for barber: ${selectedBarber.id}`);
      const availability: {[dateStr: string]: boolean} = {};

      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        try {
          const slots = await getBarberAvailableSlots(selectedBarber.id, dateStr);
          if (slots.length > 0) {
            availability[dateStr] = true; // mark explicit available day
            if (i < 5 || i >= 25) { // Log only first and last few days
              console.log(`📅 Date ${dateStr}: available (${slots.length} slots)`);
            }
          } else {
            // Explicitly mark as unavailable if no slots - prevents fallback to weekly availability
            availability[dateStr] = false;
            if (i < 5 || i >= 25) {
              console.log(`📅 Date ${dateStr}: NOT available (0 slots)`);
            }
          }
        } catch (error) {
          console.error(`❌ Error loading availability for ${dateStr}:`, error);
          // Mark as unavailable on error to be safe
          availability[dateStr] = false;
        }
      }

      setDateSpecificAvailability(availability);
      const availableDays = Object.keys(availability).filter(k => availability[k]).length;
      const totalDays = Object.keys(availability).length;
      console.log(`✅ Loaded date-specific availability for ${selectedBarber.id}: ${availableDays}/${totalDays} days available`);
    };

    loadDateSpecificAvailability();
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
        
        const apptDuration = appt.duration || 20; // Default 20min
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
      
      // CRITICAL FIX: Generate slots based on treatment duration, not fixed 30-minute intervals
      console.log(`🔧 Generating slots with treatment duration: ${treatmentDuration} minutes`);

      while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot.getTime() + treatmentDuration * 60000);
        if (slotEnd > endTime) {
          console.log(`⏭️ Slot ${currentSlot.toLocaleTimeString()} would end after working hours, skipping`);
          break;
        }

        // Skip past times if it's today
        const now = new Date();
        if (date.toDateString() === now.toDateString() && currentSlot <= now) {
          console.log(`⏭️ Slot ${currentSlot.toLocaleTimeString()} is in the past, skipping`);
          currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
          continue;
        }

        // Skip slots during break time
        if (isSlotDuringBreak(currentSlot, treatmentDuration, dayAvailability)) {
          console.log(`⏭️ Slot ${currentSlot.toLocaleTimeString()} overlaps with break, skipping`);
          currentSlot.setMinutes(currentSlot.getMinutes() + treatmentDuration);
          continue;
        }

        if (isSlotAvailable(currentSlot, treatmentDuration, appointments)) {
          console.log(`✅ Slot ${currentSlot.toLocaleTimeString()} is available`);
          slots.push(new Date(currentSlot));
        } else {
          console.log(`❌ Slot ${currentSlot.toLocaleTimeString()} is blocked by appointment`);
        }

        // Move to next slot based on treatment duration (not fixed 30 minutes)
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
    
    for (let i = 1; i <= 30; i++) {
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

  const handleWaitlistJoin = () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert('כניסה נדרשת', 'יש להתחבר כדי להצטרף לרשימת ההמתנה');
      onNavigate('profile');
      return;
    }

    if (!selectedBarber || !selectedTreatment || !selectedDate) {
      Alert.alert('פרטים חסרים', 'יש לבחור ספר, טיפול ותאריך כדי להצטרף לרשימת ההמתנה');
      return;
    }

    setShowWaitlistModal(true);
  };

  const handleWaitlistSubmit = async () => {
    const user = getCurrentUser();
    if (!user || !selectedBarber || !selectedTreatment || !selectedDate) {
      return;
    }

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      await addToWaitlist({
        clientId: user.uid,
        clientName: user.displayName || 'לקוח',
        clientPhone: user.phoneNumber || '',
        barberId: selectedBarber.id,
        requestedDate: dateStr,
        requestedTimeStart: waitlistStartTime,
        requestedTimeEnd: waitlistEndTime,
        treatmentId: selectedTreatment.id,
        treatmentName: selectedTreatment.name,
        status: 'waiting',
        notes: `לקוח מעוניין ב${selectedTreatment.name} אצל ${selectedBarber.name} בין השעות ${waitlistStartTime}-${waitlistEndTime}`
      });

      setShowWaitlistModal(false);
      Alert.alert(
        '✅ נרשמת בהצלחה!',
        `נרשמת לרשימת המתנה ליום ${formatHebrewDate(selectedDate)}\nבין השעות ${waitlistStartTime}-${waitlistEndTime}.\nנודיע לך ברגע שיתפנה תור!`,
        [{ text: 'אישור' }]
      );
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      Alert.alert('שגיאה', 'שגיאה בהצטרפות לרשימת ההמתנה');
    }
  };

  const formatHebrewDate = (date: Date) => {
    const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayName = hebrewDays[date.getDay()];
    return `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
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
        {currentStep === 3 && (() => {
          console.log('🗓️ ENTERING DATE SELECTION - Current barberAvailability:', barberAvailability);
          return (
            <View style={styles.stepContent}>
              <View style={styles.calendarContainer}>
              {/* Calendar Top Header (black) */}
              <View style={styles.calendarTopBar}>
                <TouchableOpacity
                  accessibilityLabel="Previous Month"
                  onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  style={styles.topBarArrowLeft}
                >
                  <MirroredIcon name="chevron-back" size={22} color="#fff" type="ionicons" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>בחירת תאריך</Text>
                <TouchableOpacity
                  accessibilityLabel="Next Month"
                  onPress={() => {
                    console.log('📅 NAVIGATING TO NEXT MONTH');
                    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                  }}
                  style={styles.topBarArrowRight}
                >
                  <MirroredIcon name="chevron-back" size={22} color="#fff" type="ionicons" />
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

              {/* Calendar Grid (improved grid lines) */}
              <View style={styles.calendarGridWrapper}>
                <View style={styles.calendarGrid}>
                  {(() => {
                    const monthDays = getMonthDays(currentMonth);
                    const firstWeekday = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0=ראשון
                    const daysInMonth = monthDays.length;
                    const totalSlotsNeeded = firstWeekday + daysInMonth; // leading blanks + actual days
                    const weeks = Math.ceil(totalSlotsNeeded / 7); // number of rows actually needed
                    const totalSlots = weeks * 7; // ONLY required slots (no always-42 grid)

                    const cells: React.ReactNode[] = [];

                    for (let slot = 0; slot < totalSlots; slot++) {
                      const dayIndex = slot - firstWeekday; // index into monthDays
                      const isInsideMonth = dayIndex >= 0 && dayIndex < daysInMonth;

                      if (!isInsideMonth) {
                        cells.push(
                          <View
                            key={`blank-${slot}`}
                            style={[styles.calendarDayBlank, styles.calendarDayGridCell]}
                          />
                        );
                        continue;
                      }

                      const date = monthDays[dayIndex];
                      const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                      const isToday = dateStart === todayStart;
                      const isSelected = selectedDate?.getTime?.() === dateStart;
                      const dayState = getDayState(date, barberAvailability);
                      const { disabled, color } = dayState;

                      const dayStyles = [
                        styles.calendarDay,
                        styles.calendarDayGridCell,
                        isSelected && styles.calendarDaySelected,
                        isToday && !isSelected && styles.calendarDayToday,
                        color === 'red' && styles.calendarDayUnavailable,
                        color === 'grey' && styles.calendarDayOutOfRange,
                      ];
                      const textStyles = [
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isToday && !isSelected && styles.calendarDayTextToday,
                        color === 'red' && styles.calendarDayTextUnavailable,
                        color === 'grey' && styles.calendarDayTextOutOfRange,
                      ];

                      cells.push(
                        <TouchableOpacity
                          key={date.toISOString()}
                          style={dayStyles}
                          onPress={() => !disabled && handleDateSelect(date)}
                          disabled={disabled}
                        >
                          <Text style={textStyles}>{date.getDate()}</Text>
                        </TouchableOpacity>
                      );
                    }

                    return cells;
                  })()}
                </View>
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
          );
        })()}

        {/* Step 4: Select Time */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            {/* Show message when no times available */}
            {availableTimes.length === 0 && (
              <View style={styles.noTimesContainer}>
                <View style={styles.noTimesBox}>
                  <Text style={styles.noTimesEmoji}>😔</Text>
                  <Text style={styles.noTimesTitle}>נתפסו כל התורים!</Text>
                  <Text style={styles.noTimesMessage}>אין שעות פנויות ביום זה</Text>
                  <Text style={styles.noTimesSubtext}>נסה לבחור תאריך אחר</Text>
                </View>
              </View>
            )}

            {/* Time selection grid */}
            {availableTimes.length > 0 && (
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
            )}
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

      {/* Waitlist Modal */}
      <Modal
        visible={showWaitlistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWaitlistModal(false)}
      >
        <View style={styles.waitlistModalOverlay}>
          <View style={styles.waitlistModalContent}>
            <View style={styles.waitlistModalHeader}>
              <Text style={styles.waitlistModalTitle}>📋 רשימת המתנה</Text>
              <TouchableOpacity onPress={() => setShowWaitlistModal(false)} style={styles.closeButton}>
                <MirroredIcon name="close" size={24} color="#333" type="ionicons" />
              </TouchableOpacity>
            </View>

            <Text style={styles.waitlistModalSubtitle}>
              רשימת המתנה ליום {selectedDate && formatHebrewDate(selectedDate)}
            </Text>

            <View style={styles.waitlistTimeSection}>
              <Text style={styles.waitlistTimeLabel}>לאיזה שעה תעדיף?</Text>
              <Text style={styles.waitlistTimeSubtext}>אנא כתוב טווח שעות רצוי</Text>

              <View style={styles.timeRangeContainer}>
                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>שעת התחלה</Text>
                  <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                    {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOption,
                          waitlistStartTime === time && styles.timeOptionSelected
                        ]}
                        onPress={() => setWaitlistStartTime(time)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          waitlistStartTime === time && styles.timeOptionTextSelected
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timePickerContainer}>
                  <Text style={styles.timePickerLabel}>שעת סיום</Text>
                  <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                    {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.timeOption,
                          waitlistEndTime === time && styles.timeOptionSelected
                        ]}
                        onPress={() => setWaitlistEndTime(time)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          waitlistEndTime === time && styles.timeOptionTextSelected
                        ]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.selectedRangeDisplay}>
                <Text style={styles.selectedRangeText}>
                  טווח שעות מבוקש: {waitlistStartTime} - {waitlistEndTime}
                </Text>
              </View>
            </View>

            <View style={styles.waitlistModalActions}>
              <TouchableOpacity
                style={styles.waitlistSubmitButton}
                onPress={handleWaitlistSubmit}
              >
                <Text style={styles.waitlistSubmitButtonText}>הירשם לרשימת המתנה</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.waitlistCancelButton}
                onPress={() => setShowWaitlistModal(false)}
              >
                <Text style={styles.waitlistCancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  noTimesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noTimesBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#f8f9fa',
  },
  noTimesEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noTimesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  noTimesMessage: {
    fontSize: 18,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noTimesSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#fdfdfd',
    borderRadius: 24,
    paddingTop: 12,
    paddingBottom: 4, // even smaller
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 12, // closer to next content
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    marginBottom: 4, // tighter
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
  calendarGridWrapper: {
    borderWidth: 1,
    borderColor: '#d6dae1',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 0, // remove internal bottom gap
    backgroundColor: '#ffffff',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
  },
  calendarGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  calendarDayGridCell: {
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eef1f4',
  },
  calendarDayBlank: {
    width: '14.2857%',
    aspectRatio: 1,
    backgroundColor: '#f7f9fb',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eef1f4',
  },
  calendarDaySelected: {
    backgroundColor: '#2563eb',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1d4ed8',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.04 }],
  },
  calendarDayToday: {
    backgroundColor: '#e8f1ff',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#93c5fd',
  },
  calendarDayUnavailable: {
    backgroundColor: '#fecaca',
  },
  calendarDayOutOfRange: {
    backgroundColor: '#f1f5f9',
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  calendarDayTextUnavailable: {
    color: '#dc2626',
  },
  calendarDayTextOutOfRange: {
    color: '#94a3b8',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4, // reduced
    paddingTop: 4,
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
    marginTop: 8, // reduced
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
    left: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  topBarArrowLeft: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  // Waitlist Modal Styles
  waitlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitlistModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: width * 0.95,
    maxHeight: height * 0.85,
  },
  waitlistModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  waitlistModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  waitlistModalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  waitlistTimeSection: {
    marginBottom: 24,
  },
  waitlistTimeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitlistTimeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timePickerContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  timePickerScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: '#007bff',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  selectedRangeDisplay: {
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  selectedRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  waitlistModalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  waitlistSubmitButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitlistSubmitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitlistCancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitlistCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
});

export default BookingScreen;