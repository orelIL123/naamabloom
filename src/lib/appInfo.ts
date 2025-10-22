import Constants from 'expo-constants';

/**
 * Get the Android version code (integer) from expo config
 * This is used for version comparison with remote updates
 */
export function getBuildVersion(): number {
  return Constants.expoConfig?.android?.versionCode ?? 1;
}

/**
 * Get the display version (string) from expo config
 * This is shown to users in the UI
 */
export function getDisplayVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/**
 * Get app name from expo config
 */
export function getAppName(): string {
  return Constants.expoConfig?.name ?? 'Barbersbar';
}

/**
 * Get current app info object
 */
export function getCurrentAppInfo() {
  return {
    buildVersion: getBuildVersion(),
    displayVersion: getDisplayVersion(),
    appName: getAppName(),
  };
}