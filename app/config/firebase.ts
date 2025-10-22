import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore, initializeFirestore, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration with robust fallbacks for preview mode
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAKEPu7-naLTdeBGAu5dVyvDuGKsFz2E4c",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "barbers-bar-ae31f.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "barbers-bar-ae31f",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "53851377123",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:53851377123:android:38a791e8e929e5e66a24d6",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Validate Firebase config
const validateFirebaseConfig = () => {
  const required = ['apiKey', 'projectId', 'appId', 'authDomain'];
  const missing = required.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.error('Missing Firebase config fields:', missing);
    return false;
  }
  return true;
};

// Initialize Firebase with synchronous approach for better reliability on physical devices
let app: any;
let authInstance: any;
let dbInstance: any;
let storageInstance: any;

// Synchronous initialization to avoid null reference issues
try {
  // Validate configuration first
  if (!validateFirebaseConfig()) {
    throw new Error('Firebase config validation failed');
  }

  // Initialize Firebase app (synchronous)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');
  } else {
    app = getApp();
    console.log('✅ Firebase app already initialized');
  }

  // Initialize Auth with React Native persistence (synchronous)
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
    console.log('✅ Firebase Auth initialized with persistence');
  } catch (authError: any) {
    // If already initialized, get existing instance
    if (authError?.code === 'auth/already-initialized') {
      authInstance = getAuth(app);
      console.log('✅ Firebase Auth retrieved (already initialized)');
    } else {
      console.error('❌ Auth initialization error:', authError);
      throw authError;
    }
  }

  // Initialize Firestore (synchronous)
  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
    console.log('✅ Firestore initialized');
  } catch (firestoreError: any) {
    // If already initialized, get existing instance
    if (firestoreError?.message?.includes('already been called')) {
      dbInstance = getFirestore(app);
      console.log('✅ Firestore retrieved (already initialized)');
    } else {
      console.error('❌ Firestore initialization error:', firestoreError);
      throw firestoreError;
    }
  }

  // Initialize Storage (synchronous)
  try {
    storageInstance = getStorage(app);
    console.log('✅ Firebase Storage initialized');
  } catch (storageError) {
    console.error('❌ Storage initialization error:', storageError);
    throw storageError;
  }

  console.log('✅ Firebase fully initialized and ready');
} catch (error) {
  console.error('❌ Critical Firebase initialization error:', error);
  // In production, app should still try to continue with limited functionality
  if (!__DEV__) {
    console.warn('⚠️ Continuing with limited Firebase functionality');
  }
}

// Firebase readiness checker
export const checkFirebaseReady = (): boolean => {
  return !!(app && authInstance && dbInstance);
};

// Check if Firebase is fully ready (including storage)
export const checkFirebaseFullyReady = (): boolean => {
  return !!(app && authInstance && dbInstance && storageInstance);
};

// Get Firebase instances
export const getAppInstance = () => app;
export const getAuthInstance = () => authInstance;
export const getDbInstance = () => dbInstance;
export const getStorageInstance = () => storageInstance;

// Safe Firebase operation wrapper with retry logic
export const safeFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName: string = 'Firebase operation'
): Promise<T | null> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 ${operationName} - Attempt ${attempt}/${maxRetries}`);
      const result = await operation();
      console.log(`✅ ${operationName} - Success`);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ ${operationName} - Attempt ${attempt} failed:`, error);
      
      // Don't retry on certain errors
      if (error?.code === 'permission-denied' || error?.code === 'unauthenticated') {
        console.error(`🚫 ${operationName} - Permission error, not retrying`);
        return null;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ ${operationName} - All ${maxRetries} attempts failed`);
  return null;
};

// Direct exports - instances are initialized synchronously above
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

// Firebase Collections
export const collections = {
  users: 'users',
  appointments: 'appointments',
  barbers: 'barbers',
  treatments: 'treatments',
  gallery: 'gallery',
  waitlist: 'waitlist',
  settings: 'settings',
} as const;

// Type definitions for Firebase data
export interface User {
  uid: string;
  name: string;
  phone: string;
  photoURL?: string;
  createdAt: any;
  type: 'client' | 'barber' | 'admin';
}

export interface Appointment {
  appointmentId: string;
  clientId: string;
  barberId: string;
  treatmentId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: any;
}

export interface Barber {
  id?: string;
  barberId?: string;
  userId?: string;
  name: string;
  photo?: string;
  image?: string;
  photoUrl?: string;
  phone?: string;
  whatsapp?: string;
  isMainBarber?: boolean;
  experience?: string;
  bio?: string;
  rating?: number;
  specialties?: string[];
  available?: boolean;
  availableSlots?: string[];
  availabilityWindow?: {
    start: string;
    end: string;
  };
  customPrices?: {
    [treatmentId: string]: number;
  };
  pricing?: {
    [treatmentId: string]: number;
  };
}

export interface Treatment {
  id?: string;
  treatmentId?: string;
  name?: string;
  title?: string;
  price: number; // Default price
  duration: number;
  image?: string;
  description?: string;
}

export interface GalleryImage {
  imageId: string;
  url: string;
  uploadedBy: string;
  timestamp: any;
}

export interface WaitlistEntry {
  waitlistId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  requestedDate: string;
  requestedTimeStart: string; // Start of time range
  requestedTimeEnd: string; // End of time range
  treatmentId: string;
  treatmentName: string;
  status: 'waiting' | 'notified' | 'removed';
  createdAt: any;
  notes?: string;
  priority?: number;
  // Legacy field for backwards compatibility
  requestedTime?: string;
}

export interface Settings {
  maxBookingDaysAhead: number;
  showGallery: boolean;
  homepageBanner: string;
}

// Business Configuration interface
export interface BusinessConfig {
  businessId: string;
  businessName: string;
  ownerPhone: string;
  cancelPolicy: {
    hoursBeforeAppointment: number;
    message: string;
  };
}

// Business Configuration functions
export const getBusinessConfig = async (businessId: string): Promise<BusinessConfig | null> => {
  try {
    const docRef = doc(db, 'businessConfigs', businessId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as BusinessConfig;
    } else {
      console.log('No business config found for ID:', businessId);
      return null;
    }
  } catch (error) {
    console.error('Error getting business config:', error);
    return null;
  }
};

export const setBusinessConfig = async (config: BusinessConfig): Promise<void> => {
  try {
    const docRef = doc(db, 'businessConfigs', config.businessId);
    await setDoc(docRef, config);
    console.log('Business config saved successfully for:', config.businessId);
  } catch (error) {
    console.error('Error setting business config:', error);
    throw error;
  }
};

// Initialize BarbersBar business configuration
export const initializeBarbersBarConfig = async (): Promise<void> => {
  try {
    const barbersBarConfig: BusinessConfig = {
      businessId: "barbersbar",
      businessName: "Barbers Bar",
      ownerPhone: "+972523985505",
      cancelPolicy: {
        hoursBeforeAppointment: 2,
        message: "אי אפשר לבטל - תתקשר למספרה"
      }
    };

    // Check if config already exists
    const existingConfig = await getBusinessConfig("barbersbar");
    if (!existingConfig) {
      await setBusinessConfig(barbersBarConfig);
      console.log('✅ BarbersBar business config initialized successfully');
    } else {
      console.log('ℹ️ BarbersBar business config already exists');
    }
  } catch (error) {
    console.error('Error initializing BarbersBar config:', error);
    throw error;
  }
};

// User authentication functions
export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: any) => Promise<void>) => {
  return onAuthStateChanged(auth, callback);
};

// User Profile interface
export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  phone?: string;
  profileImage?: string;
  isAdmin?: boolean;
  isBarber?: boolean;
  barberId?: string;
  role?: 'admin' | 'barber' | 'customer';
}

// Admin and barber check functions
export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.isAdmin || false;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const checkIsBarber = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return userData.isBarber || false;
    }
    return false;
  } catch (error) {
    console.error('Error checking barber status:', error);
    return false;
  }
};

export default app; 