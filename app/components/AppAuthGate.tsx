import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth, checkFirebaseReady } from '../config/firebase';

interface AppAuthGateProps {
  children: React.ReactNode;
}

export default function AppAuthGate({ children }: AppAuthGateProps) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Wait for Firebase to be ready before subscribing to auth state
    const initAuth = async () => {
      // Check if Firebase is ready
      if (!checkFirebaseReady()) {
        console.warn('⚠️ Firebase not ready yet, waiting...');
        // Wait a bit for Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check again
        if (!checkFirebaseReady()) {
          console.error('❌ Firebase initialization failed');
          setIsInitializing(false);
          return;
        }
      }

      // Now subscribe to auth state changes
      try {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('🔐 Auth state changed in AppAuthGate:', user ? 'User logged in' : 'User logged out');
          setIsInitializing(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error setting up auth listener:', error);
        setIsInitializing(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    initAuth().then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});

