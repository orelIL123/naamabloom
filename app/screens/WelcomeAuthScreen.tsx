import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function WelcomeAuthScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#dc2626', '#ef4444']}
      style={styles.container}
      start={{ x: 0.2, y: 0.1 }}
      end={{ x: 0.8, y: 1 }}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="cut" size={64} color="#dc2626" />
            <Text style={{ color: '#dc2626', marginTop: 8, fontSize: 16, fontWeight: 'bold' }}>Barbers Bar</Text>
          </View>
        </View>
        <Text style={styles.title}>ברוך הבא ל-Barbers Bar</Text>
        <Text style={styles.subtitle}>
          הירשם בקלות עכשיו!
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/screens/AuthChoiceScreen')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>התחל הרשמה / התחברות</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    width: width * 0.9,
    alignItems: 'center',
    backgroundColor: 'rgba(20,20,40,0.85)',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
    borderRadius: 60,
    backgroundColor: '#181828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#b0b0b0',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 28,
  },
  button: {
    backgroundColor: '#dc2626',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 32,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 18,
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
}); 