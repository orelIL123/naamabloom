# Barbershop Template - מערכת שכפול אפליקציות ספרים

## איך לשכפל אפליקציה חדשה

### צעד 1: הרץ את הסקריפט
```bash
cd /Users/x/Desktop/barbershop-template/scripts
python3 app_duplication_wizard.py
```

### צעד 2: ענה על השאלות (5 דקות)
הסקריפט ישאל:
- פרטי העסק (שם, בעלים, כתובת)
- הגדרות אפליקציה (שם, Bundle ID, צבעים)
- כמה ספרים עובדים
- הגדרות SMS ו-WhatsApp (אופציונלי)

### צעד 3: הסקריפט יצור אפליקציה ישירות ב-Desktop
התוצאה:
- תיקייה חדשה ב-Desktop עם שם העסק
- כל הקבצים מוגדרים אוטומטי  
- README עם הוראות המשך

## מה נמצא בתמפלט:

### 📱 **App Structure**
- `/app` - כל המסכים והקומפוננטים
- `/services` - Firebase, הודעות, הרשאות
- `/config` - קונפיגורציות SMS, WhatsApp, Firebase

### 🔧 **Configuration Files**
- `app.json` - הגדרות Expo
- `eas.json` - הגדרות Build
- `package.json` - Dependencies
- `firebase.json` - הגדרות Firebase

### 📲 **Messaging System**
- SMS4Free integration
- WhatsApp Business API
- Fallback system

### 🎨 **Customization**
- Tailwind CSS theming
- Color configuration
- RTL support for Hebrew

## אחרי השכפול - מה עושים?

1. **נכנס לתיקייה החדשה ב-Desktop**
2. **מריץ `npm install`**  
3. **מגדיר Firebase project**
4. **מריץ `eas build`**

## Support
עיין ב-`scripts/WIZARD_USAGE.md` למידע מפורט.