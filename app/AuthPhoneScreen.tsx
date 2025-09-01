import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth } from '../config/firebase';

export default function AuthPhoneScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams();
  const isRegisterMode = mode === 'register';
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('05')) {
      const prefix = digits.substring(1, 3);
      return ['50', '52', '53', '54', '55', '57', '58'].includes(prefix);
    }
    return false;
  };

  const handleAuth = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('שגיאה', 'נא להזין אימייל או מספר טלפון');
      return;
    }

    const isEmail = isValidEmail(emailOrPhone);
    const isPhone = isValidPhone(emailOrPhone);

    if (!isEmail && !isPhone) {
      Alert.alert('שגיאה', 'נא להזין אימייל תקין או מספר טלפון תקין (למשל: 0501234567)');
      return;
    }

    if (!password.trim()) {
      Alert.alert('שגיאה', 'נא להזין סיסמה');
      return;
    }

    if (password.length < 6) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setLoading(true);
    try {
      let authCredential = emailOrPhone;
      
      if (isPhone) {
        // For now, show message that phone login will be available soon
        setLoading(false);
        Alert.alert('מידע', 'כניסה עם מספר טלפון תתאפשר בקרוב. אנא השתמש באימייל בינתיים.');
        return;
      }
      
      console.log(`${isRegisterMode ? 'Registering' : 'Logging in'} with email:`, authCredential);
      
      // Check if auth is available
      if (!auth) {
        setLoading(false);
        Alert.alert('שגיאה', 'מערכת ההתחברות לא זמינה כרגע. אנא נסה שנית.');
        return;
      }
      
      // Try Firebase authentication
      try {
        let userCredential;
        
        if (isRegisterMode) {
          const userCredential = await createUserWithEmailAndPassword(auth, authCredential, password);
          const user = userCredential.user;
          // Now, you can create the user profile in your database
          // Example: await createUserProfile(user.uid, { ... });
        } else {
          await signInWithEmailAndPassword(auth, authCredential, password);
        }
        
        const user = userCredential.user;
        
        setLoading(false);
        console.log(`${isRegisterMode ? 'Registration' : 'Login'} successful:`, user.uid);
        Alert.alert(
          isRegisterMode ? 'הרשמה הושלמה' : 'התחברות הושלמה', 
          isRegisterMode ? 'נרשמת בהצלחה!' : 'התחברת בהצלחה!', 
          [
            { text: 'אוקיי', onPress: () => router.back() }
          ]
        );
        
      } catch (firebaseError: any) {
        setLoading(false);
        console.error('Firebase auth error:', firebaseError);
        
        // Safe error message handling
        let errorMessage = `בעיה ב${isRegisterMode ? 'הרשמה' : 'התחברות'}. אנא בדוק את הפרטים ונסה שנית.`;
        if (firebaseError?.code) {
          switch (firebaseError.code) {
            case 'auth/user-not-found':
              errorMessage = 'משתמש לא נמצא במערכת';
              break;
            case 'auth/wrong-password':
              errorMessage = 'סיסמה שגויה';
              break;
            case 'auth/invalid-email':
              errorMessage = 'כתובת אימייל לא תקינה';
              break;
            case 'auth/user-disabled':
              errorMessage = 'החשבון הזה חסום';
              break;
            case 'auth/email-already-in-use':
              errorMessage = 'כתובת האימייל כבר קיימת במערכת';
              break;
            case 'auth/weak-password':
              errorMessage = 'הסיסמה חייבת להכיל לפחות 6 תווים';
              break;
            case 'auth/network-request-failed':
              errorMessage = 'בעיית חיבור לאינטרנט. אנא נסה שנית.';
              break;
          }
        }
        
        Alert.alert('שגיאה', errorMessage);
      }
      
    } catch (error: any) {
      setLoading(false);
      console.error('Unexpected auth error:', error);
      const safeErrorMessage = error?.message || `שגיאה לא צפויה ב${isRegisterMode ? 'הרשמה' : 'התחברות'}`;
      Alert.alert('שגיאה', safeErrorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isRegisterMode ? 'הרשמה' : 'התחברות'}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Barbers Bar</Text>
        </View>

        <Text style={styles.subtitle}>
          {isRegisterMode ? 'הרשמה עם אימייל או טלפון' : 'התחברות עם אימייל או טלפון'}
        </Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>אימייל או מספר טלפון</Text>
          <TextInput
            style={styles.input}
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder="הזן אימייל או מספר טלפון"
            placeholderTextColor="#999"
            autoCapitalize="none"
            textAlign="left"
            keyboardType="email-address"
          />
          <Text style={styles.helperText}>
            ניתן להזין אימייל (user@example.com) או מספר טלפון (0501234567)
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>סיסמה</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="הזן סיסמה (לפחות 6 תווים)"
            placeholderTextColor="#999"
            secureTextEntry
            textAlign="left"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegisterMode ? 'הירשם' : 'התחבר'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isRegisterMode ? 'יש לך כבר חשבון? ' : 'אין לך חשבון? '}
          </Text>
          <TouchableOpacity onPress={() => router.replace(isRegisterMode ? '/screens/AuthPhoneScreen' : '/screens/AuthPhoneScreen?mode=register')}>
            <Text style={styles.linkText}>
              {isRegisterMode ? 'התחבר כאן' : 'הירשם כאן'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1a1a1a',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
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
  helperText: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    textAlign: 'center',
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
    backgroundColor: '#3b82f6',
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
  },
  footerText: {
    fontSize: 16,
    color: '#666666',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
}); 