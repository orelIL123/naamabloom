import { useRouter } from 'expo-router';
import AdminSettingsScreen from './screens/AdminSettingsScreen';

export default function AdminSettingsPage() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
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
    <AdminSettingsScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}