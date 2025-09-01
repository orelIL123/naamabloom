import { useRouter } from 'expo-router';
import HomeScreen from '../screens/HomeScreen';

export default function HomeTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'auth':
        router.navigate('/screens/AuthChoiceScreen');
        break;
      case 'booking':
        router.navigate('/(tabs)/booking');
        break;
      case 'team':
        router.navigate('/(tabs)/team');
        break;
      case 'gallery':
        router.navigate('/(tabs)/gallery');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      case 'settings':
        router.navigate('/(tabs)/settings');
        break;
      default:
        break;
    }
  };

  return <HomeScreen onNavigate={handleNavigate} />;
}