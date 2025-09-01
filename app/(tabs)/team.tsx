import { useRouter } from 'expo-router';
import TeamScreenComponent from '../screens/TeamScreen';

export default function TeamTab() {
  const router = useRouter();

  const handleNavigate = (screen: string, params?: any) => {
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      case 'booking':
        if (params) {
          router.push({
            pathname: '/booking',
            params
          });
        } else {
        router.navigate('/(tabs)/booking');
        }
        break;
      case 'explore':
        router.navigate('/(tabs)/explore');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tabs)');
    }
  };

  return (
    <TeamScreenComponent 
      onNavigate={handleNavigate} 
      onBack={handleBack}
    />
  );
} 