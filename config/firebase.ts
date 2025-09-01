// DEPRECATED: This file is kept for compatibility only
// All new code should import from '../app/config/firebase' instead

console.warn('DEPRECATED: config/firebase.ts is deprecated. Use app/config/firebase.ts instead');

// Re-export from the new Firebase config
export {
  auth,
  db,
  storage,
  getAuthInstance,
  getDbInstance,
  getStorageInstance,
  getAppInstance,
  checkFirebaseReady,
  checkFirebaseFullyReady,
  waitForFirebaseReady,
  safeFirebaseOperation,
  collections,
  User,
  Appointment,
  Barber,
  Treatment,
  GalleryImage,
  WaitlistEntry,
  Settings,
  BusinessConfig,
  UserProfile,
  getBusinessConfig,
  setBusinessConfig,
  initializeBarbersBarConfig,
  getCurrentUser,
  onAuthStateChange,
  checkIsAdmin,
  checkIsBarber
} from '../app/config/firebase';

// Legacy export
export { getAppInstance as app } from '../app/config/firebase';
