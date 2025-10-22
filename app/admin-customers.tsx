import { useRouter } from 'expo-router';
import AdminCustomersScreen from './screens/AdminCustomersScreen';

export default function AdminCustomersRoute() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log(`Navigating to: ${screen}`);

    const screenRoutes: { [key: string]: string } = {
      'admin-home': '/admin-home',
      'admin-team': '/admin-team',
      'admin-treatments': '/admin-treatments',
      'admin-availability': '/admin-availability',
      'admin-gallery': '/admin-gallery',
      'admin-statistics': '/admin-statistics',
      'admin-appointments': '/admin-appointments',
      'admin-settings': '/admin-settings',
      'admin-notifications': '/admin-notifications',
      'admin-notification-settings': '/admin-notification-settings',
      'admin-waitlist': '/admin-waitlist',
      'admin-customers': '/admin-customers',
      'home': '/(tabs)',
    };

    const route = screenRoutes[screen] || `/${screen}`;
    router.push(route as any);
  };

  return (
    <AdminCustomersScreen
      onNavigate={handleNavigate}
      onBack={() => router.back()}
    />
  );
}
