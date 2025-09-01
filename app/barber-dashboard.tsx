import { useRouter } from 'expo-router';
import BarberDashboardScreen from './screens/BarberDashboardScreen';

export default function BarberDashboardTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Barber Dashboard navigating to:', screen);
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      case 'settings':
        router.navigate('/(tabs)/settings');
        break;
      case 'admin-home':
        router.navigate('/admin-home');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    router.navigate('/(tabs)');
  };

  return (
    <BarberDashboardScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}