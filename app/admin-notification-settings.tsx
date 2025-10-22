import { useRouter } from 'expo-router';
import AdminNotificationSettingsScreen from './screens/AdminNotificationSettingsScreen';

export default function AdminNotificationSettingsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Notification Settings navigating to:', screen);
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
    <AdminNotificationSettingsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}
