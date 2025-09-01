import { useRouter } from 'expo-router';
import AdminHomeScreen from './screens/AdminHomeScreen';

export default function AdminHomeTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Home navigating to:', screen);
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'admin-appointments':
        router.navigate('/admin-appointments');
        break;
      case 'admin-treatments':
        router.navigate('/admin-treatments');
        break;
      case 'admin-team':
        router.navigate('/admin-team');
        break;
      case 'admin-gallery':
        router.navigate('/admin-gallery');
        break;
      case 'admin-availability':
        router.navigate('/admin-availability');
        break;
      case 'admin-waitlist':
        router.navigate('/admin-waitlist');
        break;
      case 'admin-statistics':
        router.navigate('/admin-statistics');
        break;
      case 'admin-notifications':
        router.navigate('/admin-notifications');
        break;
      case 'admin-settings':
        router.navigate('/admin-settings');
        break;
      case 'settings':
        router.navigate('/(tabs)/settings');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    router.navigate('/(tabs)');
  };

  return (
    <AdminHomeScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}