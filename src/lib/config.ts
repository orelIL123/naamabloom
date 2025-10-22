import Constants from 'expo-constants';

/**
 * Configuration for the app update system
 * 
 * To use this system for a specific client:
 * 1. Set UPDATE_JSON_URL in your .env file or environment variables
 * 2. Host your update.json file at that URL with client-specific APK URLs
 * 
 * Example .env:
 * EXPO_PUBLIC_UPDATE_JSON_URL=https://yourdomain.com/updates/client123/update.json
 */

// Default fallback URL - replace with your actual update server
const DEFAULT_UPDATE_URL = 'https://orell123.github.io/barbers-bar-updates/update.json';

/**
 * Get the update JSON URL from environment variables or use default
 */
export function getUpdateUrl(): string {
  // Try to get from expo public env first
  const envUrl = Constants.expoConfig?.extra?.updateJsonUrl || 
                 process.env.EXPO_PUBLIC_UPDATE_JSON_URL;
  
  if (envUrl) {
    return envUrl;
  }

  // Log warning if no URL is configured
  if (__DEV__) {
    console.warn(
      'UPDATE_JSON_URL not configured. Add EXPO_PUBLIC_UPDATE_JSON_URL to your .env file or set updateJsonUrl in app.json extra config.'
    );
  }

  return DEFAULT_UPDATE_URL;
}

/**
 * Check if updates are enabled for this build
 */
export function areUpdatesEnabled(): boolean {
  // Enable updates in both development and production
  // EAS Updates work in both modes
  return true;
}

/**
 * Per-client configuration guide:
 * 
 * Option 1: Environment Variables (.env file)
 * Add to your .env file:
 * EXPO_PUBLIC_UPDATE_JSON_URL=https://storage.googleapis.com/your-bucket/clients/CLIENT_ID/update.json
 * 
 * Option 2: App.json extra config
 * Add to app.json:
 * {
 *   "expo": {
 *     "extra": {
 *       "updateJsonUrl": "https://your-server.com/clients/CLIENT_ID/update.json"
 *     }
 *   }
 * }
 * 
 * Option 3: Build-time configuration
 * Set environment variable when building:
 * EXPO_PUBLIC_UPDATE_JSON_URL=https://... eas build --profile preview --platform android
 */