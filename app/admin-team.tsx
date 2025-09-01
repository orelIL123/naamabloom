import { useRouter } from 'expo-router';
import AdminTeamScreen from './screens/AdminTeamScreen';

export default function AdminTeamTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Team navigating to:', screen);
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
    <AdminTeamScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}