# מערכת התראות - מדריך הפעלה

## מה נוסף למערכת?

✅ **מערכת התראות מלאה** על בסיס Firebase Cloud Messaging (FCM) ו-Expo Notifications

### פונקציונליות חדשה:

1. **רישום ל-Push Notifications** - כל משתמש חדש מתרשם אוטומטית
2. **תזכורות מתוזמנות** - תזכורות אוטומטיות לתורים:
   - 24 שעות לפני
   - שעה לפני
   - 15 דקות לפני
3. **התראות לאדמין** - על תורים חדשים, ביטולים ומשתמשים חדשים
4. **התראות למשתמשים** - אישורי תורים, ביטולים, תזכורות
5. **הגדרות התראות** - מנהלים יכולים לבחור איזה התראות לקבל

## איך מערכת ההתראות עובדת?

### 1. רישום ל-Push Notifications
```typescript
// נקרא אוטומטית כשמשתמש נרשם או מתחבר
await registerForPushNotifications(userId);
```

### 2. תזמון תזכורות לתור
```typescript
// נקרא אוטומטית כשיוצרים תור חדש
await scheduleAppointmentReminders(appointmentId, appointmentData);
```

### 3. עיבוד תזכורות תקופתי
```bash
# הרצה ידנית
npm run process-reminders

# הגדרת cron job (כל 5 דקות)
*/5 * * * * cd /path/to/project && npm run process-reminders
```

## הגדרת Cron Job (Linux/Mac)

```bash
# פתח את crontab
crontab -e

# הוסף שורה (החלף את הנתיב לפרויקט שלך):
*/5 * * * * cd /Users/x/Desktop/naama-bloom-barbershop && npm run process-reminders >> /tmp/reminders.log 2>&1
```

## הגדרת Scheduled Functions (Vercel/Netlify)

### Vercel:
יצור קובץ `api/process-reminders.ts`:
```typescript
import { processScheduledReminders } from '../services/firebase';

export default async function handler(req, res) {
  try {
    const processed = await processScheduledReminders();
    res.status(200).json({ processed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

הוסף ל-`vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/process-reminders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## איך להשתמש בפונקציות החדשות?

### שליחת התראה למשתמש ספציפי:
```typescript
await sendNotificationToUser(
  userId,
  'כותרת ההתראה',
  'תוכן ההתראה',
  { data: 'נתונים נוספים' }
);
```

### שליחת התראה לאדמין:
```typescript
await sendNotificationToAdmin(
  'כותרת ההתראה',
  'תוכן ההתראה',
  { data: 'נתונים נוספים' },
  'סוג_התראה' // לבדיקת הגדרות
);
```

### שליחת התראה לכל המשתמשים:
```typescript
await sendNotificationToAllUsers(
  'כותרת ההתראה',
  'תוכן ההתראה',
  { data: 'נתונים נוספים' }
);
```

## מבני נתונים חדשים ב-Firestore:

### Collection: `scheduledReminders`
```typescript
{
  appointmentId: string,
  userId: string,
  scheduledTime: Timestamp,
  reminderType: '24h' | '1h' | '15m',
  status: 'pending' | 'sent' | 'cancelled' | 'failed',
  createdAt: Timestamp,
  sentAt?: Timestamp,
  cancelledAt?: Timestamp,
  failedAt?: Timestamp,
  reason?: string
}
```

### Collection: `adminNotifications` (הגדרות)
```typescript
{
  newAppointment: boolean,
  canceledAppointment: boolean,
  newUser: boolean,
  appointmentReminders: boolean,
  upcomingAppointments: boolean,
  updatedAt: Date
}
```

### שדה חדש ב-`users`:
```typescript
{
  pushToken?: string // Expo push token
}
```

## בדיקה שהכל עובד:

1. **בדוק שמשתמשים מקבלים push tokens:**
   ```bash
   # בלוג האפליקציה תראה:
   📱 Push token: ExponentPushToken[...]
   ```

2. **בדוק שתזכורות נשמרות:**
   ```bash
   # ב-Firestore תראה records ב-collection scheduledReminders
   ```

3. **הרץ עיבוד תזכורות ידני:**
   ```bash
   npm run process-reminders
   ```

4. **בדוק לוגים:**
   ```bash
   # תראה בלוג:
   🔄 Processing scheduled reminders at ...
   📬 Found X reminders to process
   ✅ Successfully processed X reminders
   ```

## פתרון בעיות נפוצות:

### אין push tokens?
- ודא שההרשאות ל-notifications מאושרות במכשיר
- בדוק שהפונקציה `registerForPushNotifications` נקראת

### תזכורות לא נשלחות?
- ודא שהסקריפט `process-reminders` רץ תקופתי
- בדוק שיש records ב-collection `scheduledReminders` עם status `pending`

### אדמין לא מקבל התראות?
- בדוק שהמשתמש מוגדר כ-`isAdmin: true`
- ודא שההגדרות ב-AdminNotificationSettingsScreen מופעלות

---

**🎉 מערכת ההתראות פעילה ומוכנה לשימוש!**

לכל בעיה או שאלה - בדוק את הלוגים או פנה לתמיכה.