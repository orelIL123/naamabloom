import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { checkIsAdmin, onAuthStateChange } from '../../services/firebase';
import { MirroredIcon } from '../components/MirroredIcon';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

interface BarberHomeScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const BarberHomeScreen: React.FC<BarberHomeScreenProps> = ({ onNavigate, onBack }) => {
  const { t } = useTranslation();
  const [isBarber, setIsBarber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [barberName, setBarberName] = useState('ספר');
  const [nextAppointment, setNextAppointment] = useState<{
    id: string;
    clientName: string;
    clientPhone: string;
    date: string;
    time: string;
    barberName: string;
  } | null>(null);
  const [showNextAppointmentModal, setShowNextAppointmentModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        console.log('🔐 User authenticated:', user.uid);
        setCurrentUserId(user.uid);

        // Check if user is a barber
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userIsBarber = userData.role === 'barber';
          setIsBarber(userIsBarber);

          // Get barber name
          if (userIsBarber && userData.barberId) {
            const barberDoc = await getDoc(doc(db, 'barbers', userData.barberId));
            if (barberDoc.exists()) {
              setBarberName(barberDoc.data().name || 'ספר');
            }
          }

          if (!userIsBarber) {
            console.log('❌ Not barber, showing error toast');
            setToast({
              visible: true,
              message: 'אין לך הרשאות ספר',
              type: 'error'
            });
          } else {
            console.log('✅ Barber confirmed, can proceed');
          }
        }
      } else {
        console.log('🚪 User not authenticated');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch next appointment for the barber
  useEffect(() => {
    console.log('🔄 useEffect for fetchNextAppointment:', { isBarber, loading });
    if (isBarber && !loading) {
      console.log('🚀 Calling fetchNextAppointment...');
      fetchNextAppointment();
    } else {
      console.log('⏸️ Not calling fetchNextAppointment:', { isBarber, loading });
    }
  }, [isBarber, loading]);

  const fetchNextAppointment = async () => {
    try {
      console.log('🔍 Fetching next appointment for barber...');

      const db = getFirestore();
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('❌ No current user');
        return;
      }

      // Get user's barberId
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        console.log('❌ User document not found');
        return;
      }

      const userData = userDoc.data();
      if (!userData.barberId) {
        console.log('❌ No barberId for user');
        return;
      }

      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('barberId', '==', userData.barberId),
        where('date', '>=', today),
        orderBy('date', 'asc'),
        orderBy('time', 'asc'),
        limit(1)
      );

      console.log('📅 Executing appointments query...');
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      console.log('📊 Found appointments:', appointmentsSnapshot.size);

      if (!appointmentsSnapshot.empty) {
        const appointmentData = appointmentsSnapshot.docs[0].data();
        const appointmentId = appointmentsSnapshot.docs[0].id;

        // Get barber name
        let barberName = 'ספר';
        if (appointmentData.barberId) {
          const barberDoc = await getDoc(doc(db, 'barbers', appointmentData.barberId));
          if (barberDoc.exists()) {
            barberName = barberDoc.data().name || 'ספר';
          }
        }

        const nextAppt = {
          id: appointmentId,
          clientName: appointmentData.clientName || 'לקוח',
          clientPhone: appointmentData.clientPhone || '',
          date: appointmentData.date || '',
          time: appointmentData.time || '',
          barberName: barberName
        };

        console.log('✅ Setting next appointment:', nextAppt);
        setNextAppointment(nextAppt);
      } else {
        console.log('📭 No appointments found');
        setNextAppointment(null);
      }
    } catch (error) {
      console.error('❌ Error fetching next appointment:', error);
      setNextAppointment(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  // Barber menu items - only what barbers need
  const barberMenuItems = [
    {
      title: 'ניהול תורים',
      subtitle: 'צפייה וניהול התורים שלי',
      icon: 'calendar',
      screen: 'admin-appointments',
      color: '#007bff'
    },
    {
      title: 'יומן',
      subtitle: 'צפייה ביומן התורים שלי',
      icon: 'calendar-outline',
      screen: 'calendar',
      color: '#6366f1'
    },
    {
      title: 'ניהול טיפולים',
      subtitle: 'הטיפולים שאני מבצע',
      icon: 'cut',
      screen: 'admin-treatments',
      color: '#28a745'
    },
    {
      title: 'הגדרות זמינות',
      subtitle: 'קביעת שעות העבודה שלי',
      icon: 'time',
      screen: 'admin-availability',
      color: '#6f42c1'
    },
    {
      title: 'רשימת המתנה',
      subtitle: 'לקוחות שממתינים אלי',
      icon: 'list',
      screen: 'admin-waitlist',
      color: '#e83e8c'
    },
    {
      title: 'סטטיסטיקות',
      subtitle: 'הנתונים והביצועים שלי',
      icon: 'analytics',
      screen: 'admin-statistics',
      color: '#17a2b8'
    },
    {
      title: 'צפייה כלקוח',
      subtitle: 'חזור לתצוגת לקוח',
      icon: 'eye',
      screen: 'home',
      color: '#fd7e14'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>בודק הרשאות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isBarber) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#dc3545" />
          <Text style={styles.errorText}>אין לך הרשאות ספר</Text>
          <Text style={styles.debugText}>UID: {currentUserId}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Text style={styles.backButtonText}>חזור לדף הבית</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav
        title="פאנל ניהול ספר"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('home'))}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Welcome Header */}
          <View style={styles.welcomeSection}>
            <LinearGradient
              colors={['#000000', '#333333']}
              style={styles.welcomeGradient}
            >
              <Text style={styles.welcomeTitle}>שלום {barberName}! 👋</Text>
              <Text style={styles.welcomeSubtitle}>ברוך הבא לפאנל הניהול שלך</Text>
            </LinearGradient>
          </View>

          {/* Barber Menu Grid */}
          <View style={styles.menuGrid}>
            {barberMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  console.log('🔍 Button pressed for screen:', item.screen);

                  if (item.screen === 'home') {
                    showToast('עובר לתצוגת לקוח');
                  } else {
                    showToast(`פותח ${item.title}`);
                  }

                  console.log('🚀 Calling onNavigate with:', item.screen);
                  onNavigate(item.screen);
                  console.log('✅ onNavigate called successfully');
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={28} color="#fff" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <MirroredIcon name="chevron-back" size={20} color="#999" type="ionicons" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>סטטיסטיקות מהירות</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>תורים היום</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>תורים השבוע</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>-</Text>
                <Text style={styles.statLabel}>המתנה</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Next Appointment Bubble */}
      {nextAppointment && (
        <TouchableOpacity
          style={styles.nextAppointmentBubble}
          onPress={() => setShowNextAppointmentModal(true)}
        >
          <LinearGradient
            colors={['#3b82f6', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextAppointmentBubbleGradient}
          >
            <Ionicons name="time" size={20} color="#fff" />
            <Text style={styles.nextAppointmentBubbleText}>התור הבא</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Next Appointment Modal */}
      {showNextAppointmentModal && nextAppointment && (
        <View style={styles.modalOverlay}>
          <View style={styles.nextAppointmentModal}>
            <View style={styles.nextAppointmentModalHeader}>
              <Text style={styles.nextAppointmentModalTitle}>התור הקרוב ביותר</Text>
              <TouchableOpacity
                onPress={() => setShowNextAppointmentModal(false)}
                style={styles.nextAppointmentModalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.nextAppointmentModalContent}>
              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="person" size={24} color="#3b82f6" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>לקוח:</Text>
                  <Text style={styles.nextAppointmentValue}>{nextAppointment.clientName}</Text>
                </View>
              </View>

              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="call" size={24} color="#3b82f6" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>טלפון:</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (nextAppointment.clientPhone) {
                        Linking.openURL(`tel:${nextAppointment.clientPhone}`);
                      }
                    }}
                    style={styles.phoneButton}
                  >
                    <Text style={styles.nextAppointmentValue}>{nextAppointment.clientPhone}</Text>
                    <Ionicons name="call" size={16} color="#3b82f6" style={{ marginRight: 8 }} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="calendar" size={24} color="#3b82f6" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>תאריך:</Text>
                  <Text style={styles.nextAppointmentValue}>
                    {(() => {
                      try {
                        const appointmentDate = typeof nextAppointment.date === 'string'
                          ? new Date(nextAppointment.date + 'T00:00:00')
                          : new Date(nextAppointment.date);

                        return appointmentDate.toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        });
                      } catch (error) {
                        return nextAppointment.date.toString();
                      }
                    })()}
                  </Text>
                </View>
              </View>

              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="time" size={24} color="#3b82f6" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>שעה:</Text>
                  <Text style={styles.nextAppointmentValue}>{nextAppointment.time}</Text>
                </View>
              </View>
            </View>

            {/* Call Button */}
            <View style={styles.nextAppointmentModalActions}>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  if (nextAppointment.clientPhone) {
                    Linking.openURL(`tel:${nextAppointment.clientPhone}`);
                  }
                }}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.callButtonText}>התקשר ללקוח</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#dc3545',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  backButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 100,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  menuGrid: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
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
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  nextAppointmentBubble: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextAppointmentBubbleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
  },
  nextAppointmentBubbleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
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
    zIndex: 1000,
  },
  nextAppointmentModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 20,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  nextAppointmentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  nextAppointmentModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  nextAppointmentModalCloseButton: {
    padding: 5,
  },
  nextAppointmentModalContent: {
    padding: 20,
  },
  nextAppointmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextAppointmentInfoText: {
    flex: 1,
    marginRight: 12,
  },
  nextAppointmentLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  nextAppointmentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  nextAppointmentModalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  callButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

export default BarberHomeScreen;
