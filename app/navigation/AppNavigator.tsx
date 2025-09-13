import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { auth } from '../config/firebase';
import AdminAppointmentsScreen from '../screens/AdminAppointmentsScreen';
import AdminAvailabilityScreen from '../screens/AdminAvailabilityScreen';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import AdminNotificationSettingsScreen from '../screens/AdminNotificationSettingsScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminStatisticsScreen from '../screens/AdminStatisticsScreen';
import AdminTeamScreen from '../screens/AdminTeamScreen';
import AdminTreatmentsScreen from '../screens/AdminTreatmentsScreen';
import AdminWaitlistScreen from '../screens/AdminWaitlistScreen';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';
import AuthPhoneScreen from '../screens/AuthPhoneScreen';
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
  | 'admin-treatments'
  | 'admin-gallery'
  | 'admin-availability'
  | 'admin-settings'
  | 'admin-statistics'
  | 'admin-notifications'
  | 'admin-notification-settings'
  | 'admin-waitlist';

export default function AppNavigator() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // Check if user is admin
        if (user.email === 'orel895@gmail.com') {
          setCurrentScreen('admin-home');
        } else {
          setCurrentScreen('home');
        }
      } else {
        // Guest mode - go directly to home
        setCurrentScreen('home');
      }
    });

    return unsubscribe;
  }, []);

  const navigate = (screen: string) => {
    console.log('🧭 Navigate called with screen:', screen);
    console.log('🧭 Current screen before change:', currentScreen);
    setCurrentScreen(screen as Screen);
    console.log('🧭 Screen set to:', screen);
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
          <Text style={styles.loadingText}>Test Salon</Text>
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
      return <TermsScreen onNavigate={navigate} />;
    
    // Admin screens
    case 'admin-home':
      return <AdminHomeScreen onNavigate={navigate} />;
    
    case 'admin-appointments':
      return <AdminAppointmentsScreen onNavigate={navigate} />;
    
    case 'admin-team':
      return <AdminTeamScreen onNavigate={navigate} />;
    
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
    
    case 'admin-notification-settings':
      return <AdminNotificationSettingsScreen onNavigate={navigate} onBack={() => navigate('admin-home')} />;
    
    case 'admin-waitlist':
      return <AdminWaitlistScreen onNavigate={navigate} />;
    
    default:
      console.log('❌ Unknown screen requested:', currentScreen);
      console.log('❌ Available screens:', ['admin-home', 'admin-notification-settings', 'admin-appointments', 'admin-team', 'admin-treatments', 'admin-gallery', 'admin-availability', 'admin-settings', 'admin-statistics', 'admin-notifications', 'admin-waitlist']);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>מסך לא נמצא: {currentScreen}</Text>
          <Text style={styles.errorText}>Available: admin-notification-settings</Text>
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