# 🚀 Push Notification System Template

מערכת התראות מלאה ומתקדמת לאפליקציות React Native/Expo, הכוללת Push Notifications, SMS, ותזכורות מקומיות.

## 📋 תוכן עניינים

- [תכונות המערכת](#תכונות-המערכת)
- [התקנה והגדרה](#התקנה-והגדרה)
- [שימוש בסיסי](#שימוש-בסיסי)
- [דוגמאות מתקדמות](#דוגמאות-מתקדמות)
- [תצורה](#תצורה)
- [פתרון בעיות](#פתרון-בעיות)

## ✨ תכונות המערכת

### 🔔 Push Notifications
- התראות בזמן אמת באמצעות Expo Push Notifications
- תמיכה בכל הפלטפורמות (iOS, Android, Web)
- ניהול הרשאות אוטומטי
- תמיכה בנתונים מותאמים אישית

### 📱 SMS Notifications
- אינטגרציה עם SMS4Free API
- תמיכה בהודעות SMS בעברית
- ניהול שגיאות מתקדם
- תמיכה בפורמטים שונים של מספרי טלפון

### ⏰ Local Scheduled Notifications
- תזכורות מתוזמנות מראש
- תזכורות לתורים (שעה ורבע שעה לפני)
- ניהול תזכורות דינמי

### 👥 ניהול משתמשים
- שליחה למשתמש יחיד
- שליחה לכל המשתמשים
- שליחה למנהלים בלבד
- סינון משתמשים לפי תכונות

## 🛠 התקנה והגדרה

### 1. התקנת Dependencies

```bash
npm install expo-notifications expo-device firebase @react-native-async-storage/async-storage
```

### 2. הגדרת Expo

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

### 3. הגדרת Firebase

1. צור פרויקט Firebase חדש
2. הוסף את קבצי התצורה:
   - `GoogleService-Info.plist` (iOS)
   - `google-services.json` (Android)
3. הגדר משתני סביבה:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. הגדרת SMS4Free

הוסף משתני סביבה ל-SMS:

```env
SMS4FREE_API_KEY=your_api_key
SMS4FREE_USER=your_username
SMS4FREE_PASS=your_password
SMS4FREE_SENDER=your_sender_name
```

### 5. העתקת קבצים

העתק את התיקיות הבאות לפרויקט שלך:

```
pushnotificationTemplate/
├── services/
│   ├── messaging/          # שירותי SMS
│   └── notificationService.ts  # שירותי Push Notifications
├── config/
│   ├── messaging.ts        # תצורת SMS
│   └── firebase.ts         # תצורת Firebase
└── examples/               # דוגמאות שימוש
```

## 🚀 שימוש בסיסי

### הגדרת האפליקציה

```tsx
// App.tsx או _layout.tsx
import { AppSetupExample, setupNotificationHandlers } from './examples/appSetupExample';

export default function App() {
  useEffect(() => {
    // הגדרת התראות
    AppSetupExample();
    
    // הגדרת מטפלי התראות
    const cleanup = setupNotificationHandlers();
    
    return cleanup;
  }, []);

  return (
    // ה-UI שלך
  );
}
```

### רישום משתמש להתראות

```typescript
import { registerForPushNotifications } from './services/notificationService';

const userId = 'user123';
const token = await registerForPushNotifications(userId);

if (token) {
  // שמור את ה-token במסד הנתונים
  await updateUserProfile(userId, { pushToken: token });
}
```

### שליחת התראה למשתמש

```typescript
import { sendNotificationToUser } from './services/notificationService';

const userProfile = {
  uid: 'user123',
  displayName: 'יוסי כהן',
  phone: '0521234567',
  pushToken: 'ExponentPushToken[xxx]'
};

await sendNotificationToUser(
  userProfile,
  'שלום! 👋',
  'זהו הודעת בדיקה',
  { type: 'general' }
);
```

### שליחת SMS

```typescript
import { sendSms } from './services/messaging/instance';

await sendSms('0521234567', 'שלום! זהו הודעת SMS לבדיקה');
```

## 📚 דוגמאות מתקדמות

### יצירת תור עם התראות

```typescript
import { createAppointmentWithNotifications } from './examples/bookingExample';

const appointmentData = {
  userId: 'user123',
  userProfile: userProfile,
  appointmentDate: new Date('2024-01-15 14:00'),
  treatmentName: 'תספורת גברים',
  barberName: 'רון תורגמן',
  phoneNumber: '0521234567'
};

await createAppointmentWithNotifications(appointmentData);
```

### שליחת הודעה לכל המשתמשים

```typescript
import { sendBroadcastMessage } from './examples/adminExample';

const allUsers = await getAllUsers(); // הפונקציה שלך לקבלת משתמשים

await sendBroadcastMessage(
  allUsers,
  'עדכון חשוב! 📢',
  'המערכת תהיה לא זמינה בין 2-4 לפנות בוקר לתחזוקה'
);
```

### תזכורות מקומיות לתור

```typescript
import { scheduleAppointmentReminders } from './services/notificationService';

const appointmentDate = new Date('2024-01-15 14:00');
const treatmentName = 'תספורת גברים';
const userId = 'user123';

await scheduleAppointmentReminders(appointmentDate, treatmentName, userId);
```

## ⚙️ תצורה

### תצורת SMS4Free

```typescript
// config/messaging.ts
export const messagingConfig: MessagingConfig = {
  providers: {
    sms4free: {
      apiKey: process.env.SMS4FREE_API_KEY || 'your_api_key',
      user: process.env.SMS4FREE_USER || 'your_username',
      pass: process.env.SMS4FREE_PASS || 'your_password',
      sender: process.env.SMS4FREE_SENDER || 'your_sender_name',
      enabled: true,
    }
  },
  defaultProvider: 'sms4free',
  fallbackEnabled: false,
};
```

### תצורת Firebase

```typescript
// config/firebase.ts
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
};
```

## 🔧 פתרון בעיות

### בעיות נפוצות

#### 1. Push Notifications לא עובדות
- בדוק שהגדרת את `expo-notifications` plugin ב-`app.json`
- ודא שיש לך הרשאות התראות במכשיר
- בדוק שה-Firebase מוגדר נכון

#### 2. SMS לא נשלח
- בדוק את פרטי ה-API של SMS4Free
- ודא שמספר הטלפון בפורמט הנכון
- בדוק את יתרת החשבון ב-SMS4Free

#### 3. תזכורות מקומיות לא עובדות
- בדוק שהגדרת `Notifications.setNotificationHandler`
- ודא שהמכשיר לא במצב "לא להפריע"
- בדוק את ההרשאות להתראות

### לוגים ודיבוג

המערכת כוללת לוגים מפורטים. חפש ב-console אחר:
- `📱` - התראות Push
- `📞` - הודעות SMS
- `⏰` - תזכורות מקומיות
- `✅` - פעולות הצליחו
- `❌` - שגיאות

## 📞 תמיכה

אם יש לך שאלות או בעיות:

1. בדוק את הלוגים ב-console
2. ודא שכל ההגדרות נכונות
3. בדוק את הדוגמאות בקובץ `examples/`

## 📄 רישיון

MIT License - ניתן לשימוש חופשי בפרויקטים מסחריים ופרטיים.

---

**נוצר על ידי**: רון תורגמן  
**גרסה**: 1.0.0  
**תאריך**: 2024
