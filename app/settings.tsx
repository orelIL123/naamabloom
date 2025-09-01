import { useRouter } from 'expo-router';
import SettingsScreen from './screens/SettingsScreen';

export default function SettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Settings navigating to:', screen);
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
      case 'booking':
        router.navigate('/(tabs)/booking');
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
    <SettingsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}