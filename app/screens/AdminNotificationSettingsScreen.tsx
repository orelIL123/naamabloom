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
  console.log('🎯 AdminNotificationSettingsScreen component mounted!');
  console.log('🎯 onNavigate prop:', typeof onNavigate);
  console.log('🎯 onBack prop:', typeof onBack);
  
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
    console.log('🎯 AdminNotificationSettingsScreen useEffect triggered');
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🎯 loadSettings started');
      setLoading(true);
      const user = auth.currentUser;
      console.log('🎯 Current user:', user?.uid || 'No user');
      
      if (!user) {
        console.log('🎯 No user found, stopping load');
        setLoading(false);
        return;
      }

      console.log('🎯 Attempting to load settings from Firestore...');
      const settingsDoc = await getDoc(doc(db, 'adminNotifications', user.uid));
      console.log('🎯 Settings doc exists:', settingsDoc.exists());
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        console.log('🎯 Settings data:', data);
        setSettings({ ...settings, ...data });
      } else {
        console.log('🎯 No settings doc found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
      showToast('שגיאה בטעינת הגדרות התראות', 'error');
    } finally {
      console.log('🎯 loadSettings finished');
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(doc(db, 'adminNotifications', user.uid), {
        ...newSettings,
        updatedAt: new Date()
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

        <View style={styles.settingsContainer}>
          {settingsConfig.map((item) => (
            <View key={item.key} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingHeader}>
                  <Ionicons 
                    name={item.icon} 
                    size={24} 
                    color="#ff69b4" 
                    style={styles.settingIcon}
                  />
                  <Text style={styles.settingTitle}>{item.title}</Text>
                </View>
                <Text style={styles.settingDescription}>{item.description}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggleSetting(item.key)}
                trackColor={{ false: '#767577', true: '#ff69b4' }}
                thumbColor={settings[item.key] ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                disabled={loading}
              />
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle" size={20} color="#6c757d" />
          <Text style={styles.infoText}>
            התראות יישלחו בזמן אמת כאשר מתרחשים אירועים במערכת. 
            ניתן לשנות הגדרות אלו בכל עת.
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
    marginBottom: 24,
    paddingVertical: 20,
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
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36,
    lineHeight: 20,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
    marginLeft: 8,
    textAlign: 'right',
  },
});

export default AdminNotificationSettingsScreen;