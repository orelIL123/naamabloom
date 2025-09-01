# איך לשכפל אפליקציה - מדריך פשוט

## צעד אחד: הפעל את הסקריפט

```bash
cd template/scripts
python3 app_duplication_wizard.py
```

## זה מה שיקרה:

### 1. השאלות (5 דקות)
הסקריפט ישאל אותך:
- שם העסק
- שם הבעלים + אימייל + טלפון  
- כתובת העסק (בשביל Waze)
- כמה מעצבי שיער
- שירותים (תספורת, זקן, וכו')
- צבע ראשי של האפליקציה
- שם האפליקציה ו-Bundle ID

### 2. הגדרות מסרים (אופציונלי)
- SMS4Free - אם אתה רוצה SMS
- WhatsApp Business - אם אתה רוצה WhatsApp

### 3. הסקריפט יעשה הכל אוטומטי:
```
✓ Updated app.json with הסלון של דוד
✓ Updated package.json
✓ Updated Firebase config
✓ Updated theme colors
✓ Updated messaging configuration
✓ Created .env.example file

🎉 הסלון של דוד App Created!
📁 Location: /path/to/salon-shel-david-barbershop
📱 Bundle ID: com.david.salon
🔥 Firebase: abc12345
```

## אחרי זה מה עושים?

1. **נכנס לתיקייה החדשה:**
   ```bash
   cd הסלון-של-דוד-barbershop
   ```

2. **מתקין חבילות:**
   ```bash
   npm install
   ```

3. **מגדיר Firebase:**
   - יוצר פרויקט חדש ב-Firebase
   - מוסיף את הקבצים google-services.json ו-GoogleService-Info.plist

4. **בונה:**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## זה הכל!

האפליקציה החדשה מוכנה עם:
- כל ההגדרות הנכונות
- צבעים מותאמים
- הודעות SMS/WhatsApp (אם בחרת)
- Firebase מוכן
- README עם הוראות מפורטות

## אם משהו לא עובד:
```bash
python3 app_duplication_wizard.py --dry-run
```
זה יראה לך מה יקרה בלי לעשות שינויים באמת.