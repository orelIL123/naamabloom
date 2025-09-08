import { useRouter } from 'expo-router';
import {
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AuthChoiceScreen() {
  const router = useRouter();

  const handleLogin = () => {
    router.push('/AuthPhoneScreen');
  };

  const handleRegister = () => {
    router.push('/AuthPhoneScreen?mode=register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Test Salon</Text>
          <Text style={styles.tagline}>המספרה המקצועית שלך</Text>
          <Text style={styles.authInfo}>התחברות עם אימייל או מספר טלפון</Text>
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
            <Text style={styles.termsLink}>תנאי השימוש</Text>
            {' '}ול{' '}
            <Text style={styles.termsLink}>מדיניות הפרטיות</Text>
          </Text>
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
  authInfo: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginTop: 8,
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
}); 