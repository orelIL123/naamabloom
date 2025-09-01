# BarbersBar App Deployment Guide

## Prerequisites
- Node.js 18.x or later
- Expo CLI 50.x
- EAS CLI 13.2.1+
- Firebase Project
- Apple Developer Account (for iOS)
- Google Play Developer Account (for Android)

## Initial Setup
1. Replace all placeholders in template:
   ```bash
   node ./scripts/replace-placeholders.js
   ```

2. Install Dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase
   - Update `firebase.json`
   - Set up Firestore rules
   - Configure Authentication

## Local Development
```bash
expo start  # Start development server
npm run android  # Run on Android
npm run ios      # Run on iOS
```

## Building for Production
### iOS
```bash
eas build -p ios --profile production
```

### Android
```bash
eas build -p android --profile production
```

## Over-the-Air (OTA) Updates
```bash
eas update --branch production
```

## Troubleshooting
- Check `verify-template.js` for integrity
- Use `missing-files-recovery.js` if files are missing
- Verify Firebase and Expo configurations