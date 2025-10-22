import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    getAvailableNotificationTypes,
    getNotificationDescription,
    getNotificationDisplayName,
    getNotificationSettings,
    NotificationSettings,
    NotificationType,
    toggleAllNotifications,
    toggleNotification,
    updateReminderTimes
} from '../../services/notificationSettings';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface AdminNotificationSettingsScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

const AdminNotificationSettingsScreen: React.FC<AdminNotificationSettingsScreenProps> = ({ 
  onNavigate, 
  onBack 
}) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // For admin, we'll use a hardcoded admin ID or get it from auth
      const adminId = 'admin'; // You might want to get this from auth context
      const notificationSettings = await getNotificationSettings(adminId, 'admin');
      setSettings(notificationSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      showToast('שגיאה בטעינת הגדרות התראות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleToggleAll = async (enabled: boolean) => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await toggleAllNotifications(settings.userId, enabled);
      setSettings(prev => prev ? { ...prev, enabled } : null);
      showToast(enabled ? 'כל ההתראות הופעלו' : 'כל ההתראות הושבתו');
    } catch (error) {
      console.error('Error toggling all notifications:', error);
      showToast('שגיאה בעדכון הגדרות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = async (type: NotificationType, enabled: boolean) => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await toggleNotification(settings.userId, type, enabled);
      setSettings(prev => prev ? {
        ...prev,
        notifications: {
          ...prev.notifications,
          [type]: enabled
        }
      } : null);
      showToast(enabled ? 'התראה הופעלה' : 'התראה הושבתה');
    } catch (error) {
      console.error('Error toggling notification:', error);
      showToast('שגיאה בעדכון התראה', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReminderTimes = async (times: number[]) => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await updateReminderTimes(settings.userId, times);
      setSettings(prev => prev ? {
        ...prev,
        reminderTimes: {
          ...prev.reminderTimes,
          times
        }
      } : null);
      showToast('זמני התזכורות עודכנו');
    } catch (error) {
      console.error('Error updating reminder times:', error);
      showToast('שגיאה בעדכון זמני התזכורות', 'error');
    } finally {
      setSaving(false);
    }
  };

  const availableNotificationTypes = getAvailableNotificationTypes('admin');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="הגדרות התראות"
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate && onNavigate('admin-home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען הגדרות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="הגדרות התראות"
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate && onNavigate('admin-home'))}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>שגיאה בטעינת ההגדרות</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="הגדרות התראות"
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate && onNavigate('admin-home'))}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications" size={24} color="#007bff" />
            <Text style={styles.sectionTitle}>התראות כלליות</Text>
          </View>
          
          <View style={styles.masterToggleContainer}>
            <View style={styles.masterToggleInfo}>
              <Text style={styles.masterToggleTitle}>הפעל/השבת כל ההתראות</Text>
              <Text style={styles.masterToggleDescription}>
                שליטה מרכזית על כל סוגי ההתראות
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleAll}
              disabled={saving}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={settings.enabled ? '#007bff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={24} color="#007bff" />
            <Text style={styles.sectionTitle}>סוגי התראות</Text>
          </View>
          
          {availableNotificationTypes.map((type) => {
            // Group notifications by category for better UI
            const isAppointmentNotification = type.includes('appointment') && !type.includes('reminder');
            const isReminderNotification = type.includes('reminder');
            const isSystemNotification = ['push_notifications', 'sms_notifications', 'local_reminders'].includes(type);
            
            return (
              <View key={type} style={[
                styles.notificationItem,
                isSystemNotification && styles.systemNotificationItem
              ]}>
                <View style={styles.notificationInfo}>
                  <Text style={[
                    styles.notificationTitle,
                    isSystemNotification && styles.systemNotificationTitle
                  ]}>
                    {getNotificationDisplayName(type)}
                  </Text>
                  <Text style={[
                    styles.notificationDescription,
                    isSystemNotification && styles.systemNotificationDescription
                  ]}>
                    {getNotificationDescription(type)}
                  </Text>
                </View>
                <Switch
                  value={settings.notifications[type]}
                  onValueChange={(enabled) => handleToggleNotification(type, enabled)}
                  disabled={!settings.enabled || saving}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={settings.notifications[type] ? '#007bff' : '#f4f3f4'}
                />
              </View>
            );
          })}
        </View>

        {/* Reminder Times */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color="#007bff" />
            <Text style={styles.sectionTitle}>זמני תזכורות</Text>
          </View>
          
          <View style={styles.reminderTimesContainer}>
            <Text style={styles.reminderTimesDescription}>
              בחר מתי לקבל תזכורות לפני תורים
            </Text>
            
            <View style={styles.reminderTimesGrid}>
              {[10, 15, 30, 60].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.reminderTimeButton,
                    settings.reminderTimes.times.includes(minutes) && styles.reminderTimeButtonActive
                  ]}
                  onPress={() => {
                    const newTimes = settings.reminderTimes.times.includes(minutes)
                      ? settings.reminderTimes.times.filter(t => t !== minutes)
                      : [...settings.reminderTimes.times, minutes].sort((a, b) => a - b);
                    handleUpdateReminderTimes(newTimes);
                  }}
                  disabled={saving}
                >
                  <Text style={[
                    styles.reminderTimeText,
                    settings.reminderTimes.times.includes(minutes) && styles.reminderTimeTextActive
                  ]}>
                    {minutes} דק
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.infoText}>
              ההגדרות נשמרות אוטומטית ונכנסות לתוקף מיד
            </Text>
          </View>
        </View>
      </ScrollView>

      <ToastMessage
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  masterToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterToggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  masterToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  masterToggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  reminderTimesContainer: {
    marginTop: 8,
  },
  reminderTimesDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reminderTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  reminderTimeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  reminderTimeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reminderTimeTextActive: {
    color: '#fff',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    flex: 1,
  },
  // Styles for system notification categories (technical notifications)
  systemNotificationItem: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    paddingVertical: 16,
  },
  systemNotificationTitle: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  systemNotificationDescription: {
    color: '#0056b3',
  },
});

export default AdminNotificationSettingsScreen;
