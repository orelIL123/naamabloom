/**
 * Firebase Health Check Service
 * Diagnoses Firebase connection issues and provides detailed feedback
 */

import { collection, doc, getDoc, getDocs, limit, query } from 'firebase/firestore';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { auth, db, storage, checkFirebaseReady } from '../app/config/firebase';

export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'failed';
  checks: {
    firebaseInit: boolean;
    auth: boolean;
    firestore: boolean;
    storage: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Run comprehensive Firebase health check
 */
export const runFirebaseHealthCheck = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    overall: 'healthy',
    checks: {
      firebaseInit: false,
      auth: false,
      firestore: false,
      storage: false,
    },
    errors: [],
    warnings: [],
  };

  console.log('🏥 Starting Firebase health check...');

  // 1. Check Firebase initialization
  try {
    const isReady = checkFirebaseReady();
    result.checks.firebaseInit = isReady;
    
    if (!isReady) {
      result.errors.push('Firebase not initialized properly');
      result.overall = 'failed';
      console.error('❌ Firebase initialization failed');
      return result;
    }
    
    console.log('✅ Firebase initialized');
  } catch (error: any) {
    result.errors.push(`Firebase init error: ${error.message}`);
    result.overall = 'failed';
    return result;
  }

  // 2. Check Auth
  try {
    if (!auth) {
      result.errors.push('Auth instance is null');
      result.overall = 'failed';
    } else {
      result.checks.auth = true;
      console.log('✅ Auth instance available');
      
      // Check if user is authenticated
      if (auth.currentUser) {
        console.log('✅ User authenticated:', auth.currentUser.uid);
      } else {
        result.warnings.push('No user authenticated (this may be normal)');
        console.log('⚠️ No authenticated user');
      }
    }
  } catch (error: any) {
    result.errors.push(`Auth check error: ${error.message}`);
    result.overall = 'degraded';
  }

  // 3. Check Firestore
  try {
    if (!db) {
      result.errors.push('Firestore instance is null');
      result.overall = 'failed';
    } else {
      console.log('🔍 Testing Firestore connection...');
      
      // Try to read from a public collection (settings)
      const testDoc = await getDoc(doc(db, 'settings', 'messages'));
      
      if (testDoc.exists()) {
        result.checks.firestore = true;
        console.log('✅ Firestore connection working');
      } else {
        result.checks.firestore = true; // Connection works even if doc doesn't exist
        result.warnings.push('Firestore connected but settings/messages document not found');
        console.log('⚠️ Firestore works but document not found');
      }
    }
  } catch (error: any) {
    result.errors.push(`Firestore error: ${error.message}`);
    result.overall = 'failed';
    console.error('❌ Firestore connection failed:', error);
  }

  // 4. Check Storage
  try {
    if (!storage) {
      result.errors.push('Storage instance is null');
      result.overall = 'degraded';
    } else {
      console.log('🔍 Testing Storage connection...');
      
      // Try to list items in gallery folder
      const galleryRef = ref(storage, 'gallery');
      const listResult = await listAll(galleryRef);
      
      result.checks.storage = true;
      console.log(`✅ Storage connection working (${listResult.items.length} items in gallery)`);
      
      if (listResult.items.length === 0) {
        result.warnings.push('Gallery folder is empty');
      }
    }
  } catch (error: any) {
    // Storage errors are non-critical
    result.warnings.push(`Storage warning: ${error.message}`);
    result.overall = result.overall === 'healthy' ? 'degraded' : result.overall;
    console.warn('⚠️ Storage connection issue:', error);
  }

  // Determine overall status
  const criticalChecksPassed = result.checks.firebaseInit && result.checks.firestore;
  if (!criticalChecksPassed) {
    result.overall = 'failed';
  } else if (result.errors.length > 0 || result.warnings.length > 0) {
    result.overall = 'degraded';
  }

  console.log('🏥 Health check complete:', result.overall);
  console.log('Checks:', result.checks);
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);

  return result;
};

/**
 * Quick Firebase connectivity test
 */
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Quick Firebase connection test...');
    
    if (!db) {
      console.error('❌ Firestore not initialized');
      return false;
    }
    
    // Try a simple read operation
    const testQuery = query(collection(db, 'settings'), limit(1));
    await getDocs(testQuery);
    
    console.log('✅ Firebase connection OK');
    return true;
  } catch (error: any) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

/**
 * Test gallery loading specifically
 */
export const testGalleryLoading = async (): Promise<{
  success: boolean;
  firestoreImages: number;
  storageImages: number;
  errors: string[];
}> => {
  const result = {
    success: true,
    firestoreImages: 0,
    storageImages: 0,
    errors: [] as string[],
  };

  console.log('🖼️ Testing gallery loading...');

  // Test Firestore gallery collection
  try {
    const galleryQuery = query(
      collection(db, 'gallery'),
      where('isActive', '==', true),
      where('type', '==', 'gallery')
    );
    const snapshot = await getDocs(galleryQuery);
    result.firestoreImages = snapshot.size;
    console.log(`✅ Firestore gallery: ${snapshot.size} images`);
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Firestore gallery error: ${error.message}`);
    console.error('❌ Firestore gallery failed:', error);
  }

  // Test Storage gallery folder
  try {
    if (storage) {
      const galleryRef = ref(storage, 'gallery');
      const listResult = await listAll(galleryRef);
      result.storageImages = listResult.items.length;
      console.log(`✅ Storage gallery: ${listResult.items.length} images`);
    } else {
      result.errors.push('Storage not initialized');
    }
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Storage gallery error: ${error.message}`);
    console.error('❌ Storage gallery failed:', error);
  }

  console.log('🖼️ Gallery test result:', result);
  return result;
};

/**
 * Fix common Firebase issues
 */
export const attemptFirebaseFix = async (): Promise<string[]> => {
  const fixes: string[] = [];

  console.log('🔧 Attempting to fix Firebase issues...');

  // 1. Check and log Firebase config
  if (!auth || !db) {
    fixes.push('⚠️ Firebase not properly initialized - restart app required');
    return fixes;
  }

  // 2. Check internet connectivity
  try {
    await fetch('https://www.google.com', { method: 'HEAD' });
    fixes.push('✅ Internet connection OK');
  } catch {
    fixes.push('❌ No internet connection');
    return fixes;
  }

  // 3. Test Firestore rules
  try {
    await getDocs(query(collection(db, 'settings'), limit(1)));
    fixes.push('✅ Firestore rules OK');
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      fixes.push('❌ Firestore permission denied - check security rules');
    } else {
      fixes.push(`⚠️ Firestore error: ${error.message}`);
    }
  }

  console.log('🔧 Fix attempts complete:', fixes);
  return fixes;
};

