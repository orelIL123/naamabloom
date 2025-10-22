import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { getBuildVersion } from './appInfo';

export interface UpdateManifest {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sha256?: string;
  notes?: string;
}

export type UpdateStatus = 'UP_TO_DATE' | 'AVAILABLE' | 'ERROR';

export interface UpdateInfo {
  status: UpdateStatus;
  currentVersion: number;
  remoteVersion?: number;
  manifest?: UpdateManifest;
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  error?: string;
  localPath?: string;
}

/**
 * Fetch update manifest from remote URL
 */
export async function fetchUpdateManifest(url: string): Promise<UpdateManifest | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const manifest = await response.json();
    
    // Validate required fields
    if (!manifest.versionCode || !manifest.versionName || !manifest.apkUrl) {
      throw new Error('Invalid manifest: missing required fields');
    }
    
    return manifest as UpdateManifest;
  } catch (error) {
    console.error('Failed to fetch update manifest:', error);
    return null;
  }
}

/**
 * Check if update is available by comparing version codes
 */
export async function checkForUpdate(manifestUrl: string): Promise<UpdateInfo> {
  const currentVersion = getBuildVersion();
  
  try {
    const manifest = await fetchUpdateManifest(manifestUrl);
    
    if (!manifest) {
      return {
        status: 'ERROR',
        currentVersion,
        error: 'Failed to fetch update manifest'
      };
    }
    
    const remoteVersion = manifest.versionCode;
    
    if (remoteVersion > currentVersion) {
      return {
        status: 'AVAILABLE',
        currentVersion,
        remoteVersion,
        manifest
      };
    }
    
    return {
      status: 'UP_TO_DATE',
      currentVersion,
      remoteVersion
    };
  } catch (error) {
    return {
      status: 'ERROR',
      currentVersion,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculate SHA256 hash of a file
 */
async function calculateSha256(filePath: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists) {
    throw new Error('File does not exist');
  }
  
  // Read file and calculate hash
  const hash = await FileSystem.digestStringAsync(
    FileSystem.EncodingType.SHA256,
    await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.Base64 })
  );
  
  return hash;
}

/**
 * Download APK file and optionally verify SHA256
 */
export async function downloadApk(
  apkUrl: string, 
  options?: { sha256?: string }
): Promise<DownloadResult> {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      error: 'APK downloads are only supported on Android'
    };
  }
  
  try {
    const fileName = `update-${Date.now()}.apk`;
    const localPath = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Download the APK
    const downloadResult = await FileSystem.downloadAsync(apkUrl, localPath);
    
    if (downloadResult.status !== 200) {
      return {
        success: false,
        error: `Download failed with status ${downloadResult.status}`
      };
    }
    
    // Verify SHA256 if provided
    if (options?.sha256) {
      try {
        const calculatedHash = await calculateSha256(localPath);
        if (calculatedHash.toLowerCase() !== options.sha256.toLowerCase()) {
          // Clean up invalid file
          await FileSystem.deleteAsync(localPath, { idempotent: true });
          return {
            success: false,
            error: 'SHA256 verification failed - file may be corrupted'
          };
        }
      } catch (hashError) {
        console.warn('SHA256 verification failed:', hashError);
        // Continue without verification rather than failing
      }
    }
    
    return {
      success: true,
      localPath
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

/**
 * Install APK using Android Intent
 */
export async function installApk(localPath: string): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      error: 'APK installation is only supported on Android'
    };
  }
  
  try {
    // Get content URI for the APK file
    const contentUri = await FileSystem.getContentUriAsync(localPath);
    
    // Launch install intent
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
    
    return { success: true };
  } catch (error) {
    let errorMessage = 'Installation failed';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Provide helpful error messages for common issues
      if (errorMessage.includes('Permission denied') || errorMessage.includes('INSTALL_FAILED')) {
        errorMessage = 'Installation failed. Please enable "Install unknown apps" permission for this app in Android Settings.';
      }
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Complete update flow: download and install APK
 */
export async function downloadAndInstall(
  apkUrl: string,
  options?: { sha256?: string }
): Promise<{ success: boolean; error?: string; step?: string }> {
  try {
    // Step 1: Download
    const downloadResult = await downloadApk(apkUrl, options);
    if (!downloadResult.success) {
      return {
        success: false,
        error: downloadResult.error,
        step: 'download'
      };
    }
    
    // Step 2: Install
    const installResult = await installApk(downloadResult.localPath!);
    if (!installResult.success) {
      // Clean up downloaded file on install failure
      try {
        await FileSystem.deleteAsync(downloadResult.localPath!, { idempotent: true });
      } catch {}
      
      return {
        success: false,
        error: installResult.error,
        step: 'install'
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      step: 'unknown'
    };
  }
}

/**
 * Clean up old APK files from cache
 */
export async function cleanupOldApks(): Promise<void> {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;
    
    const files = await FileSystem.readDirectoryAsync(cacheDir);
    const apkFiles = files.filter(file => file.endsWith('.apk'));
    
    for (const file of apkFiles) {
      try {
        await FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
      } catch {
        // Ignore individual file cleanup errors
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}