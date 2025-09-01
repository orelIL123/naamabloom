import { Tabs, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import BottomNav from '../components/BottomNav';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  // קביעת הטאב הפעיל לפי ה־route
  const activeTab = React.useMemo(() => {
    const last = segments[segments.length - 1];
    if (String(last) === 'index') return 'home';
    if (String(last) === 'profile') return 'profile';
    if (String(last) === 'team') return 'team';
    return 'home';
  }, [segments]);

  // ניווט בין טאבים - ניווט חלק ישיר ללא קפיצות
  const handleTabPress = (tab: string) => {
    const currentSegment = segments[segments.length - 1] || 'index';
    
    // Don't navigate if already on the same tab
    if ((tab === 'home' && (currentSegment === 'index' || currentSegment === '')) ||
        (tab === 'profile' && currentSegment === 'profile') ||
        (tab === 'team' && currentSegment === 'team')) {
      console.log(`Already on ${tab} tab, skipping navigation`);
      return;
    }

    console.log(`Navigating to ${tab} from ${currentSegment}`);

    // Use navigate to preserve state and avoid remount flicker
    try {
      if (tab === 'home') {
        router.navigate('/(tabs)');
      } else if (tab === 'profile') {
        router.navigate('/(tabs)/profile');
      } else if (tab === 'team') {
        router.navigate('/(tabs)/team');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // ניווט מהיר מה־FAB - מנתב לספר בוקינג
  const handleOrderPress = () => {
    // Navigate to booking tab smoothly without creating new history entry
    router.navigate('/(tabs)/booking');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'בית' }} />
        <Tabs.Screen name="profile" options={{ title: 'פרופיל' }} />
        <Tabs.Screen name="team" options={{ title: 'צוות' }} />
        <Tabs.Screen name="settings" options={{ title: 'הגדרות' }} />
        <Tabs.Screen name="booking" options={{ title: 'הזמנה' }} />
      </Tabs>
      <BottomNav
        onOrderPress={handleOrderPress}
        onTabPress={handleTabPress}
        activeTab={activeTab}
      />
    </>
  );
}
