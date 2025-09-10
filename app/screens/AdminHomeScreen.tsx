import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { checkIsAdmin, initializeCollections, initializeGalleryImages, listAllStorageImages, onAuthStateChange, replaceGalleryPlaceholders, resetGalleryWithRealImages, restoreGalleryFromStorage } from '../../services/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

interface AdminHomeScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminHomeScreen: React.FC<AdminHomeScreenProps> = ({ onNavigate, onBack }) => {
  const { t } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [aboutUsText, setAboutUsText] = useState('');
  const [aboutUsLoading, setAboutUsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
        const adminStatus = await checkIsAdmin(user.uid);
        console.log('👑 Admin status:', adminStatus);
        setIsAdmin(adminStatus);
        if (!adminStatus) {
          console.log('❌ Not admin, showing error toast');
          setToast({
            visible: true,
            message: t('admin.no_permission', { uid: user.uid }),
            type: 'error'
          });
          // Give user more time to see the UID and debug
          setTimeout(() => onNavigate('home'), 5000);
        } else {
          console.log('✅ Admin confirmed, can proceed');
        }
      } else {
        console.log('🚪 User not authenticated');
        onNavigate('home');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Load about text from DB
  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        const db = getFirestore();
        const docRef = doc(db, 'settings', 'aboutus');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAboutUsText(snap.data().text || '');
        }
      } catch (e) {
        showToast(t('admin.about_load_error'), 'error');
      } finally {
        setAboutUsLoading(false);
      }
    };
    fetchAboutUs();
  }, []);

  // Fetch next appointment only after user is authenticated
  useEffect(() => {
    console.log('🔄 useEffect for fetchNextAppointment:', { isAdmin, loading });
    if (isAdmin && !loading) {
      console.log('🚀 Calling fetchNextAppointment...');
      fetchNextAppointment();
    } else {
      console.log('⏸️ Not calling fetchNextAppointment:', { isAdmin, loading });
    }
  }, [isAdmin, loading]);

  // Fetch next appointment for the current user (admin sees all, barber sees only their own)
  const fetchNextAppointment = async () => {
    try {
      console.log('🔍 Fetching next appointment...', { isAdmin, loading });
      
      const db = getFirestore();
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      let appointmentsQuery;
      
      if (isAdmin) {
        console.log('👑 Admin: fetching all appointments');
        // Admin sees all appointments
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('date', '>=', today),
          orderBy('date', 'asc'),
          orderBy('time', 'asc'),
          limit(1)
        );
      } else {
        console.log('✂️ Barber: fetching own appointments');
        // Barber sees only their own appointments
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
        
        appointmentsQuery = query(
          collection(db, 'appointments'),
          where('barberId', '==', userData.barberId),
          where('date', '>=', today),
          orderBy('date', 'asc'),
          orderBy('time', 'asc'),
          limit(1)
        );
      }
      
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

  const handleInitializeGallery = async () => {
    try {
      showToast(t('admin.initializing_gallery'), 'success');
      await initializeGalleryImages();
      showToast(t('admin.gallery_initialized'), 'success');
    } catch (error) {
      console.error('Error initializing gallery:', error);
      showToast(t('admin.gallery_init_error'), 'error');
    }
  };

  const handleReplaceGallery = async () => {
    try {
      showToast(t('admin.replacing_images'), 'success');
      await replaceGalleryPlaceholders();
      showToast(t('admin.images_replaced'), 'success');
    } catch (error) {
      console.error('Error replacing gallery:', error);
      showToast(t('admin.image_replace_error'), 'error');
    }
  };

  const handleResetGallery = async () => {
    try {
      showToast(t('admin.resetting_gallery'), 'success');
      await resetGalleryWithRealImages();
      showToast(t('admin.gallery_reset'), 'success');
    } catch (error) {
      console.error('Error resetting gallery:', error);
      showToast(t('admin.gallery_reset_error'), 'error');
    }
  };

  const handleListStorage = async () => {
    try {
      showToast(t('admin.checking_storage'), 'success');
      await listAllStorageImages();
      showToast(t('admin.check_console'), 'success');
    } catch (error) {
      console.error('Error listing storage:', error);
      showToast(t('admin.storage_check_error'), 'error');
    }
  };

  const handleRestoreFromStorage = async () => {
    try {
      showToast(t('admin.restoring_images'), 'success');
      const count = await restoreGalleryFromStorage();
      showToast(t('admin.images_restored', { count }), 'success');
    } catch (error) {
      console.error('Error restoring from storage:', error);
      showToast(t('admin.restore_error'), 'error');
    }
  };

  const handleSaveAboutUs = async () => {
    setAboutUsLoading(true);
    try {
      const db = getFirestore();
      await setDoc(doc(db, 'settings', 'aboutus'), { text: aboutUsText });
      showToast(t('admin.text_saved'));
    } catch (e) {
      showToast(t('admin.text_save_error'), 'error');
    } finally {
      setAboutUsLoading(false);
    }
  };

  const adminMenuItems = [
    {
      title: t('admin.manage_appointments_title'),
      subtitle: t('admin.manage_appointments_subtitle'),
      icon: 'calendar',
      screen: 'admin-appointments',
      color: '#007bff'
    },
    {
      title: t('admin.manage_treatments_title'),
      subtitle: t('admin.manage_treatments_subtitle'),
      icon: 'cut',
      screen: 'admin-treatments',
      color: '#28a745'
    },
    {
      title: t('admin.manage_team_title'),
      subtitle: t('admin.manage_team_subtitle'),
      icon: 'people',
      screen: 'admin-team',
      color: '#ffc107'
    },
    {
      title: t('admin.manage_gallery_title'),
      subtitle: t('admin.manage_gallery_subtitle'),
      icon: 'images',
      screen: 'admin-gallery',
      color: '#dc3545'
    },
    {
      title: t('admin.availability_settings_title'),
      subtitle: t('admin.availability_settings_subtitle'),
      icon: 'time',
      screen: 'admin-availability',
      color: '#6f42c1'
    },
    {
      title: 'רשימת המתנה',
      subtitle: 'ניהול לקוחות שממתינים לתורים',
      icon: 'list',
      screen: 'admin-waitlist',
      color: '#e83e8c'
    },
    {
      title: t('admin.business_stats_title'),
      subtitle: t('admin.business_stats_subtitle'),
      icon: 'analytics',
      screen: 'admin-statistics',
      color: '#17a2b8'
    },
    {
      title: 'ניהול התראות',
      subtitle: 'הצג והפעל התראות מערכת',
      icon: 'notifications',
      screen: 'admin-notifications',
      color: '#6c757d'
    },
    {
      title: 'הגדרות התראות',
      subtitle: 'קבע אילו התראות תרצה לקבל',
      icon: 'notifications-outline',
      screen: 'admin-notification-settings',
      color: '#ff69b4'
    },
    {
      title: t('admin.admin_settings_title'),
      subtitle: t('admin.admin_settings_subtitle'),
      icon: 'settings',
      screen: 'admin-settings',
      color: '#fd7e14'
    },
    {
      title: t('admin.view_as_client_title'),
      subtitle: t('admin.view_as_client_subtitle'),
      icon: 'eye',
      screen: 'home',
      color: '#fd7e14'
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('admin.checking_permissions')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color="#dc3545" />
          <Text style={styles.errorText}>{t('admin.no_admin_permissions')}</Text>
          <Text style={styles.debugText}>UID: {currentUserId}</Text>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: '#28a745', marginBottom: 12 }]} 
            onPress={async () => {
              try {
                showToast('פונקציה לא זמינה כרגע', 'error');
              } catch (error) {
                showToast('שגיאה', 'error');
              }
            }}
          >
            <Text style={styles.backButtonText}>פונקציה לא זמינה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
            <Text style={styles.backButtonText}>{t('admin.back_to_home')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title={t('admin.admin_panel')}
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
              <Text style={styles.welcomeTitle}>{t('admin.welcome_title')}</Text>
              <Text style={styles.welcomeSubtitle}>{t('admin.welcome_subtitle')}</Text>
            </LinearGradient>
          </View>

          {/* System Status */}
          <View style={styles.systemSection}>
            <Text style={styles.systemTitle}>{t('admin.system_status')}</Text>
            <View style={styles.systemItem}>
              <View style={styles.systemInfo}>
                <Text style={styles.systemLabel}>Firestore Database</Text>
                <Text style={styles.systemStatus}>{t('admin.active')}</Text>
              </View>
              <View style={[styles.statusIndicator, styles.statusActive]} />
            </View>
            
            <TouchableOpacity 
              style={styles.initButton}
              onPress={handleInitializeGallery}
            >
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.init_gallery_dummy')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#dc3545', marginTop: 12 }]}
              onPress={handleReplaceGallery}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.replace_gray_images')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#28a745', marginTop: 12 }]}
              onPress={handleResetGallery}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.delete_all_create_new')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#6f42c1', marginTop: 12 }]}
              onPress={handleListStorage}
            >
              <Ionicons name="folder" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.check_firebase_storage')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.initButton, { backgroundColor: '#fd7e14', marginTop: 12 }]}
              onPress={handleRestoreFromStorage}
            >
              <Ionicons name="download" size={20} color="#fff" />
              <Text style={styles.initButtonText}>{t('admin.restore_my_images')}</Text>
            </TouchableOpacity>
          </View>

          {/* Edit about us text */}
          <View style={{margin: 16, backgroundColor: '#222', borderRadius: 12, padding: 16}}>
            <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 8}}>{t('admin.edit_about_text')}</Text>
            <TextInput
              value={aboutUsText}
              onChangeText={setAboutUsText}
              placeholder={t('admin.enter_about_text')}
              style={{backgroundColor: '#333', color: '#fff', borderRadius: 8, padding: 8, minHeight: 80, marginBottom: 8}}
              placeholderTextColor="#aaa"
              multiline
            />
            <TouchableOpacity style={{backgroundColor: '#007bff', borderRadius: 8, padding: 12, marginTop: 8}} onPress={handleSaveAboutUs} disabled={aboutUsLoading}>
              <Text style={{color: 'white', fontWeight: 'bold', textAlign: 'center'}}>{aboutUsLoading ? t('common.saving') : t('admin.save_text')}</Text>
            </TouchableOpacity>
          </View>

          {/* Admin Menu Grid */}
          <View style={styles.menuGrid}>
            {adminMenuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  console.log('🔍 Button pressed for screen:', item.screen);
                  console.log('🔍 onNavigate function:', typeof onNavigate);
                  
                  if (item.screen === 'home') {
                    showToast(t('admin.switching_to_client_view'));
                  } else if (item.screen === 'admin-notification-settings') {
                    showToast('פותח הגדרות התראות...');
                  } else {
                    showToast(t('admin.opening_screen', { title: item.title }));
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
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{t('admin.quick_stats')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>{t('admin.appointments_today')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>3</Text>
                <Text style={styles.statLabel}>{t('admin.active_barbers')}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>8</Text>
                <Text style={styles.statLabel}>{t('admin.treatments')}</Text>
              </View>
            </View>
          </View>

          {/* Initialize Collections Button */}
          <View style={styles.initSection}>
            <TouchableOpacity
              style={styles.initButton}
              onPress={async () => {
                try {
                  await initializeCollections();
                  showToast('Collections initialized successfully!');
                } catch (error) {
                  showToast('Error initializing collections', 'error');
                }
              }}
            >
              <Text style={styles.initButtonText}>Initialize Database Collections</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Next Appointment Bubble */}
      {(() => {
        console.log('🎯 Rendering bubble section:', { nextAppointment, isAdmin, loading });
        return null;
      })()}
      {nextAppointment && (
        <TouchableOpacity 
          style={styles.nextAppointmentBubble}
          onPress={() => setShowNextAppointmentModal(true)}
        >
          <LinearGradient
            colors={['#FF00AA', '#1d4ed8']}
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
                <Ionicons name="person" size={24} color="#FF00AA" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>לקוח:</Text>
                  <Text style={styles.nextAppointmentValue}>{nextAppointment.clientName}</Text>
                </View>
              </View>
              
              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="call" size={24} color="#FF00AA" />
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
                    <Ionicons name="call" size={16} color="#FF00AA" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="calendar" size={24} color="#FF00AA" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>תאריך:</Text>
                  <Text style={styles.nextAppointmentValue}>
                    {(() => {
                      try {
                        // Handle both date strings (YYYY-MM-DD) and date objects
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
                <Ionicons name="time" size={24} color="#FF00AA" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>שעה:</Text>
                  <Text style={styles.nextAppointmentValue}>{nextAppointment.time}</Text>
                </View>
              </View>
              
              <View style={styles.nextAppointmentInfo}>
                <Ionicons name="cut" size={24} color="#FF00AA" />
                <View style={styles.nextAppointmentInfoText}>
                  <Text style={styles.nextAppointmentLabel}>ספר:</Text>
                  <Text style={styles.nextAppointmentValue}>{nextAppointment.barberName}</Text>
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
    flexDirection: 'row',
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
    marginRight: 16,
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
  initSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  systemSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  systemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
    textAlign: 'right',
  },
  systemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  systemInfo: {
    flex: 1,
  },
  systemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  systemStatus: {
    fontSize: 14,
    color: '#28a745',
    textAlign: 'right',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#28a745',
  },
  // Next Appointment Bubble Styles
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
    marginLeft: 8,
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
    marginLeft: 12,
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
    backgroundColor: 'rgba(255, 0, 170, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF00AA',
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
    marginLeft: 8,
  },
});

export default AdminHomeScreen;