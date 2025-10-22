// Import polyfills first - critical for Android/Hermes
import '../polyfills';

// Robust polyfills for Hermes with better error handling
function initializePolyfills() {
  try {
    // Check if Intl is available
    if (typeof Intl === 'undefined') {
      console.warn('Intl not available, loading polyfills...');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@formatjs/intl-locale/polyfill');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@formatjs/intl-pluralrules/polyfill');
      console.log('Intl polyfills loaded successfully');
    } else if (!('PluralRules' in Intl)) {
      console.warn('PluralRules not available, loading polyfill...');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@formatjs/intl-pluralrules/polyfill');
      console.log('PluralRules polyfill loaded successfully');
    }
  } catch (error) {
    console.error('Failed to load polyfills:', error);
    // Don't crash the app if polyfills fail - continue with degraded i18n
  }
}

// RTL is handled manually in styles - no I18nManager needed

// Initialize polyfills for Intl support
initializePolyfills();

import {
  Heebo_300Light,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
  Heebo_900Black,
} from '@expo-google-fonts/heebo';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import 'nativewind';
import 'react-native-reanimated';
import '../app/globals.css';
import AppAuthGate from './components/AppAuthGate';
import ErrorBoundary from './components/ErrorBoundary';
import { installGlobalErrorHandling } from './utils/crashHandler';

// Initialize global error handling exactly once, before any rendering/navigation
installGlobalErrorHandling();

// Import Firebase to initialize it.
import './config/firebase';

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, useColorScheme, View } from 'react-native';
import { schedulePeriodicCleanup } from '../services/dataCleanup';
import { cleanupOldNotifications } from '../services/firebase';
import { initializeNotificationManager, registerPushTokenForUser } from '../services/notificationManager';
import { auth, checkIsAdmin } from './config/firebase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Heebo_300Light,
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    Heebo_900Black,
    // Aliases for the font names used in the app
    'Heebo': Heebo_400Regular,
    'Heebo-Regular': Heebo_400Regular,
    'Heebo-Medium': Heebo_500Medium,
    'Heebo-Bold': Heebo_700Bold,
    'Heebo-Light': Heebo_300Light,
  });
  
  const [fontLoadTimeout, setFontLoadTimeout] = useState(false);

  // RTL is handled manually in styles - no I18nManager needed
  useEffect(() => {
    console.log('🔧 RTL handled manually in styles');
  }, []);

  // Log font loading status with detailed info
  useEffect(() => {
    if (loaded) {
      console.log('✅ All fonts loaded successfully:', {
        heebo: 'Heebo family loaded',
        spaceMono: 'SpaceMono loaded'
      });
    } else if (error) {
      console.error('❌ Font loading error:', error);
      console.warn('App will continue with system fonts as fallback');
    }
  }, [loaded, error]);
  
  // Font loading timeout - don't wait more than 5 seconds for fonts
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded && !error) {
        console.warn('⏰ Font loading timeout after 5 seconds, proceeding with system fonts');
        setFontLoadTimeout(true);
      }
    }, 5000);

    if (loaded || error) {
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [loaded, error]);

  // Initialize notification manager on app start
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Initialize notification manager (permissions, channels, handlers)
        await initializeNotificationManager();
        console.log('✅ Notification manager initialized');

        // Clean up old notifications
        await cleanupOldNotifications();
        console.log('✅ Old notifications cleaned up');
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, []);

  // Get router instance at component level (not inside useEffect)
  const router = useRouter();

  // Auth-aware notification handling
  useEffect(() => {
    // Helper to check if user is authenticated
    const isAuthenticated = () => {
      return auth.currentUser !== null;
    };

    // Handle notification tapped
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 Notification tapped:', response);

      const data = response.notification.request.content.data as any;

      // Check authentication state
      if (!isAuthenticated()) {
        console.log('❌ User not authenticated, redirecting to login');
        router.replace('/screens/AuthChoiceScreen');
        return;
      }

      // User is logged in - handle navigation based on notification data
      console.log('✅ User authenticated, handling notification navigation');

      if (data?.type === 'appointment_reminder' && data?.appointmentId) {
        // Navigate to appointments screen
        console.log('Navigating to appointment:', data.appointmentId);
        router.push('/(tabs)');
      } else if (data?.appointmentId) {
        // Legacy notification format
        router.push('/(tabs)');
      } else {
        // Default navigation
        router.push('/(tabs)');
      }
    });

    // Handle notification received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received (foreground):', notification);
    });

    // Cleanup
    return () => {
      Notifications.removeNotificationSubscription(responseListener);
      Notifications.removeNotificationSubscription(notificationListener);
    };
  }, [router]);

  // Register push token when user logs in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      if (user) {
        console.log('👤 User logged in, registering push token...');
        try {
          await registerPushTokenForUser(user.uid);
          console.log('✅ Push token registered');
          
          // Check if user is admin and schedule cleanup
          const isAdmin = await checkIsAdmin(user.uid);
          if (isAdmin) {
            console.log('👑 Admin user detected, scheduling data cleanup...');
            schedulePeriodicCleanup(true);
          }
        } catch (error) {
          console.error('❌ Error registering push token:', error);
        }
      } else {
        console.log('👤 User logged out');
      }
    });

    return unsubscribe;
  }, []);

  // Check for EAS Updates on app start and periodically
  useEffect(() => {
    const checkForUpdates = async (silent = false) => {
      try {
        if (!__DEV__ && Updates.isEnabled) {
          if (!silent) {
            console.log('🔍 Checking for updates...');
          }

          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            console.log('🔄 Update available!');
            if (!silent) {
              Alert.alert(
                'עדכון זמין',
                'יש עדכון חדש לאפליקציה. האם ברצונך להוריד אותו עכשיו?',
                [
                  {
                    text: 'לא עכשיו',
                    style: 'cancel',
                  },
                  {
                    text: 'עדכן',
                    onPress: async () => {
                      try {
                        console.log('🔄 Downloading update...');
                        await Updates.fetchUpdateAsync();
                        console.log('✅ Update downloaded, restarting app...');
                        await Updates.reloadAsync();
                      } catch (error) {
                        console.error('Error updating app:', error);
                        Alert.alert('שגיאה', 'שגיאה בעדכון האפליקציה. נסה שוב מאוחר יותר.');
                      }
                    },
                  },
                ]
              );
            } else {
              // Silent update for background checks
              console.log('🔄 Silent update available, downloading...');
              await Updates.fetchUpdateAsync();
              console.log('✅ Silent update downloaded, restarting app...');
              await Updates.reloadAsync();
            }
          } else {
            if (!silent) {
              console.log('✅ App is up to date');
            }
          }
        } else if (__DEV__) {
          console.log('🔧 Development mode - skipping update check');
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
        // Don't show error to user, just log it
      }
    };

    // Check immediately on app start (with small delay to ensure app is ready)
    setTimeout(() => {
      checkForUpdates();
    }, 2000);

    // Set up periodic checks every 2 minutes (120000ms) for more frequent updates
    const updateInterval = setInterval(() => {
      console.log('⏰ Periodic update check...');
      checkForUpdates(true); // Silent check
    }, 120000);

    // Also check when app comes to foreground
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, checking for updates...');
        // Add small delay to ensure app is fully active
        setTimeout(() => {
          checkForUpdates(true); // Silent check
        }, 1000);
      }
    };

    // Add app state listener for React Native
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Add web visibility change listener if available
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🌐 Web app became visible, checking for updates...');
        // Add small delay to ensure app is fully active
        setTimeout(() => {
          checkForUpdates(true); // Silent check
        }, 1000);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(updateInterval);
      appStateSubscription?.remove();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  useEffect(() => {
    if (loaded || fontLoadTimeout) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontLoadTimeout]);

  // Show loading screen while fonts are loading, but don't wait forever
  if (!loaded && !error && !fontLoadTimeout) {
    console.log('Loading fonts...', { loaded, error, fontLoadTimeout });
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If there's a font loading error, log it but continue
  if (error && !fontLoadTimeout) {
    console.error('Font loading error:', error);
    // Continue rendering with system fonts
  }

  return (
    <ErrorBoundary>
      <AppAuthGate>
        <Stack screenOptions={{ 
          headerShown: false,
        }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="splash-simple" />
          <Stack.Screen 
            name="(tabs)" 
            options={{
              // Add error boundary specific to tabs if needed
              presentation: 'card'
            }}
          />
          {/* Admin routes */}
          <Stack.Screen name="admin-home" />
          <Stack.Screen name="admin-appointments" />
          <Stack.Screen name="admin-availability" />
          <Stack.Screen name="admin-gallery" />
          <Stack.Screen name="admin-notifications" />
          <Stack.Screen name="admin-settings" />
          <Stack.Screen name="admin-statistics" />
          <Stack.Screen name="admin-team" />
          <Stack.Screen name="admin-treatments" />
          <Stack.Screen name="admin-waitlist" />
          <Stack.Screen name="calendar" />
        </Stack>
        <StatusBar style="auto" />
      </AppAuthGate>
    </ErrorBoundary>
  );
}
