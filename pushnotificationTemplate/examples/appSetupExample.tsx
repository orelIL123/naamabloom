// Example: How to set up notifications in your app
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';
import { registerForPushNotifications } from '../services/notificationService';

// Configure notification behavior (add this to your main App.tsx or _layout.tsx)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const AppSetupExample: React.FC = () => {
  useEffect(() => {
    // Register for push notifications when app starts
    const setupNotifications = async () => {
      try {
        // Replace 'currentUserId' with your actual user ID
        const userId = 'currentUserId'; // Get from your auth system
        const token = await registerForPushNotifications(userId);
        
        if (token) {
          console.log('✅ Push notifications registered successfully');
          // Save token to your user profile in database
          // await updateUserProfile(userId, { pushToken: token });
        }
      } catch (error) {
        console.error('❌ Failed to setup notifications:', error);
      }
    };

    setupNotifications();
  }, []);

  return null; // This is just for setup, no UI needed
};

// Example: How to handle notification responses
export const setupNotificationHandlers = () => {
  // Handle notification tap
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification);
    // Handle the notification data here
    // You can navigate to specific screens based on notification type
  });

  // Handle notification response (when user taps on notification)
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification tapped:', response);
    
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    switch (data?.type) {
      case 'appointment':
        // Navigate to appointment details
        // navigation.navigate('AppointmentDetails', { appointmentId: data.appointmentId });
        break;
      case 'maintenance':
        // Navigate to maintenance info screen
        // navigation.navigate('MaintenanceInfo');
        break;
      case 'promotion':
        // Navigate to promotions screen
        // navigation.navigate('Promotions');
        break;
      default:
        // Navigate to home or notifications screen
        // navigation.navigate('Home');
        break;
    }
  });

  // Cleanup listeners
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
};

// Example: How to request permissions manually
export const requestNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status === 'granted') {
      console.log('✅ Notification permissions granted');
      return true;
    } else {
      console.log('❌ Notification permissions denied');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Example: How to check current permission status
export const checkNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    console.log('Current notification permission status:', status);
    return status;
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return 'unknown';
  }
};
