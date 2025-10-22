# 🛠 הוראות התקנה מהירות

## שלב 1: העתקת קבצים

העתק את התיקיות הבאות לפרויקט שלך:

```bash
# העתק את כל התיקייה
cp -r pushnotificationTemplate/* your-project/

# או העתק קבצים ספציפיים:
cp -r pushnotificationTemplate/services/ your-project/
cp -r pushnotificationTemplate/config/ your-project/
cp -r pushnotificationTemplate/examples/ your-project/
```

## שלב 2: התקנת Dependencies

```bash
npm install expo-notifications expo-device firebase @react-native-async-storage/async-storage
```

## שלב 3: הגדרת app.json

הוסף ל-`app.json` שלך:

```json
{
  "expo": {
    "plugins": [
      "expo-notifications"
    ]
  }
}
```

## שלב 4: משתני סביבה

צור קובץ `.env` והוסף:

```env
# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# SMS4Free
SMS4FREE_API_KEY=your_api_key
SMS4FREE_USER=your_username
SMS4FREE_PASS=your_password
SMS4FREE_SENDER=your_sender_name
```

## שלב 5: שימוש בסיסי

```typescript
// 1. הגדרת האפליקציה
import { AppSetupExample } from './examples/appSetupExample';

// 2. רישום משתמש
import { registerForPushNotifications } from './services/notificationService';

// 3. שליחת התראה
import { sendNotificationToUser } from './services/notificationService';

// 4. שליחת SMS
import { sendSms } from './services/messaging/instance';
```

## שלב 6: בדיקה

```typescript
// בדיקה בסיסית
const token = await registerForPushNotifications('test-user');
console.log('Token:', token);

// שליחת הודעת בדיקה
await sendNotificationToUser(userProfile, 'בדיקה', 'הודעה לבדיקה');
```

## ✅ סיימת!

המערכת מוכנה לשימוש. עיין ב-`README.md` לפרטים נוספים ודוגמאות מתקדמות.
