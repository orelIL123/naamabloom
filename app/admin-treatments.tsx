import { useRouter } from 'expo-router';
import AdminTreatmentsScreen from './screens/AdminTreatmentsScreen';

export default function AdminTreatmentsTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Treatments navigating to:', screen);
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
    <AdminTreatmentsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}