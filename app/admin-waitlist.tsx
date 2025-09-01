import { useRouter } from 'expo-router';
import AdminWaitlistScreen from './screens/AdminWaitlistScreen';

export default function AdminWaitlistPage() {
  console.log('🎯 AdminWaitlistPage component rendered');
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('AdminWaitlist navigating to:', screen);
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
    console.log('AdminWaitlist going back');
    router.navigate('/admin-home');
  };

  try {
    return (
      <AdminWaitlistScreen 
        onNavigate={handleNavigate}
        onBack={handleBack}
      />
    );
  } catch (error) {
    console.error('❌ Error rendering AdminWaitlistScreen:', error);
    // Fallback to avoid crash
    return null;
  }
}
