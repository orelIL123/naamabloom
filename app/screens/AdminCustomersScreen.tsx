import { Ionicons } from '@expo/vector-icons';
import { collection, deleteDoc, doc, getDocs, getFirestore, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

interface Customer {
  id: string;
  uid: string;
  displayName: string;
  phoneNumber: string;
  email?: string;
  createdAt?: any;
}

interface AdminCustomersScreenProps {
  onNavigate: (screen: string) => void;
  onBack?: () => void;
}

const AdminCustomersScreen: React.FC<AdminCustomersScreenProps> = ({ onNavigate, onBack }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const db = getFirestore();

      // Load users from the users collection
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(query(usersRef));

      const customersList: Customer[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include non-admin users
        if (!data.role || data.role === 'user') {
          customersList.push({
            id: doc.id,
            uid: doc.id,
            displayName: data.displayName || data.name || 'לקוח ללא שם',
            phoneNumber: data.phoneNumber || data.phone || 'אין טלפון',
            email: data.email || '',
            createdAt: data.createdAt || null
          });
        }
      });

      // Sort by creation date (newest first)
      customersList.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      });

      setCustomers(customersList);
      console.log(`✅ Loaded ${customersList.length} customers`);
    } catch (error) {
      console.error('Error loading customers:', error);
      showToast('שגיאה בטעינת הלקוחות', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, visible: false });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const handleCallCustomer = (phoneNumber: string) => {
    if (phoneNumber === 'אין טלפון') {
      Alert.alert('שגיאה', 'אין מספר טלפון ללקוח זה');
      return;
    }

    // Clean phone number
    const cleanedNumber = phoneNumber.replace(/\D/g, '');

    Alert.alert(
      'התקשר ללקוח',
      `האם להתקשר למספר ${phoneNumber}?`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התקשר',
          onPress: () => {
            const phoneUrl = `tel:${cleanedNumber}`;
            Linking.openURL(phoneUrl).catch((err) => {
              console.error('Error opening phone app:', err);
              Alert.alert('שגיאה', 'לא ניתן לפתוח את אפליקציית הטלפון');
            });
          }
        }
      ]
    );
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    Alert.alert(
      'מחיקת לקוח',
      `האם אתה בטוח שברצונך למחוק את ${customer.displayName}?\n\nפעולה זו תמחק את הלקוח מהמערכת לצמיתות, כולל:\n• פרטי הלקוח\n• כל התורים שלו\n• כל ההיסטוריה שלו\n\nלא ניתן לבטל פעולה זו!`,
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק לצמיתות',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🗑️ Deleting customer: ${customer.displayName} (${customer.uid})`);
              const db = getFirestore();

              // Delete user document
              await deleteDoc(doc(db, 'users', customer.uid));
              console.log('✅ User document deleted');

              // Delete all appointments for this user
              const appointmentsRef = collection(db, 'appointments');
              const appointmentsQuery = query(appointmentsRef);
              const appointmentsSnapshot = await getDocs(appointmentsQuery);

              let deletedAppointments = 0;
              const deletePromises: Promise<void>[] = [];

              appointmentsSnapshot.forEach((appointmentDoc) => {
                const appointmentData = appointmentDoc.data();
                if (appointmentData.userId === customer.uid) {
                  deletePromises.push(deleteDoc(doc(db, 'appointments', appointmentDoc.id)));
                  deletedAppointments++;
                }
              });

              await Promise.all(deletePromises);
              console.log(`✅ Deleted ${deletedAppointments} appointments`);

              showToast(`הלקוח ${customer.displayName} נמחק בהצלחה`, 'success');

              // Reload customers
              await loadCustomers();
            } catch (error) {
              console.error('Error deleting customer:', error);
              showToast('שגיאה במחיקת הלקוח', 'error');
            }
          }
        }
      ]
    );
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.customerIcon}>
          <Ionicons name="person" size={32} color="#007bff" />
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.displayName}</Text>
          <View style={styles.customerDetailRow}>
            <Ionicons name="call" size={14} color="#666" />
            <Text style={styles.customerPhone}>{item.phoneNumber}</Text>
          </View>
          {item.email && (
            <View style={styles.customerDetailRow}>
              <Ionicons name="mail" size={14} color="#666" />
              <Text style={styles.customerEmail}>{item.email}</Text>
            </View>
          )}
          {item.createdAt && (
            <View style={styles.customerDetailRow}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.customerDate}>
                נרשם: {new Date(item.createdAt.toDate()).toLocaleDateString('he-IL')}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.customerActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={() => handleCallCustomer(item.phoneNumber)}
        >
          <Ionicons name="call" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>התקשר</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCustomer(item)}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav
          title="רשימת לקוחות"
          onBellPress={() => {}}
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate('admin-home'))}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>טוען לקוחות...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav
        title="רשימת לקוחות"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate('admin-home'))}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>לקוחות רשומים</Text>
            <Text style={styles.headerSubtitle}>סה"כ {customers.length} לקוחות</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>

        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>אין לקוחות רשומים במערכת</Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            renderItem={renderCustomerItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>

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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  listContainer: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  customerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    textAlign: 'right',
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
  },
  customerDate: {
    fontSize: 12,
    color: '#999',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  callButton: {
    backgroundColor: '#28a745',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default AdminCustomersScreen;
