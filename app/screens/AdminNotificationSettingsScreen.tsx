import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface NotificationSettings {
  newAppointment: boolean;
  canceledAppointment: boolean;
  newUser: boolean;
  appointmentReminders: boolean;
  upcomingAppointments: boolean;
}

interface AdminNotificationSettingsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminNotificationSettingsScreen: React.FC<AdminNotificationSettingsScreenProps> = ({ 
  onNavigate, 
  onBack 
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    newAppointment: true,
    canceledAppointment: true,
    newUser: true,
    appointmentReminders: true,
    upcomingAppointments: true,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) return;

      const settingsDoc = await getDoc(doc(db, 'adminNotifications', user.uid));
      if (settingsDoc.exists()) {
        setSettings({ ...settings, ...settingsDoc.data() });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      showToast('שגיאה בטעינת הגדרות התראות', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(doc(db, 'adminNotifications', user.uid), {
        ...newSettings,
        updatedAt: new Date(),
        userId: user.uid,
      });

      setSettings(newSettings);
      showToast('הגדרות ההתראות נשמרו בהצלחה', 'success');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showToast('שגיאה בשמירת הגדרות התראות', 'error');
    }
  };

  const toggleSetting = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    await saveSettings(newSettings);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const settingsConfig = [
    {
      key: 'newAppointment' as keyof NotificationSettings,
      title: 'תור חדש נקבע',
      description: 'קבל התראה כאשר לקוח קובע תור חדש',
      icon: 'calendar' as const,
    },
    {
      key: 'canceledAppointment' as keyof NotificationSettings,
      title: 'תור בוטל',
      description: 'קבל התראה כאשר לקוח מבטל תור',
      icon: 'close-circle' as const,
    },
    {
      key: 'newUser' as keyof NotificationSettings,
      title: 'משתמש חדש נרשם',
      description: 'קבל התראה כאשר משתמש חדש נרשם לאפליקציה',
      icon: 'person-add' as const,
    },
    {
      key: 'appointmentReminders' as keyof NotificationSettings,
      title: 'תזכורות תורים',
      description: 'שלח תזכורות ללקוחות לפני התור',
      icon: 'alarm' as const,
    },
    {
      key: 'upcomingAppointments' as keyof NotificationSettings,
      title: 'תורים קרובים',
      description: 'קבל התראה על תורים שמתקרבים',
      icon: 'time' as const,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="הגדרות התראות"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack}
      />

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="notifications" size={32} color="#ff69b4" />
          <Text style={styles.headerTitle}>הגדרות התראות אדמין</Text>
          <Text style={styles.headerSubtitle}>
            בחר אילו התראות תרצה לקבל כמנהל המערכת
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>טוען הגדרות...</Text>
          </View>
        ) : (
          <View style={styles.settingsList}>
            {settingsConfig.map((config) => (
              <View key={config.key} style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <View style={styles.settingIcon}>
                    <Ionicons name={config.icon} size={24} color="#ff69b4" />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>{config.title}</Text>
                    <Text style={styles.settingDescription}>{config.description}</Text>
                  </View>
                </View>
                <Switch
                  value={settings[config.key]}
                  onValueChange={() => toggleSetting(config.key)}
                  thumbColor={settings[config.key] ? '#ff69b4' : '#f4f3f4'}
                  trackColor={{ false: '#767577', true: '#ffb3d9' }}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007bff" />
          <Text style={styles.infoText}>
            התראות יישלחו כ-Push Notifications באפליקציה ועלולות להישלח גם כ-SMS/WhatsApp בהתאם להגדרות המערכת.
          </Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  settingsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff0f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'right',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 8,
    textAlign: 'right',
  },
});

export default AdminNotificationSettingsScreen;
