import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore, initializeFirestore, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration with robust fallbacks for preview mode
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAKEPu7-naLTdeBGAu5dVyvDuGKsFz2E4c",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "barbers-bar-ae31f.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "barbers-bar-ae31f",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "barbers-bar-ae31f.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "53851377123",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:53851377123:ios:b4d77fde0e97fdab6a24d6",
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

// Initialize Firebase with enhanced error handling
let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;
let initializationPromise: Promise<boolean> | null = null;

const initializeFirebase = async (): Promise<boolean> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // Validate configuration first
      if (!validateFirebaseConfig()) {
        console.error('❌ Firebase config validation failed');
        return false;
      }

      // Initialize Firebase app
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized successfully');
      } else {
        app = getApp();
        console.log('✅ Firebase app retrieved from existing instance');
      }

      // Initialize Auth with fallback
      try {
        authInstance = getAuth(app);
        console.log('✅ Firebase Auth initialized');
      } catch (authError) {
        console.warn('Auth getAuth failed, trying initializeAuth:', authError);
        try {
          authInstance = initializeAuth(app);
          console.log('✅ Firebase Auth initialized with initializeAuth');
        } catch (initAuthError) {
          console.error('❌ Firebase Auth initialization failed:', initAuthError);
          return false;
        }
      }

      // Initialize Firestore with settings for preview mode compatibility
      try {
        dbInstance = initializeFirestore(app, {
          experimentalForceLongPolling: true, // Better for preview/development environments
        });
        console.log('✅ Firestore initialized with long polling');
      } catch (firestoreError) {
        console.warn('Firestore initializeFirestore failed, trying getFirestore:', firestoreError);
        try {
          dbInstance = getFirestore(app);
          console.log('✅ Firestore initialized with fallback');
        } catch (fallbackError) {
          console.error('❌ Firestore initialization failed:', fallbackError);
          // Don't return false here - app can work without Firestore in some cases
        }
      }

      // Initialize Storage
      try {
        storageInstance = getStorage(app);
        console.log('✅ Firebase Storage initialized');
      } catch (storageError) {
        console.error('❌ Firebase Storage initialization failed:', storageError);
        // Don't return false here - app can work without Storage in some cases
      }

      console.log('✅ Firebase initialization completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      return false;
    }
  })();

  return initializationPromise;
};

// Initialize Firebase immediately but safely
initializeFirebase().catch(error => {
  console.error('❌ Firebase initialization promise failed:', error);
});

// Firebase readiness checker with enhanced validation
export const checkFirebaseReady = (): boolean => {
  try {
    return !!(app && authInstance);
  } catch {
    return false;
  }
};

// Check if Firebase is fully ready (including optional services)
export const checkFirebaseFullyReady = (): boolean => {
  try {
    return !!(app && authInstance && dbInstance && storageInstance);
  } catch {
    return false;
  }
};

// Wait for Firebase to be ready
export const waitForFirebaseReady = async (timeout: number = 10000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (checkFirebaseReady()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.warn('Firebase readiness timeout after', timeout, 'ms');
  return false;
};

// Safe Firebase operations with automatic retry
export const safeFirebaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  context: string = 'Firebase operation'
): Promise<T | null> => {
  // First, wait for Firebase to be ready
  const isReady = await waitForFirebaseReady(5000);
  if (!isReady) {
    console.error(`Firebase not ready for ${context}`);
    return null;
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`${context} failed (attempt ${i + 1}/${maxRetries}):`, error);
      if (i === maxRetries - 1) {
        console.error(`${context} failed after ${maxRetries} attempts`);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return null;
};

// Safe exports with getters to ensure instances are available
export const getAuthInstance = () => authInstance;
export const getDbInstance = () => dbInstance;
export const getStorageInstance = () => storageInstance;
export const getAppInstance = () => app;

// Legacy exports for compatibility
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
  requestedDate: string;
  requestedTime: string;
  treatmentId: string;
  status: 'waiting' | 'notified' | 'removed';
  createdAt: any;
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

// Initialize Test Salon business configuration
export const initializeBarbersBarConfig = async (): Promise<void> => {
  try {
    const barbersBarConfig: BusinessConfig = {
      businessId: "Test Salon",
      businessName: "Test Salon",
      ownerPhone: "+972523456789",
      cancelPolicy: {
        hoursBeforeAppointment: 2,
        message: "אי אפשר לבטל - תתקשר למספרה"
      }
    };

    // Check if config already exists
    const existingConfig = await getBusinessConfig("Test Salon");
    if (!existingConfig) {
      await setBusinessConfig(barbersBarConfig);
      console.log('✅ Test Salon business config initialized successfully');
    } else {
      console.log('ℹ️ Test Salon business config already exists');
    }
  } catch (error) {
    console.error('Error initializing Test Salon config:', error);
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