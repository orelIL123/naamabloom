import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getCurrentUser, getUserNotifications, markNotificationAsRead, NotificationData } from '../../services/firebase';
import TopNav from '../components/TopNav';

interface NotificationsScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onNavigate, onBack }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [appointmentNotifications, setAppointmentNotifications] = useState(true);
  const [generalNotifications, setGeneralNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const userNotifications = await getUserNotifications(currentUser.uid);
        setNotifications(userNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'confirmation':
        return 'calendar';
      case 'reminder':
        return 'alarm';
      case 'cancellation':
        return 'close-circle';
      case 'general':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'confirmation':
        return '#007bff';
      case 'reminder':
        return '#FF9800';
      case 'cancellation':
        return '#ef4444';
      case 'general':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} ימים`;
    } else if (diffInHours > 0) {
      return `${diffInHours} שעות`;
    } else {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes > 0) {
        return `${diffInMinutes} דקות`;
      } else {
        return 'עכשיו';
      }
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (notification.type === 'appointment' || notification.type === 'confirmation' || notification.type === 'reminder') {
      return appointmentNotifications;
    }
    if (notification.type === 'general' || notification.type === 'cancellation') {
      return generalNotifications;
    }
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="התראות"
          onBackPress={onBack || (() => onNavigate('home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען התראות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="התראות"
        onBackPress={onBack || (() => onNavigate('home'))}
      />
      
      <View style={styles.content}>
        {/* Notification Settings */}
        <View style={styles.settingsContainer}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>התראות תורים</Text>
            <Switch
              value={appointmentNotifications}
              onValueChange={setAppointmentNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={appointmentNotifications ? '#f5f5f5' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>התראות כלליות</Text>
            <Switch
              value={generalNotifications}
              onValueChange={setGeneralNotifications}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={generalNotifications ? '#f5f5f5' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Notifications List */}
        <ScrollView 
          style={styles.notificationsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>אין התראות חדשות</Text>
              <Text style={styles.emptyStateSubtext}>כשתהיה לך התראה חדשה, היא תופיע כאן</Text>
            </View>
          ) : (
            filteredNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.isRead && styles.unreadNotification
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons 
                    name={getNotificationIcon(notification.type)} 
                    size={24} 
                    color={getNotificationColor(notification.type)} 
                  />
                </View>
                
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(notification.createdAt)}
                  </Text>
                </View>
                
                {!notification.isRead && (
                  <View style={styles.unreadIndicator} />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  settingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  notificationsList: {
    marginBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
    textAlign: 'right',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    textAlign: 'right',
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'right',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  unreadNotification: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
});

export default NotificationsScreen;