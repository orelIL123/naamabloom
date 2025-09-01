import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const aboutText = `ברוכים הבאים למספרה של Test Salon! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רן, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.\n\n✂️ AI: "המספרה שלנו היא לא רק מקום להסתפר, אלא מקום להרגיש בו טוב, להירגע ולצאת עם חיוך. כל תספורת היא יצירת אמנות!"`;

const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>אודות</Text>
          <Text style={styles.aboutText}>{aboutText}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  aboutText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AboutModal;
