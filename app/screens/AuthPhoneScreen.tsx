import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    checkPhoneUserExists,
    loginWithPhoneAndPassword,
    registerUserWithPhone,
    sendSMSVerification,
    verifySMSCode
} from '../../services/firebase';

export default function AuthPhoneScreen() {
  const { mode } = useLocalSearchParams();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(mode === 'register');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [phoneUserExists, setPhoneUserExists] = useState(false);
  const [phoneUserHasPassword, setPhoneUserHasPassword] = useState(false);
  const [registrationPassword, setRegistrationPassword] = useState(''); // סיסמא להרשמה
  const [showTerms, setShowTerms] = useState(false);

  const router = useRouter();
  const { t } = useTranslation();

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^(\+972|0)?[5][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const checkPhoneUser = async (phone: string) => {
    try {
      const result = await checkPhoneUserExists(phone);
      setPhoneUserExists(result.exists);
      setPhoneUserHasPassword(result.hasPassword);
    } catch (error) {
      console.error('Error checking phone user:', error);
    }
  };

  const handleSendSMSVerification = async () => {
    if (!displayName.trim()) {
      Alert.alert('שגיאה', 'אנא הזן שם מלא');
      return;
    }
    if (!emailOrPhone.trim()) {
      Alert.alert('שגיאה', 'אנא הזן אימייל או מספר טלפון');
      return;
    }
    if (!registrationPassword.trim() || registrationPassword.length < 6) {
      Alert.alert('שגיאה', 'אנא הזן סיסמא (לפחות 6 תווים)');
      return;
    }

    // Show SMS verification explanation first
    const { showSMSVerificationExplanation } = await import('../../services/permissions');
    const userConsents = await showSMSVerificationExplanation();
    
    if (!userConsents) {
      return;
    }

    setLoading(true);
    try {
      const result = await sendSMSVerification(emailOrPhone);
      setConfirmationResult(result);
      setStep('otp');
      Alert.alert('הצלחה', 'קוד אימות נשלח לטלפון שלך');
    } catch (error: any) {
      Alert.alert('שגיאה', error.message || 'שגיאה בשליחת קוד אימות');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('שגיאה', 'אנא הזן קוד אימות');
      return;
    }

    setLoading(true);
    try {
      if (isRegisterMode) {
        // First, verify the code
        await verifySMSCode(confirmationResult, verificationCode);
        
        // If verification is successful, then register the user
        const user = await registerUserWithPhone(emailOrPhone, displayName, registrationPassword);
        
        Alert.alert('הצלחה', 'ההרשמה הושלמה בהצלחה!');
        router.navigate('/(tabs)');
      } else {
        // התחברות - אימות קוד בלבד
        await verifySMSCode(confirmationResult, verificationCode);
        Alert.alert('הצלחה', 'התחברת בהצלחה!');
        router.navigate('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('שגיאה', error.message || 'שגיאה באימות הקוד');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('שגיאה', 'אנא הזן אימייל או מספר טלפון');
      return;
    }

    const isPhone = isValidPhone(emailOrPhone);
    const isEmail = isValidEmail(emailOrPhone);

    // במצב הרשמה - רק טלפון מותר
    if (isRegisterMode && !isPhone) {
      Alert.alert('שגיאה', 'הרשמה אפשרית רק עם מספר טלפון');
      return;
    }

    // במצב התחברות - בדוק תקינות
    if (!isRegisterMode && !isPhone && !isEmail) {
      Alert.alert('שגיאה', 'אנא הזן אימייל או מספר טלפון תקינים');
      return;
    }

    // Handle authentication based on input type
    if (isEmail && !isRegisterMode) {
      // Email authentication - רק במצב התחברות
      if (!password.trim()) {
        Alert.alert('שגיאה', 'אנא הזן סיסמא');
        return;
      }
      
      setLoading(true);
      try {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('../../config/firebase');
        
        await signInWithEmailAndPassword(auth, emailOrPhone, password);
        Alert.alert('הצלחה', 'התחברת בהצלחה!');
        router.navigate('/(tabs)');
      } catch (error: any) {
        let errorMessage = 'שגיאה בהתחברות';
        if (error.code === 'auth/user-not-found') {
          errorMessage = 'משתמש לא נמצא. אנא הירשם תחילה';
        } else if (error.code === 'auth/wrong-password') {
          errorMessage = 'סיסמא שגויה';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'כתובת אימייל לא תקינה';
        }
        Alert.alert('שגיאה', errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone authentication - use SMS verification
      if (isRegisterMode) {
        // הרשמה - שליחת SMS לאימות
        handleSendSMSVerification();
      } else {
        // התחברות - בדיקה אם יש סיסמא
        await checkPhoneUser(emailOrPhone);
        if (!phoneUserExists) {
          Alert.alert('שגיאה', 'משתמש לא נמצא. אנא הירשם תחילה');
          return;
        }
        if (!phoneUserHasPassword) {
          Alert.alert('שגיאה', 'למשתמש זה אין סיסמא מוגדרת. אנא פנה למנהל המערכת');
          return;
        }
        if (!password.trim()) {
          Alert.alert('שגיאה', 'אנא הזן סיסמא');
          return;
        }
        
        setLoading(true);
        try {
          await loginWithPhoneAndPassword(emailOrPhone, password);
          Alert.alert('הצלחה', 'התחברת בהצלחה!');
          router.navigate('/(tabs)');
        } catch (error: any) {
          Alert.alert('שגיאה', error.message || 'שגיאה בהתחברות');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleBackToInput = () => {
    setStep('input');
    setVerificationCode('');
    setConfirmationResult(null);
  };

  const handleSwitchMode = () => {
    setIsRegisterMode(!isRegisterMode);
    // נקה את השדות כשעוברים בין מצבים
    setEmailOrPhone('');
    setPassword('');
    setDisplayName('');
    setRegistrationPassword('');
    setPhoneUserExists(false);
    setPhoneUserHasPassword(false);
    setStep('input');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <Text style={styles.title}>
              {step === 'otp' ? 'אימות קוד' : (isRegisterMode ? 'הרשמה' : 'התחברות')}
            </Text>

            <View style={styles.logoContainer}>
              <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            </View>

            {step === 'input' ? (
              <>
                <Text style={styles.subtitle}>
                  {isRegisterMode ? 'הרשמה עם מספר טלפון' : 'התחברות עם אימייל או טלפון'}
                </Text>
                {isRegisterMode && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>שם מלא</Text>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      style={styles.input}
                      placeholder="הזן שם מלא"
                      placeholderTextColor="#999"
                      returnKeyType="next"
                    />
                  </View>
                )}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {isRegisterMode ? 'מספר טלפון' : 'אימייל או מספר טלפון'}
                  </Text>
                  <TextInput
                    value={emailOrPhone}
                    onChangeText={(text: string) => {
                      setEmailOrPhone(text);
                      if (text.length > 10) checkPhoneUser(text);
                    }}
                    style={styles.input}
                    placeholder={isRegisterMode ? "הזן מספר טלפון" : "הזן אימייל או מספר טלפון"}
                    placeholderTextColor="#999"
                    keyboardType={isRegisterMode ? "phone-pad" : "email-address"}
                    returnKeyType="next"
                  />
                </View>
                {isRegisterMode && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>סיסמא</Text>
                    <TextInput
                      value={registrationPassword}
                      onChangeText={setRegistrationPassword}
                      style={styles.input}
                      placeholder="הזן סיסמא (לפחות 6 תווים)"
                      placeholderTextColor="#999"
                      secureTextEntry
                      returnKeyType="done"
                    />
                  </View>
                )}
                {!isRegisterMode && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>סיסמא</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      style={styles.input}
                      placeholder="הזן סיסמא"
                      placeholderTextColor="#999"
                      secureTextEntry
                      returnKeyType="done"
                    />
                  </View>
                )}
                <TouchableOpacity
                  onPress={handleAuth}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {isRegisterMode ? 'שלח קוד אימות' : 'התחבר'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  קוד אימות נשלח למספר {emailOrPhone}
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>קוד אימות</Text>
                  <TextInput
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    style={styles.input}
                    placeholder="הזן קוד אימות"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  onPress={handleVerifyCode}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {isRegisterMode ? 'השלם הרשמה' : 'אמת קוד'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToInput}>
                  <Text style={styles.secondaryButtonText}>חזור</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleSwitchMode}>
                <Text style={styles.switchText}>
                  {isRegisterMode ? 'יש לך כבר חשבון? התחבר' : 'אין לך חשבון? הירשם'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.termsFooter}>
              {isRegisterMode && (
                <Text style={styles.termsFooterText}>
                  בהמשך ההרשמה אתה מסכים ל{' '}
                  <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>תנאי השימוש</Text>
                  {' '}ול{' '}
                  <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>מדיניות הפרטיות</Text>
                  {' '}של האפליקציה
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms Modal */}
      <Modal
        visible={showTerms}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>תנאי שימוש ומדיניות פרטיות</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                <Text style={styles.sectionTitle}>תנאי שימוש ומדיניות פרטיות - Test Salon{'\n\n'}</Text>
                
                <Text style={styles.subsectionTitle}>תנאי שימוש{'\n\n'}</Text>
                
                <Text style={styles.subsectionTitle}>1. קבלת השירות{'\n'}</Text>
                • האפליקציה מיועדת לקביעת תורים במספרה Test Salon{'\n'}
                • יש לספק מידע מדויק ומלא בעת קביעת התור{'\n'}
                • המספרה שומרת לעצמה את הזכות לסרב לתת שירות במקרים חריגים{'\n'}
                • השימוש באפליקציה מותר מגיל 13 ומעלה{'\n\n'}
                
                <Text style={styles.subsectionTitle}>2. ביטול תורים{'\n'}</Text>
                • ביטול תור יש לבצע לפחות 2 שעות לפני מועד התור{'\n'}
                • ביטול מאוחר יותר מ-2 שעות עלול לחייב תשלום{'\n'}
                • במקרה של איחור של יותר מ-15 דקות, התור עלול להתבטל{'\n'}
                • ביטול תורים מתבצע דרך האפליקציה או בטלפון{'\n\n'}
                
                <Text style={styles.subsectionTitle}>3. תשלומים{'\n'}</Text>
                • התשלום מתבצע במספרה לאחר קבלת השירות{'\n'}
                • המחירים כפי שמופיעים באפליקציה{'\n'}
                • המספרה שומרת לעצמה את הזכות לשנות מחירים{'\n'}
                • לא מתבצע תשלום דרך האפליקציה{'\n\n'}
                
                <Text style={styles.subsectionTitle}>4. אחריות{'\n'}</Text>
                • המספרה מתחייבת לאיכות השירות{'\n'}
                • במקרה של אי שביעות רצון, יש לפנות למנהל המספרה{'\n'}
                • המספרה לא אחראית לנזקים עקיפים{'\n'}
                • האחריות מוגבלת לשירותי המספרה בלבד{'\n\n'}
                
                <Text style={styles.subsectionTitle}>5. שימוש באפליקציה{'\n'}</Text>
                • אסור להשתמש באפליקציה למטרות בלתי חוקיות{'\n'}
                • אסור לנסות לפרוץ או לשבש את פעילות האפליקציה{'\n'}
                • אסור להעביר את פרטי החשבון לאחרים{'\n'}
                • המספרה שומרת לעצמה את הזכות לחסום משתמשים{'\n\n'}
                
                <Text style={styles.sectionTitle}>מדיניות פרטיות{'\n\n'}</Text>
                
                <Text style={styles.subsectionTitle}>1. איסוף מידע{'\n'}</Text>
                • אנו אוספים: שם מלא, מספר טלפון, פרטי תורים{'\n'}
                • המידע נאסף לצורך מתן השירות בלבד{'\n'}
                • לא נאסוף מידע מיותר או מידע רגיש{'\n'}
                • לא נאסוף מידע על מיקום המשתמש{'\n\n'}
                
                <Text style={styles.subsectionTitle}>2. שימוש במידע{'\n'}</Text>
                • המידע משמש לקביעת תורים ותקשורת עם הלקוח{'\n'}
                • לא נשתף את המידע עם צדדים שלישיים{'\n'}
                • לא נשלח הודעות פרסומיות ללא אישור מפורש{'\n'}
                • המידע נשמר רק לצורך מתן השירות{'\n\n'}
                
                <Text style={styles.subsectionTitle}>3. אבטחה{'\n'}</Text>
                • המידע מאוחסן באופן מאובטח ב-Firebase{'\n'}
                • גישה למידע מוגבלת לעובדי המספרה בלבד{'\n'}
                • נעדכן את האבטחה לפי הצורך{'\n'}
                • המידע מוצפן בעת העברה{'\n\n'}
                
                <Text style={styles.subsectionTitle}>4. זכויות המשתמש{'\n'}</Text>
                • הזכות לבקש עותק מהמידע שלך{'\n'}
                • הזכות לבקש מחיקה של המידע{'\n'}
                • הזכות לעדכן את המידע{'\n'}
                • הזכות לבטל את ההרשמה בכל עת{'\n\n'}
                
                <Text style={styles.subsectionTitle}>5. עוגיות וטכנולוגיות מעקב{'\n'}</Text>
                • האפליקציה לא משתמשת בעוגיות{'\n'}
                • לא מתבצע מעקב אחר התנהגות המשתמש{'\n'}
                • לא נאסוף מידע על הרגלי הגלישה{'\n'}
                • לא נשתמש בטכנולוגיות מעקב{'\n\n'}
                
                <Text style={styles.subsectionTitle}>6. עדכונים{'\n'}</Text>
                • מדיניות זו עשויה להתעדכן{'\n'}
                • עדכונים יפורסמו באפליקציה{'\n'}
                • המשך השימוש מהווה הסכמה לתנאים המעודכנים{'\n'}
                • שינויים מהותיים יובאו לידיעת המשתמשים{'\n\n'}
                
                <Text style={styles.subsectionTitle}>7. יצירת קשר{'\n'}</Text>
                • לשאלות על מדיניות הפרטיות: info@Test Salon.co.il{'\n'}
                • כתובת: רחוב בדיקה 123, עיר בדיקה'\n'}
                • טלפון: +972523456789{'\n'}
                • שעות פעילות: א'-ה' 9:00-20:00, ו' 9:00-15:00{'\n\n'}
                
                <Text style={styles.contactInfo}>
                  {require('../../constants/contactInfo').CONTACT_INFO.contactText}{'\n'}
                  מייל: info@Test Salon.co.il{'\n'}
                  תאריך עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  button: {
    height: 56,
    backgroundColor: '#FF00AA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    color: '#FF00AA',
    fontSize: 16,
    fontWeight: '500',
  },
  switchText: {
    color: '#FF00AA',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  termsFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  termsFooterText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 14,
    color: '#555',
    marginTop: 15,
    textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#FF00AA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 15,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 