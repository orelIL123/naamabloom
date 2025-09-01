import { useRouter } from 'expo-router';
import AdminAvailabilityScreen from './screens/AdminAvailabilityScreen';

export default function AdminAvailabilityPage() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('AdminAvailability navigating to:', screen);
    switch (screen) {
      case 'admin-home':
        router.navigate('/admin-home');
        break;
      case 'admin-team':
        router.navigate('/admin-team');
        break;
      case 'home':
        router.navigate('/(tabs)');
        break;
      default:
        console.log('Unknown screen:', screen);
        router.navigate('/admin-home');
    }
  };

  const handleBack = () => {
    console.log('AdminAvailability going back');
    router.navigate('/admin-home');
  };

  return (
    <AdminAvailabilityScreen 
      onNavigate={handleNavigate}
      onBack={handleBack}
    />
  );
}