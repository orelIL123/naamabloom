import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { auth, checkIsAdmin } from '../config/firebase';
import AdminAppointmentsScreen from '../screens/AdminAppointmentsScreen';
import AdminAvailabilityScreen from '../screens/AdminAvailabilityScreen';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminNotificationSettingsScreen from '../screens/AdminNotificationSettingsScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminStatisticsScreen from '../screens/AdminStatisticsScreen';
import AdminCustomersScreen from '../screens/AdminCustomersScreen';
import AdminTeamScreen from '../screens/AdminTeamScreen';
import AdminTreatmentsScreen from '../screens/AdminTreatmentsScreen';
import AdminWaitlistScreen from '../screens/AdminWaitlistScreen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';
import AuthPhoneScreen from '../screens/AuthPhoneScreen';
import BarberHomeScreen from '../screens/BarberHomeScreen';
import BarberNotificationSettingsScreen from '../screens/BarberNotificationSettingsScreen';
import BookingScreen from '../screens/BookingScreen';
import HomeScreen from '../screens/HomeScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
// SplashScreen is now handled by Expo Router in app/splash.tsx
import TeamScreen from '../screens/TeamScreen';
import TermsScreen from '../screens/TermsScreen';

type Screen =
  | 'splash'
  | 'auth'
  | 'login'
  | 'register'
  | 'home'
  | 'booking'
  | 'team'
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'terms'
  | 'admin-home'
  | 'admin-appointments'
  | 'admin-team'
  | 'admin-customers'
  | 'admin-treatments'
  | 'admin-gallery'
  | 'admin-availability'
  | 'admin-settings'
  | 'admin-statistics'
  | 'admin-notifications'
  | 'admin-notification-settings'
  | 'admin-waitlist'
  | 'barber-home'
  | 'barber-notification-settings';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentScreenRef = useRef<Screen>('splash');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔄 Auth state changed, user:', user?.uid);
      console.log('🔄 Current screen ref:', currentScreenRef.current);
      setUser(user);
      
      if (user) {
        // Check if user is admin or barber using proper function
        try {
          const isAdmin = await checkIsAdmin(user.uid);
          console.log('🔄 Is admin:', isAdmin);

          // Check user role from Firestore
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userRole = userDoc.exists() ? userDoc.data()?.role : null;
          console.log('🔄 User role:', userRole);

          if (isAdmin) {
            // Admin user - go to admin-home
            if (currentScreenRef.current === 'splash') {
              console.log('🔄 Setting to admin-home from splash');
              setCurrentScreen('admin-home');
              currentScreenRef.current = 'admin-home';
            } else {
              console.log('🔄 Not in splash, keeping current screen:', currentScreenRef.current);
            }
          } else if (userRole === 'barber') {
            // Barber user - go to barber-home
            if (currentScreenRef.current === 'splash') {
              console.log('🔄 Setting to barber-home from splash');
              setCurrentScreen('barber-home');
              currentScreenRef.current = 'barber-home';
            } else {
              console.log('🔄 Not in splash, keeping current screen:', currentScreenRef.current);
            }
          } else {
            // Regular user - go to home
            if (currentScreenRef.current === 'splash') {
              console.log('🔄 Setting to home from splash');
              setCurrentScreen('home');
              currentScreenRef.current = 'home';
            } else {
              console.log('🔄 Not in splash, keeping current screen:', currentScreenRef.current);
            }
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          // Fallback to normal user flow
          if (currentScreenRef.current === 'splash') {
            console.log('🔄 Error fallback to home from splash');
            setCurrentScreen('home');
            currentScreenRef.current = 'home';
          } else {
            console.log('🔄 Error fallback, keeping current screen:', currentScreenRef.current);
          }
        }
      } else {
        // Guest mode - go directly to home
        if (currentScreenRef.current === 'splash') {
          console.log('🔄 No user, setting to home from splash');
          setCurrentScreen('home');
          currentScreenRef.current = 'home';
        } else {
          console.log('🔄 No user, keeping current screen:', currentScreenRef.current);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const navigate = (screen: Screen | string) => {
    console.log('🚀 AppNavigator navigate called with:', screen);
    console.log('🚀 Current screen before change:', currentScreenRef.current);
    console.log('🚀 Screen type:', typeof screen);
    console.log('🚀 Screen value:', screen);
    setCurrentScreen(screen as Screen);
    currentScreenRef.current = screen as Screen;
    console.log('🚀 Screen set to:', screen);
    console.log('🚀 Current screen after change:', currentScreenRef.current);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  switch (currentScreen) {
    case 'splash':
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Barbers Bar</Text>
        </View>
      );
    
    case 'auth':
      return <AuthChoiceScreen />;
    
    case 'login':
      return <AuthPhoneScreen />;
    
    case 'register':
      return <AuthPhoneScreen />;
    
    case 'home':
      return <HomeScreen onNavigate={navigate} />;
    
    case 'booking':
      return <BookingScreen onNavigate={navigate} />;
    
    case 'team':
      return <TeamScreen onNavigate={navigate} />;
    
    case 'profile':
      return <ProfileScreen onNavigate={navigate} />;
    
    case 'settings':
      return <SettingsScreen onNavigate={navigate} />;
    
    case 'notifications':
      return <NotificationsScreen onNavigate={navigate} />;
    
    case 'terms':
      return <TermsScreen />;
    
    // Admin screens
    case 'admin-home':
      return <AdminHomeScreen onNavigate={navigate} />;

    // Barber screens
    case 'barber-home':
      return <BarberHomeScreen onNavigate={navigate} />;

    case 'admin-appointments':
      return <AdminAppointmentsScreen onNavigate={navigate} />;
    
    case 'admin-team':
      return <AdminTeamScreen onNavigate={navigate} />;

    case 'admin-customers':
      return <AdminCustomersScreen onNavigate={navigate} />;

    case 'admin-treatments':
      return <AdminTreatmentsScreen onNavigate={navigate} />;
    
    case 'admin-gallery':
      return <AdminGalleryScreen onNavigate={navigate} />;
    
    case 'admin-availability':
      return <AdminAvailabilityScreen onNavigate={navigate} />;
    
    case 'admin-settings':
      return <AdminSettingsScreen onNavigate={navigate} />;
    
    case 'admin-statistics':
      return <AdminStatisticsScreen onNavigate={navigate} />;
    
    case 'admin-notifications':
      return <AdminNotificationsScreen onNavigate={navigate} />;
    
    case 'admin-waitlist':
      return <AdminWaitlistScreen onNavigate={navigate} />;
    
    case 'admin-notification-settings':
      return <AdminNotificationSettingsScreen onNavigate={navigate} />;
    
    case 'barber-notification-settings':
      return <BarberNotificationSettingsScreen onNavigate={navigate} />;
    
    default:
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>מסך לא נמצא</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});