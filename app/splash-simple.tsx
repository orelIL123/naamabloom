import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple splash animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Navigate directly to main app after 3 seconds - no Firebase
    const timer = setTimeout(() => {
      try {
        console.log('SimpleSplash: Navigating to main app...');
        router.replace('/(tabs)');
      } catch (error) {
        console.error('SimpleSplash: Navigation error:', error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

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