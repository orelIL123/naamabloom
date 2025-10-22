# MCP Servers for Barbers Bar

This directory contains Model Context Protocol (MCP) servers for managing Firebase integration and Google Play deployment for the Barbers Bar application.

## Setup

1. Install dependencies:
```bash
cd mcp
npm install
```

2. Configure environment variables in `/Users/x/Desktop/Barbersbar/.env.production`

## MCP Servers

### Firebase Server (`firebase-server.js`)
Handles Firebase configuration, validation, and deployment.

**Available Tools:**
- `validate_firebase_config` - Validate Firebase configuration files
- `check_firebase_cli` - Check Firebase CLI installation and auth
- `deploy_firebase_functions` - Deploy Cloud Functions
- `deploy_firestore` - Deploy Firestore rules and indexes
- `deploy_storage` - Deploy Storage rules
- `full_firebase_deploy` - Deploy all Firebase services

**Usage:**
```bash
node firebase-server.js
```

### Android Server (`android-server.js`)
Handles Android build configuration and EAS deployment.

**Available Tools:**
- `validate_android_config` - Validate Android build configuration
- `fix_android_config` - Fix common Android config issues
- `check_eas_cli` - Check EAS CLI installation and auth
- `build_android` - Build Android APK or AAB
- `generate_keystore` - Generate release keystore

**Usage:**
```bash
node android-server.js
```

### Play Store Server (`play-store-server.js`)
Handles Google Play Store requirements and metadata generation.

**Available Tools:**
- `validate_play_store_requirements` - Validate Play Store submission requirements
- `generate_play_store_metadata` - Generate store listing metadata
- `generate_listing_descriptions` - Generate multi-language descriptions
- `create_release_checklist` - Create deployment checklist

**Usage:**
```bash
node play-store-server.js
```

## Configuration

The MCP servers are configured in `/Users/x/Desktop/Barbersbar/mcp-server.json`:

```json
{
  "mcpServers": {
    "firebase-deploy": {
      "command": "node",
      "args": ["./mcp/firebase-server.js"],
      "env": {
        "FIREBASE_PROJECT_ID": "barbers-bar-ae31f",
        "ANDROID_PACKAGE_NAME": "com.barbersbar.app"
      }
    }
  }
}
```

## Validation

Run the complete setup validation:

```bash
node validate-setup.js
```

This will check:
- Firebase configuration
- Android build setup
- Google Play Store assets
- Environment variables
- CLI tools installation

## Environment Variables

Required environment variables (set in `.env.production`):

```bash
# Firebase
EXPO_PUBLIC_FIREBASE_PROJECT_ID=barbers-bar-ae31f
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAKEPu7-naLTdeBGAu5dVyvDuGKsFz2E4c

# EAS
EAS_PROJECT_ID=3db35a0e-d2db-4dbd-9138-7647c42f9fae

# Android
ANDROID_PACKAGE_NAME=com.barbersbar.app
ANDROID_VERSION_CODE=6
```

## Deployment Workflow

1. **Validate Setup:**
   ```bash
   node mcp/validate-setup.js
   ```

2. **Build Android:**
   ```bash
   ./scripts/deploy-android.sh
   ```

3. **Deploy Firebase:**
   ```bash
   # Deploy all Firebase services
   firebase deploy
   ```

4. **Submit to Play Store:**
   - Download the .aab file from EAS Build
   - Upload to Google Play Console
   - Complete store listing using generated metadata
   - Submit for review

## Troubleshooting

### Common Issues

1. **Package name mismatch:**
   - Ensure `com.barbersbar.app` is used consistently
   - Check `app.json`, `android/app/build.gradle`, and `google-services.json`

2. **Firebase configuration errors:**
   - Verify `google-services.json` is in the correct location
   - Ensure Firebase project ID matches environment variables

3. **EAS build failures:**
   - Check credentials are properly configured
   - Verify Google Services plugin is added to build.gradle

### Getting Help

1. Check the validation report: `validation-report.json`
2. Review deployment checklist: `google-play/deployment-checklist.md`
3. Check Firebase console for any service issues
4. Review EAS build logs for detailed error information

## Security Notes

- Never commit `.env` files or actual credentials to version control
- Use EAS credentials service for production signing
- Restrict Firebase API keys to specific applications
- Review Firestore and Storage security rules before deployment