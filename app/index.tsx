import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

// Preview mode detection
const isPreviewMode = Platform.OS === 'web' && __DEV__;

// Function to check for updates
const checkForUpdates = async () => {
  try {
    console.log('🔄 Checking for updates...');
    
    if (!Updates.isEnabled) {
      console.log('❌ Updates not enabled');
      return;
    }

    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('✅ Update available! Downloading...');
      const downloadResult = await Updates.fetchUpdateAsync();
      
      if (downloadResult.isNew) {
        console.log('🎉 New update downloaded! Restarting app...');
        await Updates.reloadAsync();
      }
    } else {
      console.log('ℹ️ No updates available');
    }
  } catch (error) {
    console.error('❌ Error checking for updates:', error);
  }
};

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // Check which Update ID is loaded
    console.log("Update ID:", Updates.updateId);
    console.log("Update Channel:", Updates.channel);
    console.log("Update Runtime Version:", Updates.runtimeVersion);
    
    // TEST: This will prove OTA update worked! Look for this in console
    console.log("🎯 OTA TEST - UPDATE WORKING! v1.0.1-FINAL-TEST");
    
    // Check for updates automatically
    checkForUpdates();
    
    // Simple splash animation
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
        setTimeout(() => {
          router.replace('/(tabs)');
          console.log('Navigation successful');
        }, 100);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    };

    // In preview mode, use simplified navigation with shorter timeout
    if (isPreviewMode) {
      console.log('🌐 Preview mode detected, using simplified navigation');
      const simplifiedTimer = setTimeout(() => {
        handleNavigation();
      }, 2000); // Shorter timeout for preview

      return () => clearTimeout(simplifiedTimer);
    }

    // Set up Firebase auth in background (optional, with enhanced error handling)
    const initializeAuth = async () => {
      try {
        const firebaseModule = await import('./config/firebase');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        const { waitForFirebaseReady, getAuthInstance } = firebaseModule;
        
        // Wait for Firebase to be ready before setting up auth listener
        const isReady = await waitForFirebaseReady(3000); // 3 second timeout for splash
        
        if (isReady) {
          const auth = getAuthInstance();
          if (auth) {
            authUnsubscribe = onAuthStateChanged(auth, 
              (user) => {
                console.log('✅ Auth state determined:', user ? 'authenticated' : 'not authenticated');
                handleNavigation();
              },
              (error) => {
                console.error('❌ Auth state error:', error);
                handleNavigation(); // Still navigate on error
              }
            );
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
        console.error('❌ Firebase auth setup failed:', error);
        handleNavigation(); // Always navigate, even on error
      }
    };

    // Start auth check after splash animation
    const splashTimer = setTimeout(() => {
      initializeAuth();
      
      // Failsafe: navigate after 3 seconds regardless
      navigationTimeout = setTimeout(() => {
        if (!hasNavigated) {
          console.warn('Navigation timeout - proceeding anyway');
          handleNavigation();
        }
      }, 3000);
    }, 1500);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(navigationTimeout);
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [router, hasNavigated]);

  // Show splash content while waiting for navigation
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
    backgroundColor: '#000000',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
