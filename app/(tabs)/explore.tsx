import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile } from '../../services/firebase';
import AdminGalleryScreen from '../screens/AdminGalleryScreen';
import ShopScreen from './explore-client';

export default function ExploreTab() {
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    (async () => {
      const user = getCurrentUser();
      if (user) {
        const profile = await getUserProfile(user.uid);
        setIsAdmin(profile?.isAdmin === true);
      }
    })();
  }, []);

  const handleNavigate = (screen: string) => {
    switch (screen) {
      case 'home':
        router.navigate('/(tabs)');
        break;
      case 'profile':
        router.navigate('/(tabs)/profile');
        break;
      default:
        router.navigate('/(tabs)');
    }
  };

  const handleBack = () => {
    router.navigate('/(tabs)');
  };

  if (isAdmin) {
    return <AdminGalleryScreen initialTab="shop" onNavigate={handleNavigate} onBack={handleBack} />;
  }
  return <ShopScreen onNavigate={handleNavigate} onBack={handleBack} />;
}
