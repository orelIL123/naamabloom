import { useRouter } from 'expo-router';
import React from 'react';
import BarberHomeScreen from './screens/BarberHomeScreen';

export default function BarberHomePage() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    console.log('📍 Navigating to:', screen);

    // Map screen names to routes
    const routeMap: { [key: string]: string } = {
      'home': '/',
      'admin-appointments': '/admin-appointments',
      'calendar': '/(admin)/CalendarScreen',
      'admin-treatments': '/admin-treatments',
      'admin-availability': '/admin-availability',
      'admin-waitlist': '/admin-waitlist',
      'admin-statistics': '/admin-statistics',
    };

    const route = routeMap[screen];
    if (route) {
      router.push(route as any);
    } else {
      console.warn('Unknown screen:', screen);
    }
  };

  return <BarberHomeScreen onNavigate={handleNavigate} onBack={() => router.back()} />;
}
