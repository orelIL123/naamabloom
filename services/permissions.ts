import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

// Permission request with user-friendly explanations
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    // Check existing permissions first
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    // Show explanation before requesting permission
    return new Promise((resolve) => {
      Alert.alert(
        'הרשאות התראות',
        'אנחנו צריכים הרשאה לשלוח התראות כדי:\n\n• ליידע אותך על אישור התור\n• להזכיר לך על התור הקרוב\n• לעדכן אותך על שינויים בתור\n• לשלוח עדכונים חשובים מהמספרה',
        [
          {
            text: 'לא עכשיו',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'אישור',
            onPress: async () => {
              const { status } = await Notifications.requestPermissionsAsync();
              resolve(status === 'granted');
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await ImagePicker.getCameraPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    // Show explanation before requesting permission
    return new Promise((resolve) => {
      Alert.alert(
        'הרשאת מצלמה',
        'אנחנו צריכים גישה למצלמה כדי:\n\n• לצלם תמונות פרופיל\n• לשתף תמונות בגלריית המספרה\n• לתעד תוצאות התספורת\n• לאפשר לך לשתף את החוויה שלך',
        [
          {
            text: 'לא עכשיו',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'אישור',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              resolve(status === 'granted');
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    // Show explanation before requesting permission
    return new Promise((resolve) => {
      Alert.alert(
        'הרשאת גלריה',
        'אנחנו צריכים גישה לגלריה כדי:\n\n• לבחור תמונות פרופיל מהגלריה שלך\n• להעלות תמונות לגלריית המספרה\n• לשתף תמונות של תוצאות התספורת\n• לאפשר לך לשמור תמונות מהמספרה',
        [
          {
            text: 'לא עכשיו',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'אישור',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              resolve(status === 'granted');
            },
          },
        ]
      );
    });
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return false;
  }
};

// SMS verification explanation (for Firebase Auth phone verification)
export const showSMSVerificationExplanation = (): Promise<boolean> => {
  return new Promise((resolve) => {
    Alert.alert(
      'אימות SMS',
      'אנחנו צריכים לשלוח SMS אימות כדי:\n\n• לוודא שמספר הטלפון שלך נכון\n• להגן על החשבון שלך מפני שימוש לא מורשה\n• לאפשר לך לקבל עדכונים חשובים על התורים\n• להבטיח שהתקשורת איתך תהיה מאובטחת',
      [
        {
          text: 'ביטול',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'שלח SMS',
          onPress: () => resolve(true),
        },
      ]
    );
  });
};

// Check if permission was permanently denied
export const isPermissionPermanentlyDenied = (status: string): boolean => {
  return Platform.OS === 'ios' ? status === 'denied' : status === 'never_ask_again';
};

// Show settings redirect for permanently denied permissions
export const showPermissionSettingsAlert = (permissionType: string) => {
  Alert.alert(
    'הרשאה נדרשת',
    `כדי להשתמש בתכונה זו, אנא אפשר את הגישה ל${permissionType} בהגדרות המכשיר.`,
    [
      { text: 'לא עכשיו', style: 'cancel' },
      { text: 'פתח הגדרות', onPress: () => {
        // Note: You can use Linking.openSettings() to open device settings
        console.log('Open device settings for permissions');
      }},
    ]
  );
};