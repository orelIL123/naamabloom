import { useRouter } from 'expo-router';
import AdminAppointmentsScreen from './screens/AdminAppointmentsScreen';

export default function AdminAppointmentsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Appointments navigating to:', screen);
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
    <AdminAppointmentsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}