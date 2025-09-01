import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import SettingsScreen from '../screens/SettingsScreen';

export default function SettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      case 'admin-home':
        router.navigate('/admin-home');
        break;
      case 'barber-dashboard':
        router.navigate('/barber-dashboard');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    router.navigate('/(tabs)');
  };

  return <SettingsScreen onNavigate={handleNavigate} onBack={handleBack} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});