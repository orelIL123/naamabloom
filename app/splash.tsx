import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    let authUnsubscribe: (() => void) | null = null;
    let navigationTimeout: NodeJS.Timeout;

    const handleNavigation = () => {
      if (hasNavigated) {
        console.log('Navigation already handled, skipping...');
        return;
      }
      
      console.log('Handling navigation...');
      setHasNavigated(true);
      
      // Clean up auth listener
      if (authUnsubscribe) {
        authUnsubscribe();
      }
      
      // Navigate to main app
      try {
        // Add small delay to ensure app is ready
        setTimeout(() => {
          router.replace('/(tabs)');
          console.log('Navigation successful');
        }, 100);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    // Set up auth state listener with enhanced error handling
    const initializeAuth = async () => {
      try {
        // Dynamically import Firebase to avoid startup crashes
        const firebaseModule = await import('../config/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');

        const { waitForFirebaseReady, getAuthInstance } = firebaseModule;
        
        // Wait for Firebase to be ready before setting up auth listener
        const isReady = await waitForFirebaseReady(4000); // 4 second timeout for this splash
        
        if (isReady) {
          const auth = getAuthInstance();
          if (auth) {
            // Set up the listener.
            authUnsubscribe = onAuthStateChanged(auth, (user) => {
              // This function will be called when the auth state is determined.
              // It will be called with a user object if signed in, or null if not.
              // In either case, we are ready to navigate away from the splash.
              console.log('✅ Auth state determined, navigating.');
              handleNavigation();
            }, (error) => {
              // This is an error handler for the listener itself.
              console.error('❌ Auth state listener error:', error);
              handleNavigation(); // Navigate away even if there's an error.
            });
            console.log('✅ Auth listener set up successfully');
          } else {
            console.warn('⚠️ Auth instance not available, navigating anyway');
            handleNavigation();
          }
        } else {
          console.warn('⚠️ Firebase not ready within timeout, navigating anyway');
          handleNavigation();
        }
      } catch (error) {
        console.error('❌ Failed to import or set up auth listener:', error);
        // If we can't even set up the listener, navigate away.
        handleNavigation();
      }
    };

    // Start auth check after splash animation
    const splashTimer = setTimeout(() => {
      initializeAuth();
      
      // Failsafe: navigate after 4 seconds only if auth is taking too long
      navigationTimeout = setTimeout(() => {
        if (!hasNavigated) {
          console.warn('Navigation timeout - proceeding anyway');
          handleNavigation();
        }
      }, 4000);
    }, 2000);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(navigationTimeout);
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [router, hasNavigated]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/images/splash.png')}
        style={[styles.splashImage, { opacity: fadeAnim }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});