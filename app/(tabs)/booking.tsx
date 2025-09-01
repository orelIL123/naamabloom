import { useRouter } from 'expo-router';
import BookingScreen from '../screens/BookingScreen';

export default function BookingTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      case 'team':
        router.navigate('/(tabs)/team');
        break;
      case 'explore':
        router.navigate('/(tabs)/explore');
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

  const handleClose = () => {
    router.navigate('/(tabs)');
  };

  return (
    <BookingScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
      onClose={handleClose}
    />
  );
}