// Temporarily disable polyfills to test if they cause the crash
// import '../polyfills';

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

// Temporarily disable polyfills initialization
// initializePolyfills();

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
import 'nativewind';
import 'react-native-reanimated';
// Temporarily disable globals.css to test if it causes the crash
// import '../app/globals.css';
import ErrorBoundary from './components/ErrorBoundary';
// Temporarily disable crash handler to test if it causes the crash
// import { installGlobalErrorHandling } from './utils/crashHandler';

// Initialize global error handling exactly once, before any rendering/navigation
// installGlobalErrorHandling();

// Import Firebase to initialize it.
import './config/firebase';

import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { cleanupOldNotifications } from '../services/firebase';

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
  
  // Clean up old notifications on app start
  useEffect(() => {
    const cleanupNotifications = async () => {
      try {
        await cleanupOldNotifications();
        console.log('✅ Old notifications cleaned up');
      } catch (error) {
        console.error('Error cleaning up old notifications:', error);
      }
    };
    
    cleanupNotifications();
  }, []);
        console.warn('⏰ Font loading timeout after 5 seconds, proceeding with system fonts');
        setFontLoadTimeout(true);
      }
    }, 5000);
    
    if (loaded || error) {
      clearTimeout(timeout);
    }
    
    return () => clearTimeout(timeout);
  }, [loaded, error]);

  useEffect(() => {
    if (loaded || fontLoadTimeout) {
      SplashScreen.hideAsync();
    }
  }, [loaded, fontLoadTimeout]);

  // Show loading screen while fonts are loading, but don't wait forever
  if (!loaded && !error && !fontLoadTimeout) {
    console.log('Fonts loading...', { loaded, error });
    return null;
  }

  // If there's a font loading error, log it but continue
  if (error && !fontLoadTimeout) {
    console.error('Font loading error:', error);
    // Continue rendering with system fonts
  }

  return (
    <ErrorBoundary>
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
      </Stack>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}
