import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AuthChoiceScreen() {
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleLogin = () => {
    router.navigate('/screens/AuthPhoneScreen?mode=login');
  };

  const handleRegister = () => {
    router.navigate('/screens/AuthPhoneScreen?mode=register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
      <Image
            source={require('../../assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
          <Text style={styles.appName}>Test Salon</Text>
          <Text style={styles.tagline}>המספרה המקצועית שלך</Text>
        </View>

        {/* Auth Buttons Section */}
        <View style={styles.authSection}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>התחברות</Text>
      </TouchableOpacity>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>הרשמה</Text>
      </TouchableOpacity>

          <Text style={styles.termsText}>
            בהמשך השימוש באפליקציה, אתה מסכים ל{' '}
            <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>תנאי השימוש</Text>
            {' '}ול{' '}
            <Text style={styles.termsLink} onPress={() => setShowPrivacy(true)}>מדיניות הפרטיות</Text>
          </Text>
        </View>
    </View>

      {/* Terms Modal */}
      <Modal
        visible={showTerms}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>תנאי שימוש</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                <Text style={styles.sectionTitle}>תנאי שימוש - Test Salon{'

'}</Text>
                
                <Text style={styles.subsectionTitle}>1. קבלת השירות{'
'}</Text>
                • השירות מיועד לקביעת תורים במספרה Test Salon{'
'}
                • יש לספק מידע מדויק ומלא בעת קביעת התור{'
'}
                • המספרה שומרת לעצמה את הזכות לסרב לתת שירות במקרים חריגים{'

'}
                
                <Text style={styles.subsectionTitle}>2. ביטול תורים{'
'}</Text>
                • ביטול תור יש לבצע לפחות 2 שעות לפני מועד התור{'
'}
                • ביטול מאוחר יותר מ-2 שעות עלול לחייב תשלום{'
'}
                • במקרה של איחור של יותר מ-15 דקות, התור עלול להתבטל{'

'}
                
                <Text style={styles.subsectionTitle}>3. תשלומים{'
'}</Text>
                • התשלום מתבצע במספרה לאחר קבלת השירות{'
'}
                • המחירים כפי שמופיעים באפליקציה{'
'}
                • המספרה שומרת לעצמה את הזכות לשנות מחירים{'

'}
                
                <Text style={styles.subsectionTitle}>4. אחריות{'
'}</Text>
                • המספרה מתחייבת לאיכות השירות{'
'}
                • במקרה של אי שביעות רצון, יש לפנות למנהל המספרה{'
'}
                • המספרה לא אחראית לנזקים עקיפים{'

'}
                
                <Text style={styles.contactInfo}>
                  {require('../../constants/contactInfo').CONTACT_INFO.contactText}{'
'}
                  מייל: info@Test Salon.co.il
                </Text>
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.modalCloseText}>סגור</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>מדיניות פרטיות</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                <Text style={styles.sectionTitle}>מדיניות פרטיות{'

'}</Text>
                
                <Text style={styles.subsectionTitle}>1. איסוף מידע{'
'}</Text>
                • אנו אוספים: שם מלא, מספר טלפון, פרטי תורים{'
'}
                • המידע נאסף לצורך מתן השירות בלבד{'
'}
                • לא נאסוף מידע מיותר{'

'}
                
                <Text style={styles.subsectionTitle}>2. שימוש במידע{'
'}</Text>
                • המידע משמש לקביעת תורים ותקשורת{'
'}
                • לא נשתף את המידע עם צדדים שלישיים{'
'}
                • לא נשלח הודעות פרסומיות ללא אישור{'

'}
                
                <Text style={styles.subsectionTitle}>3. אבטחה{'
'}</Text>
                • המידע מאוחסן באופן מאובטח{'
'}
                • גישה למידע מוגבלת לעובדי המספרה בלבד{'
'}
                • נעדכן את האבטחה לפי הצורך{'

'}
                
                <Text style={styles.subsectionTitle}>4. זכויות המשתמש{'
'}</Text>
                • הזכות לבקש עותק מהמידע שלך{'
'}
                • הזכות לבקש מחיקה של המידע{'
'}
                • הזכות לעדכן את המידע{'

'}
                
                <Text style={styles.subsectionTitle}>5. עדכונים{'
'}</Text>
                • מדיניות זו עשויה להתעדכן{'
'}
                • עדכונים יפורסמו באפליקציה{'
'}
                • המשך השימוש מהווה הסכמה לתנאים המעודכנים{'

'}
                
                <Text style={styles.contactInfo}>
                  {require('../../constants/contactInfo').CONTACT_INFO.contactText}{'
'}
                  מייל: info@Test Salon.co.il
                </Text>
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowPrivacy(false)}
            >
              <Text style={styles.modalCloseText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: screenHeight * 0.1,
    paddingBottom: screenHeight * 0.1,
  },
  logoSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: screenWidth * 0.3,
    height: screenWidth * 0.3,
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
  },
  authSection: {
    width: '100%',
  },
  loginButton: {
    backgroundColor: '#FF00AA',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF00AA',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#ffffff',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF00AA',
    marginBottom: 32,
  },
  registerButtonText: {
    color: '#FF00AA',
    fontSize: 18,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF00AA',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    width: '100%',
    flex: 1,
  },
  modalText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  modalCloseButton: {
    backgroundColor: '#FF00AA',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
