import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { checkForUpdate, downloadAndInstall, UpdateInfo } from '../lib/updater';

interface UpdateBannerProps {
  updateUrl: string;
  onUpdateCheck?: (updateInfo: UpdateInfo) => void;
  style?: any;
  autoCheck?: boolean;
}

export function UpdateBanner({ 
  updateUrl, 
  onUpdateCheck, 
  style, 
  autoCheck = true 
}: UpdateBannerProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkUpdate = async () => {
    if (!updateUrl || Platform.OS !== 'android') return;
    
    setIsChecking(true);
    try {
      const info = await checkForUpdate(updateUrl);
      setUpdateInfo(info);
      onUpdateCheck?.(info);
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateInfo({
        status: 'ERROR',
        currentVersion: 0,
        error: 'Failed to check for updates'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo?.manifest?.apkUrl) return;

    Alert.alert(
      'עדכון אפליקציה',
      `האם ברצונך להוריד ולהתקין את הגרסה ${updateInfo.manifest.versionName}?\n\n${updateInfo.manifest.notes || 'שיפורים כלליים ותיקוני באגים'}`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'עדכן עכשיו',
          onPress: performUpdate
        }
      ]
    );
  };

  const performUpdate = async () => {
    if (!updateInfo?.manifest) return;

    setIsUpdating(true);
    
    try {
      const result = await downloadAndInstall(
        updateInfo.manifest.apkUrl,
        { sha256: updateInfo.manifest.sha256 }
      );

      if (!result.success) {
        if (result.step === 'install' && result.error?.includes('Install unknown apps')) {
          showInstallPermissionDialog();
        } else {
          Alert.alert(
            'שגיאה בעדכון',
            result.error || 'העדכון נכשל',
            [{ text: 'אישור' }]
          );
        }
      }
    } catch (error) {
      Alert.alert(
        'שגיאה בעדכון',
        'אירעה שגיאה בלתי צפויה',
        [{ text: 'אישור' }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const showInstallPermissionDialog = () => {
    Alert.alert(
      'הרשאה נדרשת',
      'כדי להתקין את העדכון, יש צורך לאפשר התקנת אפליקציות ממקורות לא ידועים.\n\nהאפליקציה תנסה לפתוח את הגדרות המכשיר. חפש את האפשרות "התקנת אפליקציות לא ידועות" או "Install unknown apps".',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'פתח הגדרות',
          onPress: () => {
            // Try to open app settings
            Linking.openSettings().catch(() => {
              Alert.alert(
                'לא ניתן לפתוח הגדרות',
                'אנא פתח ידנית הגדרות > אפליקציות > הרשאות מיוחדות > התקנת אפליקציות לא ידועות',
                [{ text: 'הבנתי' }]
              );
            });
          }
        },
        {
          text: 'ניסיתי, המשך',
          onPress: performUpdate
        }
      ]
    );
  };

  const retryCheck = () => {
    setUpdateInfo(null);
    checkUpdate();
  };

  useEffect(() => {
    if (autoCheck && Platform.OS === 'android') {
      checkUpdate();
    }
  }, [updateUrl, autoCheck]);

  // Don't render on iOS
  if (Platform.OS !== 'android') {
    return null;
  }

  // Show loading state
  if (isChecking) {
    return (
      <View style={[styles.banner, styles.loadingBanner, style]}>
        <ActivityIndicator size="small" color="#666" />
        <Text style={styles.loadingText}>בודק עדכונים...</Text>
      </View>
    );
  }

  // Show error state
  if (updateInfo?.status === 'ERROR') {
    return (
      <View style={[styles.banner, styles.errorBanner, style]}>
        <Text style={styles.errorText}>שגיאה בבדיקת עדכונים</Text>
        <TouchableOpacity onPress={retryCheck} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>נסה שוב</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show update available
  if (updateInfo?.status === 'AVAILABLE') {
    return (
      <View style={[styles.banner, styles.updateBanner, style]}>
        <View style={styles.updateInfo}>
          <Text style={styles.updateTitle}>
            עדכון זמין (v{updateInfo.manifest?.versionName})
          </Text>
          {updateInfo.manifest?.notes && (
            <Text style={styles.updateNotes} numberOfLines={2}>
              {updateInfo.manifest.notes}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={handleUpdate} 
          style={[styles.updateButton, isUpdating && styles.updatingButton]}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>עדכן עכשיו</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Don't show banner if up to date or no update info
  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingBanner: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#fee',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    color: '#c33',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#c33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  updateBanner: {
    backgroundColor: '#e3f2fd',
    justifyContent: 'space-between',
  },
  updateInfo: {
    flex: 1,
    marginRight: 12,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 2,
  },
  updateNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  updateButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatingButton: {
    backgroundColor: '#999',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

// Manual update check component for settings
export function UpdateCheckButton({ 
  updateUrl, 
  style,
  onResult 
}: { 
  updateUrl: string; 
  style?: any;
  onResult?: (result: UpdateInfo) => void;
}) {
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('לא זמין', 'בדיקת עדכונים זמינה רק באנדרואיד');
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkForUpdate(updateUrl);
      onResult?.(result);

      if (result.status === 'UP_TO_DATE') {
        Alert.alert(
          'אין עדכונים',
          `אתה משתמש בגרסה העדכנית ביותר (v${result.currentVersion})`,
          [{ text: 'אישור' }]
        );
      } else if (result.status === 'ERROR') {
        Alert.alert(
          'שגיאה',
          result.error || 'לא ניתן לבדוק עדכונים כעת',
          [{ text: 'אישור' }]
        );
      }
      // If AVAILABLE, the UpdateBanner will handle the UI
    } catch (error) {
      Alert.alert('שגיאה', 'בדיקת העדכונים נכשלה', [{ text: 'אישור' }]);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.checkButton, style]}
      onPress={handleManualCheck}
      disabled={isChecking}
    >
      {isChecking ? (
        <ActivityIndicator size="small" color="#1976d2" />
      ) : (
        <Text style={styles.checkButtonText}>בדוק עדכונים</Text>
      )}
    </TouchableOpacity>
  );
}

const checkButtonStyles = StyleSheet.create({
  checkButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignItems: 'center',
  },
  checkButtonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
  },
});

// Merge styles
Object.assign(styles, checkButtonStyles);