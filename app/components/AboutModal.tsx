import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

const aboutText = `ברוכים הבאים למספרה של Test Salon! כאן תיהנו מחוויה אישית, מקצועית ומפנקת, עם יחס חם לכל לקוח. רן, בעל ניסיון של שנים בתחום, מזמין אתכם להתרווח, להתחדש ולהרגיש בבית.\n\n✂️ AI: "המספרה שלנו היא לא רק מקום להסתפר, אלא מקום להרגיש בו טוב, להירגע ולצאת עם חיוך. כל תספורת היא יצירת אמנות!"`;

const TermsContent = () => (
  <Text style={styles.modalText}>
    <Text style={styles.sectionTitle}>תנאי שימוש - Test Salon{'\n'}</Text>
    
    <Text style={styles.subsectionTitle}>1. קבלת השירות{'\n'}</Text>
    • השירות מיועד לקביעת תורים במספרה Test Salon{'\n'}
    • יש לספק מידע מדויק ומלא בעת קביעת התור{'\n'}
    • המספרה שומרת לעצמה את הזכות לסרב לתת שירות במקרים חריגים{'\n'}
    
    <Text style={styles.subsectionTitle}>2. ביטול תורים{'\n'}</Text>
    • ביטול תור יש לבצע לפחות 2 שעות לפני מועד התור{'\n'}
    • ביטול מאוחר יותר מ-2 שעות עלול לחייב תשלום{'\n'}
    • במקרה של איחור של יותר מ-15 דקות, התור עלול להתבטל{'\n'}
    
    <Text style={styles.subsectionTitle}>3. תשלומים{'\n'}</Text>
    • התשלום מתבצע במספרה לאחר קבלת השירות{'\n'}
    • המחירים כפי שמופיעים באפליקציה{'\n'}
    • המספרה שומרת לעצמה את הזכות לשנות מחירים{'\n'}
    
    <Text style={styles.subsectionTitle}>4. אחריות{'\n'}</Text>
    • המספרה מתחייבת לאיכות השירות{'\n'}
    • במקרה של אי שביעות רצון, יש לפנות למנהל המספרה{'\n'}
    • המספרה לא אחראית לנזקים עקיפים{'\n'}
    
    <Text style={styles.contactInfo}>
      {require('../../constants/contactInfo').CONTACT_INFO.contactText}{'\n'}
      מייל: info@Test Salon.co.il
    </Text>
  </Text>
);

const PrivacyContent = () => (
  <Text style={styles.modalText}>
    <Text style={styles.sectionTitle}>מדיניות פרטיות{'\n'}</Text>
    
    <Text style={styles.subsectionTitle}>1. איסוף מידע{'\n'}</Text>
    • אנו אוספים: שם מלא, מספר טלפון, פרטי תורים{'\n'}
    • המידע נאסף לצורך מתן השירות בלבד{'\n'}
    • לא נאסוף מידע מיותר{'\n'}
    
    <Text style={styles.subsectionTitle}>2. שימוש במידע{'\n'}</Text>
    • המידע משמש לקביעת תורים ותקשורת{'\n'}
    • לא נשתף את המידע עם צדדים שלישיים{'\n'}
    • לא נשלח הודעות פרסומיות ללא אישור{'\n'}
    
    <Text style={styles.subsectionTitle}>3. אבטחה{'\n'}</Text>
    • המידע מאוחסן באופן מאובטח{'\n'}
    • גישה למידע מוגבלת לעובדי המספרה בלבד{'\n'}
    • נעדכן את האבטחה לפי הצורך{'\n'}
    
    <Text style={styles.subsectionTitle}>4. זכויות המשתמש{'\n'}</Text>
    • הזכות לבקש עותק מהמידע שלך{'\n'}
    • הזכות לבקש מחיקה של המידע{'\n'}
    • הזכות לעדכן את המידע{'\n'}
    
    <Text style={styles.subsectionTitle}>5. עדכונים{'\n'}</Text>
    • מדיניות זו עשויה להתעדכן{'\n'}
    • עדכונים יפורסמו באפליקציה{'\n'}
    • המשך השימוש מהווה הסכמה לתנאים המעודכנים{'\n'}
    
    <Text style={styles.contactInfo}>
      {require('../../constants/contactInfo').CONTACT_INFO.contactText}{'\n'}
      מייל: info@Test Salon.co.il
    </Text>
  </Text>
);

const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose }) => {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>אודות</Text>
            <ScrollView style={styles.scrollView}>
              <Text style={styles.aboutText}>{aboutText}</Text>
              
              <View style={styles.linksContainer}>
                <TouchableOpacity 
                  style={styles.linkButton} 
                  onPress={() => setShowTerms(true)}
                >
                  <Text style={styles.linkText}>תנאי שימוש</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.linkButton} 
                  onPress={() => setShowPrivacy(true)}
                >
                  <Text style={styles.linkText}>מדיניות פרטיות</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={showTerms}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>תנאי שימוש</Text>
            <ScrollView style={styles.scrollView}>
              <TermsContent />
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacy}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrivacy(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>מדיניות פרטיות</Text>
            <ScrollView style={styles.scrollView}>
              <PrivacyContent />
            </ScrollView>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setShowPrivacy(false)}
            >
              <Text style={styles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
    maxHeight: '80%',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scrollView: {
    width: '100%',
    flex: 1,
  },
  aboutText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 24,
  },
  linksContainer: {
    width: '100%',
    marginBottom: 20,
  },
  linkButton: {
    backgroundColor: 'rgba(255, 0, 170, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FF00AA',
  },
  linkText: {
    color: '#FF00AA',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF00AA',
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: '#FF00AA',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AboutModal;
