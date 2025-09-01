import { useRouter } from 'expo-router';
import AdminGalleryScreen from './screens/AdminGalleryScreen';

export default function AdminGalleryTab() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('Admin Gallery navigating to:', screen);
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
    <AdminGalleryScreen 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
}