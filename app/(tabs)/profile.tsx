import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import AuthChoiceScreen from '../screens/AuthChoiceScreen';
import ProfileScreen from '../screens/ProfileScreen';

export default function ProfileTab() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'team':
        router.navigate('/(tabs)/team');
        break;
      case 'booking':
        router.navigate('/(tabs)/booking');
        break;
      case 'explore':
        router.navigate('/(tabs)/explore');
        break;
      case 'settings':
        router.navigate('/(tabs)/settings');
        break;
      case 'auth':
        router.navigate('/screens/AuthChoiceScreen');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return null;
  }

  // If user is not authenticated, show AuthChoiceScreen
  if (!user) {
    return <AuthChoiceScreen />;
  }

  // If user is authenticated, show ProfileScreen
  return (
    <ProfileScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 