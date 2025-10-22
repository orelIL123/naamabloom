import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { formatHebrewDate, formatTime } from '../../lib/date';
import { COLORS } from '../../lib/colors';
import type { CalendarAppointment } from '../../lib/firestoreQueries';

interface AppointmentModalProps {
  appointment: CalendarAppointment | null;
  visible: boolean;
  onClose: () => void;
  onUpdate?: (appointment: CalendarAppointment) => void;
  onDelete?: (appointmentId: string) => void;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({
  appointment,
  visible,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  React.useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
    }
  }, [appointment]);

  if (!appointment) return null;

  const getStatusText = (status: CalendarAppointment['status']): string => {
    switch (status) {
      case 'booked': return 'נקבע';
      case 'confirmed': return 'מאושר';
      case 'canceled': return 'בוטל';
      case 'completed': return 'הושלם';
      case 'pending': return 'ממתין';
      default: return status;
    }
  };

  const getStatusColor = (status: CalendarAppointment['status']): string => {
    switch (status) {
      case 'confirmed': return COLORS.success;
      case 'canceled': return COLORS.error;
      case 'completed': return COLORS.success;
      case 'pending': return COLORS.warning;
      default: return COLORS.accent;
    }
  };

  const handleStatusChange = (newStatus: CalendarAppointment['status']) => {
    if (onUpdate) {
      onUpdate({ ...appointment, status: newStatus });
    }
  };

  const handleSaveNotes = () => {
    if (onUpdate) {
      onUpdate({ ...appointment, notes });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'מחיקת תור',
      'האם אתה בטוח שברצונך למחוק תור זה?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            onDelete?.(appointment.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
              <Text style={styles.title}>פרטי התור</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Client Info */}
              <View style={styles.section}>
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={20} color={COLORS.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>לקוח</Text>
                    <Text style={styles.infoValue}>{appointment.clientName}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="cut" size={20} color={COLORS.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>שירות</Text>
                    <Text style={styles.infoValue}>{appointment.serviceName}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="person-circle" size={20} color={COLORS.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>ספר</Text>
                    <Text style={styles.infoValue}>{appointment.barberName}</Text>
                  </View>
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.section}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={20} color={COLORS.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>תאריך</Text>
                    <Text style={styles.infoValue}>
                      {formatHebrewDate(appointment.startAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color={COLORS.accent} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>שעה</Text>
                    <Text style={styles.infoValue}>
                      {formatTime(appointment.startAt)} - {formatTime(appointment.endAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>סטטוס</Text>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(appointment.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(appointment.status)}
                    </Text>
                  </View>
                </View>

                {/* Status Change Buttons */}
                <View style={styles.statusButtons}>
                  {appointment.status !== 'confirmed' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: COLORS.success }]}
                      onPress={() => handleStatusChange('confirmed')}
                    >
                      <Text style={styles.statusButtonText}>אשר</Text>
                    </TouchableOpacity>
                  )}
                  
                  {appointment.status !== 'completed' && appointment.status !== 'canceled' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: COLORS.accent }]}
                      onPress={() => handleStatusChange('completed')}
                    >
                      <Text style={styles.statusButtonText}>השלם</Text>
                    </TouchableOpacity>
                  )}
                  
                  {appointment.status !== 'canceled' && (
                    <TouchableOpacity
                      style={[styles.statusButton, { backgroundColor: COLORS.error }]}
                      onPress={() => handleStatusChange('canceled')}
                    >
                      <Text style={styles.statusButtonText}>בטל</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <View style={styles.notesHeader}>
                  <Text style={styles.sectionTitle}>הערות</Text>
                  <TouchableOpacity
                    onPress={() => setIsEditing(!isEditing)}
                    style={styles.editButton}
                  >
                    <Ionicons 
                      name={isEditing ? "checkmark" : "create"} 
                      size={16} 
                      color={COLORS.accent} 
                    />
                  </TouchableOpacity>
                </View>
                
                {isEditing ? (
                  <View style={styles.notesEditContainer}>
                    <TextInput
                      style={styles.notesInput}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="הוסף הערות..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      textAlign="right"
                    />
                    <View style={styles.notesButtons}>
                      <TouchableOpacity
                        style={styles.notesSaveButton}
                        onPress={handleSaveNotes}
                      >
                        <Text style={styles.notesSaveButtonText}>שמור</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.notesCancelButton}
                        onPress={() => {
                          setNotes(appointment.notes || '');
                          setIsEditing(false);
                        }}
                      >
                        <Text style={styles.notesCancelButtonText}>ביטול</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.notesText}>
                    {appointment.notes || 'אין הערות'}
                  </Text>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash" size={16} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>מחק תור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modal: {
    backgroundColor: 'rgba(16, 16, 16, 0.95)',
    borderRadius: 20,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  content: {
    maxHeight: 500,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: {
    padding: 4,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  notesEditContainer: {
    gap: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 8,
    padding: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.glassBg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  notesSaveButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  notesSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesCancelButton: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  notesCancelButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AppointmentModal;