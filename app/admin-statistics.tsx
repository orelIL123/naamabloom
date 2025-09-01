import { useRouter } from 'expo-router';
import AdminStatisticsScreen from './screens/AdminStatisticsScreen';

export default function AdminStatisticsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Statistics navigating to:', screen);
    switch (screen) {
      case 'admin-home':
        router.navigate('/admin-home');
        break;
      case 'home':
        router.navigate('/(tabs)');
        break;
      default:
        router.navigate('/admin-home');
    }
  };

  const handleBack = () => {
    router.navigate('/admin-home');
  };

  return (
    <AdminStatisticsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 