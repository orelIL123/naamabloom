import { getApp, getApps, initializeApp } from 'firebase/app';
import {
    Auth,
    browserLocalPersistence,
    getAuth,
    setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// בדיקת משתני סביבה
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing Firebase env variable: ${key}`);
  }
});

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Set persistence for React Native
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});
export const db = getFirestore(app);
export const storage = getStorage(app);

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
  barberId: string;
  name: string;
  photo?: string;
  availableSlots: string[];
  availabilityWindow: {
    start: string;
    end: string;
  };
}

export interface Treatment {
  treatmentId: string;
  title: string;
  price: number;
  duration: number;
  image: string;
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

export default app; 