import { useRouter } from 'expo-router';
import AdminNotificationsScreen from './screens/AdminNotificationsScreen';

export default function AdminNotificationsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Notifications navigating to:', screen);
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
    <AdminNotificationsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 