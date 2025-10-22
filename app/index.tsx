import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { auth } from './config/firebase';

// Preview mode detection
const isPreviewMode = Platform.OS === 'web' && __DEV__;

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
    console.log("🎯 OTA TEST - UPDATE WORKING! v1.0.6-VERIFIED");
    
    // Simple splash animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    let navigationTimeout: NodeJS.Timeout;

    const handleNavigation = () => {
      if (hasNavigated) {
        console.log('Navigation already handled, skipping...');
        return;
      }
      
      console.log('Handling navigation...');
      setHasNavigated(true);
      
      // Navigate to auth choice - auth will be handled by _layout.tsx
      try {
        setTimeout(() => {
          router.replace('/screens/AuthChoiceScreen');
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

    // Check if user is already logged in
    const initializeAuth = async () => {
      console.log('🔐 Checking if user is already logged in...');
      
      // Check if user is already authenticated
      if (auth.currentUser) {
        console.log('✅ User is already logged in, navigating to home');
        router.replace('/(tabs)');
        return;
      }
      
      console.log('❌ No user logged in, proceeding to auth choice');
      handleNavigation();
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
