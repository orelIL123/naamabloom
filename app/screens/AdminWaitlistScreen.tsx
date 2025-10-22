import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    Barber,
    cleanupExpiredWaitlistEntries,
    getBarbers,
    listenWaitlistChanges,
    removeFromWaitlist,
    updateWaitlistStatus,
    WaitlistEntry
} from '../../services/firebase';
import { auth } from '../config/firebase';
import ToastMessage from '../components/ToastMessage';
import TopNav from '../components/TopNav';

const { width } = Dimensions.get('window');

interface AdminWaitlistScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
}

const AdminWaitlistScreen: React.FC<AdminWaitlistScreenProps> = ({ onNavigate, onBack }) => {
  console.log('🎯 AdminWaitlistScreen component rendered');
  
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'notify' | 'remove'>('notify');
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadData();
  }, []);

  // Set up waitlist listener
  useEffect(() => {
    console.log('🔊 Setting up waitlist listener for admin');
    const unsubscribe = listenWaitlistChanges((waitlistData) => {
      console.log('📡 Admin received waitlist update:', waitlistData.length, 'entries');
      setWaitlistEntries(waitlistData);
    });

    return () => {
      console.log('🔇 Cleaning up waitlist listener');
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getAllWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
    const db = getFirestore();
    const snapshot = await getDocs(collection(db, 'waitlist'));
    return snapshot.docs.map(doc => ({ waitlistId: doc.id, ...doc.data() } as WaitlistEntry));
  };

  const loadData = async () => {
    try {
      console.log('🔄 Starting to load waitlist data...');
      setLoading(true);

      // First cleanup expired entries
      await cleanupExpiredWaitlistEntries();

      const [barbersData, waitlistData] = await Promise.all([
        getBarbers(),
        getAllWaitlistEntries()
      ]);

      // Check if current user is a barber
      const currentUser = auth.currentUser;
      if (currentUser) {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData?.role;
          const userBarberId = userData?.barberId;

          // If user is a barber, filter to show only their own waitlist
          if (userRole === 'barber' && userBarberId) {
            const filteredWaitlist = waitlistData.filter(entry => entry.barberId === userBarberId);
            console.log('✅ Barber data loaded:', { waitlist: filteredWaitlist.length });
            setBarbers(barbersData.filter(b => b.id === userBarberId));
            setWaitlistEntries(filteredWaitlist);
            setLoading(false);
            return;
          }
        }
      }

      // Admin - show all
      console.log('✅ Data loaded successfully:', { barbers: barbersData.length, waitlist: waitlistData.length });
      setBarbers(barbersData);
      setWaitlistEntries(waitlistData);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      showToast('שגיאה בטעינת נתונים', 'error');
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

  const handleWaitlistAction = async (entry: WaitlistEntry, action: 'notify' | 'remove', notes?: string) => {
    try {
      if (action === 'notify') {
        await updateWaitlistStatus(entry.waitlistId, 'notified', notes);
        showToast('הלקוח קיבל הודעה', 'success');
      } else if (action === 'remove') {
        await removeFromWaitlist(entry.waitlistId, notes);
        showToast('הלקוח הוסר מהרשימה', 'success');
      }
    } catch (error) {
      console.error('Error handling waitlist action:', error);
      showToast('שגיאה בפעולה', 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const day = hebrewDays[date.getDay()];
    return `${day} ${date.getDate()}/${date.getMonth() + 1}`;
  };

  const formatTimeRange = (entry: WaitlistEntry) => {
    // Support both old and new format
    if (entry.requestedTimeStart && entry.requestedTimeEnd) {
      return `${entry.requestedTimeStart} - ${entry.requestedTimeEnd}`;
    } else if (entry.requestedTime) {
      return entry.requestedTime; // Legacy format
    }
    return 'לא צוין';
  };

  const getBarberName = (barberId: string) => {
    const barber = barbers.find(b => b.id === barberId);
    return barber ? barber.name : 'לא ידוע';
  };

  const openActionModal = (entry: WaitlistEntry, type: 'notify' | 'remove') => {
    setSelectedEntry(entry);
    setActionType(type);
    setActionModalVisible(true);
  };

  const handleAction = async () => {
    if (selectedEntry) {
      await handleWaitlistAction(selectedEntry, actionType, notes);
      setActionModalVisible(false);
      setSelectedEntry(null);
      setNotes('');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNav 
          title="רשימת המתנה"
          onBellPress={() => {}}
          onMenuPress={() => {}}
          showBackButton={true}
          onBackPress={onBack || (() => onNavigate?.('admin-home'))}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>טוען רשימת המתנה...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopNav 
        title="רשימת המתנה"
        onBellPress={() => {}}
        onMenuPress={() => {}}
        showBackButton={true}
        onBackPress={onBack || (() => onNavigate?.('admin-home'))}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>רשימת המתנה</Text>
          <Text style={styles.headerSubtitle}>
            ניהול לקוחות שממתינים לתורים
          </Text>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{waitlistEntries.length}</Text>
            <Text style={styles.statLabel}>סך הכל ברשימה</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {new Set(waitlistEntries.map(e => e.requestedDate)).size}
            </Text>
            <Text style={styles.statLabel}>ימים עם רשומות</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>רענן</Text>
        </TouchableOpacity>

        {waitlistEntries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#28a745" />
            <Text style={styles.emptyTitle}>אין רשימת המתנה</Text>
            <Text style={styles.emptySubtitle}>כל הלקוחות קיבלו תורים</Text>
          </View>
        ) : (
          <ScrollView style={styles.waitlistScrollView}>
            {waitlistEntries.map((entry) => (
              <View key={entry.waitlistId} style={styles.waitlistCard}>
                <View style={styles.waitlistHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{entry.clientName}</Text>
                    <Text style={styles.clientPhone}>{entry.clientPhone}</Text>
                    <Text style={styles.barberName}>ספר: {getBarberName(entry.barberId)}</Text>
                  </View>
                  <View style={styles.waitlistStatus}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>ממתין</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.waitlistDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={16} color="#666" />
                    <Text style={styles.detailText}>{formatDate(entry.requestedDate)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={16} color="#666" />
                    <Text style={styles.detailText}>{formatTimeRange(entry)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="cut" size={16} color="#666" />
                    <Text style={styles.detailText}>{entry.treatmentName}</Text>
                  </View>
                </View>

                <View style={styles.waitlistActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.notifyButton]}
                    onPress={() => openActionModal(entry, 'notify')}
                  >
                    <Ionicons name="notifications" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>שלח הודעה</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => openActionModal(entry, 'remove')}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>הסר</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Action Modal */}
      <Modal
        visible={actionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'notify' ? 'שלח הודעה ללקוח' : 'הסר מהרשימה'}
              </Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                {actionType === 'notify' 
                  ? 'הלקוח יקבל הודעה על זמינות חדשות'
                  : 'הלקוח יוסר מרשימת ההמתנה'
                }
              </Text>
              
              <TextInput
                style={styles.notesInput}
                placeholder="הוספת הערות (אופציונלי)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.cancelButton]}
                onPress={() => setActionModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionModalButton, styles.confirmButton]}
                onPress={handleAction}
              >
                <Text style={styles.confirmButtonText}>
                  {actionType === 'notify' ? 'שלח הודעה' : 'הסר'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingTop: 20,
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'right',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  waitlistScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  waitlistCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  waitlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  barberName: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  waitlistStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#e0f7fa',
  },
  statusBadge: {
    backgroundColor: '#4db6ac',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  waitlistDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  waitlistActions: {
    flexDirection: 'row-reverse', // Fixed: Changed to row-reverse for RTL
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row-reverse', // Fixed: Changed to row-reverse for RTL
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  notifyButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  removeButton: {
    backgroundColor: '#fff',
    borderColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    width: '95%',
    maxWidth: 400,
    height: 'auto',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'right',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  notesInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#dc3545',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdminWaitlistScreen;
