import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    linkWithCredential,
    onAuthStateChanged,
    PhoneAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes, uploadString } from 'firebase/storage';
import base64 from 'react-native-base64';
import { auth, db, storage } from '../app/config/firebase';
import { CacheUtils } from './cache';
import { ImageOptimizer } from './imageOptimization';
import { messagingService } from './messaging';

// Export db for use in other components
export { db };

// Production Note: Admin functions removed for App Store compliance
// Admin users must be created through Firebase Console or server-side functions


export interface UserProfile {
  uid: string;
  email?: string; // Make email optional for phone auth
  displayName: string;
  firstName: string; // שם פרטי
  phone: string;
  profileImage?: string;
  isAdmin?: boolean;
  isBarber?: boolean; // Added to identify barber users
  barberId?: string; // Link to barber document
  role?: 'admin' | 'barber' | 'customer'; // Role-based permissions
  permissions?: {
    canManageOwnAvailability?: boolean;
    canViewOwnAppointments?: boolean;
    canManageOwnAppointments?: boolean;
    canViewStatistics?: boolean;
    canManageAllBarbers?: boolean;
    canManageSettings?: boolean;
    canManageUsers?: boolean;
  };
  hasPassword?: boolean; // Added for phone auth with password
  createdAt: Timestamp;
  pushToken?: string; // Added for push notifications
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  isActive: boolean;
  stock?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Barber {
  id: string;
  name: string;
  image: string;
  specialties: string[];
  experience: string;
  rating: number;
  available: boolean;
  pricing?: { [treatmentId: string]: number }; // Custom pricing per treatment
  phone?: string; // Phone number for contact
  photoUrl?: string; // Photo URL for profile image
  bio?: string; // Biography description
}

export interface Treatment {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  image: string;
  barberId?: string; // Optional: if set, this treatment is specific to a barber
  isGlobal?: boolean; // If true, this is a template treatment that can be used by all barbers
}

export interface BarberTreatment {
  id: string;
  barberId: string;
  treatmentId: string; // Reference to base treatment or can be standalone
  name: string;
  duration: number;
  price: number; // Barber-specific price
  description: string;
  image: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Appointment {
  id: string;
  userId: string;
  barberId: string;
  treatmentId: string;
  date: Timestamp;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Timestamp;
  duration: number; // משך טיפול בדקות
}

export interface GalleryImage {
  id: string;
  imageUrl: string;
  type: 'gallery' | 'background' | 'splash' | 'aboutus' | 'atmosphere' | 'shop';
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface BarberAvailability {
  id: string;
  barberId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "09:00"
  endTime: string;   // "18:00"
  isAvailable: boolean;
  // Break time fields
  hasBreak?: boolean;
  breakStartTime?: string; // "13:00"
  breakEndTime?: string;   // "14:00"
  // Specific date field for overriding weekly patterns
  specificDate?: string; // "2025-08-15" - if provided, this overrides the weekly dayOfWeek pattern
  createdAt: Timestamp;
}

export interface AppSettings {
  id: string;
  key: string;
  value: any;
  updatedAt: Timestamp;
}

// Auth functions
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Register for push notifications after successful login
    await registerForPushNotifications(userCredential.user.uid);
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (email: string, password: string, displayName: string, phone: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Check if this is the admin email
    const isAdminEmail = email === 'orel895@gmail.com';
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: displayName,
      firstName: displayName.split(' ')[0] || displayName, // Take first word as firstName
      phone: phone,
      isAdmin: isAdminEmail, // Automatically set admin for specific email
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    // Register for push notifications after successful registration
    await registerForPushNotifications(user.uid);
    
    // Send welcome notification
    await sendWelcomeNotification(user.uid);
    
    // Send notification to admin about new user
    try {
      await sendNewUserNotificationToAdmin(displayName, email);
    } catch (adminNotificationError) {
      console.log('Failed to send new user notification to admin:', adminNotificationError);
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Phone authentication functions using messaging service
export const sendSMSVerification = async (phoneNumber: string) => {
  try {
    // The phone number should be in international format
    let formattedPhone = phoneNumber;
    
    // Add +972 prefix if not present
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '+972' + phoneNumber.substring(1);
      } else {
        formattedPhone = '+972' + phoneNumber;
      }
    }
    
    console.log('📱 Sending SMS to:', formattedPhone);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `קוד האימות שלך הוא: ${verificationCode}`;
    
    try {
      // Use messaging service to send SMS
      const result = await messagingService.sendMessage({
        to: formattedPhone,
        message,
        type: 'sms',
        metadata: {
          code: verificationCode
        }
      });
      
      if (result.success) {
        console.log(`✅ SMS sent successfully via ${result.provider} to:`, formattedPhone);
        
        return {
          verificationId: result.messageId || `${result.provider}-${Date.now()}`,
          _generatedCode: verificationCode,
          confirm: async (inputCode: string) => {
            console.log('🔍 Verifying code:', inputCode, 'against:', verificationCode);
            
            if (inputCode === verificationCode) {
              return { 
                user: { 
                  uid: 'user-' + formattedPhone.replace(/[^0-9]/g, ''), 
                  phoneNumber: formattedPhone,
                  displayName: null,
                  email: null
                } 
              };
            }
            throw new Error('קוד האימות שגוי');
          }
        };
      } else {
        throw new Error(result.error || 'Failed to send SMS');
      }
      
    } catch (smsError: any) {
      console.error('⚠️ SMS failed:', smsError.message);
      
      // Development fallback - just log the code
      console.log('🔐 DEVELOPMENT: SMS code for', formattedPhone, 'is:', verificationCode);
      
      const fallbackResult = {
        verificationId: 'dev-' + Date.now(),
        _generatedCode: verificationCode,
        confirm: async (inputCode: string) => {
          console.log('🔍 Verifying dev code:', inputCode, 'against:', verificationCode);
          
          if (inputCode === verificationCode) {
            return { 
              user: { 
                uid: 'user-' + formattedPhone.replace(/[^0-9]/g, ''), 
                phoneNumber: formattedPhone,
                displayName: null,
                email: null
              } 
            };
          }
          throw new Error('קוד האימות שגוי');
        }
      };

      return fallbackResult;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
};

export const verifySMSCode = async (confirmationResult: any, verificationCode: string) => {
  try {
    const result = await confirmationResult.confirm(verificationCode);
    return result.user;
  } catch (error) {
    console.error('Error verifying SMS code:', error);
    throw error;
  }
};

// WhatsApp notification functions (for future use)
export const sendWhatsAppNotification = async (phoneNumber: string, message: string) => {
  try {
    // TODO: Implement WhatsApp Business API integration
    // For now, this is a placeholder for future WhatsApp integration
    
    console.log('📱 WhatsApp notification (placeholder):', {
      phoneNumber,
      message,
      status: 'not_implemented_yet'
    });
    
    // Placeholder response
    return {
      success: false,
      message: 'WhatsApp integration not implemented yet',
      placeholder: true
    };
    
    // Future implementation will use WhatsApp Business API
    // const whatsappResponse = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     messaging_product: 'whatsapp',
    //     to: phoneNumber,
    //     type: 'text',
    //     text: { body: message }
    //   })
    // });
    
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
    throw error;
  }
};

export const sendAppointmentNotification = async (userId: string, appointmentData: any, notificationType: 'sms' | 'whatsapp' | 'both' = 'sms') => {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }
    
    const message = `תזכורת לתור: ${appointmentData.treatmentName} ב-${appointmentData.date} בשעה ${appointmentData.time}`;
    
    if (notificationType === 'sms' || notificationType === 'both') {
      // Send SMS notification (existing functionality)
      await sendNotificationToUser(userId, 'תזכורת לתור', message, { appointmentId: appointmentData.id });
    }
    
    if (notificationType === 'whatsapp' || notificationType === 'both') {
      // Send WhatsApp notification (future functionality)
      await sendWhatsAppNotification(userProfile.phone, message);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Error sending appointment notification:', error);
    throw error;
  }
};

export const registerUserWithPhone = async (phoneNumber: string, displayName:string, password: string) => {
  try {
    // Format phone number consistently
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '+972' + phoneNumber.substring(1);
      } else {
        formattedPhone = '+972' + phoneNumber;
      }
    }
    
    // Create a unique temporary email for this phone user
    const tempEmail = `${formattedPhone.replace(/[^0-9]/g, '')}@phonesign.local`;
    
    // Create user with email/password (since phone auth requires special setup)
    const userCredential = await createUserWithEmailAndPassword(auth, tempEmail, password);
    const user = userCredential.user;
    
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Check if this is the admin phone number
    // Static import to satisfy TS module setting
    const { isAdminPhone } = await Promise.resolve().then(() => require('../constants/contactInfo'));
    const isAdmin = isAdminPhone(formattedPhone);
    
    const userProfile: UserProfile = {
      uid: user.uid,
      email: tempEmail,
      displayName: displayName,
      firstName: displayName.split(' ')[0] || displayName, // Take first word as firstName
      phone: formattedPhone,
      isAdmin: isAdmin,
      hasPassword: true, // User now has a password (the temp one)
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    // Register for push notifications after successful registration
    await registerForPushNotifications(user.uid);
    
    // Send welcome notification
    await sendWelcomeNotification(user.uid);
    
    // Send notification to admin about new user
    try {
      await sendNewUserNotificationToAdmin(displayName, formattedPhone);
    } catch (adminNotificationError) {
      console.log('Failed to send new user notification to admin:', adminNotificationError);
    }
    
    console.log('✅ User registered successfully with phone:', formattedPhone);
    return user;
  } catch (error) {
    console.error('Error registering user with phone:', error);
    throw error;
  }
};

// New function to check if phone user exists and has password
export const checkPhoneUserExists = async (phoneNumber: string): Promise<{ exists: boolean; hasPassword: boolean; uid?: string; email?: string }> => {
  try {
    // Format phone number consistently - convert to international format
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '+972' + phoneNumber.substring(1);
      } else {
        formattedPhone = '+972' + phoneNumber;
      }
    }
    
    console.log(`🔍 Checking phone user: ${phoneNumber} -> ${formattedPhone}`);
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', formattedPhone));
    const querySnapshot = await getDocs(q);
    
    console.log(`🔍 Query result: ${querySnapshot.size} users found`);
    
    if (querySnapshot.empty) {
      return { exists: false, hasPassword: false };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData2 = userDoc.data();
    
    console.log(`✅ User found: ${userData2.displayName}, hasPassword: ${userData2.hasPassword}`);
    
    return {
      exists: true,
      hasPassword: userData2.hasPassword || false,
      uid: userDoc.id,
      email: userData2.email
    };
  } catch (error) {
    console.error('Error checking phone user:', error);
    return { exists: false, hasPassword: false };
  }
};

// New function to login with phone + password (no SMS)
export const loginWithPhoneAndPassword = async (phoneNumber: string, password: string) => {
  try {
    // First check if user exists with this phone
    const userCheck = await checkPhoneUserExists(phoneNumber);
    if (!userCheck.exists || !userCheck.hasPassword) {
      throw new Error('משתמש לא נמצא או לא הוגדרה סיסמה');
    }

    // Get user profile
    const userProfile = await getUserProfile(userCheck.uid!);
    if (!userProfile) {
      throw new Error('פרופיל משתמש לא נמצא');
    }

    // Use the synthetic email we store for phone users
    // Format phone number consistently for email lookup
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        formattedPhone = '+972' + phoneNumber.substring(1);
      } else {
        formattedPhone = '+972' + phoneNumber;
      }
    }
    
    const email = userCheck.email || `${formattedPhone.replace(/[^0-9]/g, '')}@phonesign.local`;
    console.log(`🔐 Login attempt with email: ${email}`);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error login with phone and password:', error);
    throw error;
  }
};

// New function to set password for phone user
export const setPasswordForPhoneUser = async (phoneNumber: string, password: string) => {
  try {
    const userCheck = await checkPhoneUserExists(phoneNumber);
    if (!userCheck.exists) {
      throw new Error('משתמש לא נמצא');
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('משתמש לא מחובר');
    }

    // Create email from phone number for Firebase Auth
    const email = `${phoneNumber.replace(/[^0-9]/g, '')}@phonesign.local`;
    
    // Link email/password credential to existing phone user
    const emailCredential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(currentUser, emailCredential);
    
    // Update user profile
    const userProfile = await getUserProfile(userCheck.uid!);
    if (userProfile) {
      await updateUserProfile(userCheck.uid!, {
        ...userProfile,
        email: email,
        hasPassword: true
      });
    }

    return true;
  } catch (error) {
    console.error('Error setting password for phone user:', error);
    throw error;
  }
};

export const loginWithPhone = async (phoneNumber: string, verificationId: string, verificationCode: string) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (error) {
    console.error('Error logging in with phone:', error);
    throw error;
  }
};

// User profile functions
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated');
      return null;
    }
    
    // Check if user is requesting their own profile or is admin
    if (auth.currentUser.uid !== uid) {
      // Check if current user is admin
      const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (!currentUserDoc.exists() || !currentUserDoc.data().isAdmin) {
        console.log('❌ Insufficient permissions to access other user profile');
        return null;
      }
    }
    
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

// Get all users for admin
export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for users access');
      return [];
    }
    
    // Check if user is admin
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists() || !currentUserDoc.data().isAdmin) {
      console.log('❌ Only admins can view all users');
      return [];
    }
    
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      users.push({
        uid: doc.id,
        ...doc.data()
      } as UserProfile);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Barbers functions
export const getBarbers = async (useCache: boolean = false): Promise<Barber[]> => {
  try {
    // DISABLE cache for barbers to ensure fresh data
    console.log('🔄 Loading fresh barber data (no cache)');

    const querySnapshot = await getDocs(collection(db, 'barbers'));
    const barbers: Barber[] = [];
    
    querySnapshot.forEach((doc) => {
      const barberData = { id: doc.id, ...doc.data() } as Barber;
      barbers.push(barberData);
    });

    // Sort barbers by name for consistent ordering
    barbers.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'he');
    });
    
    // Fallback: if no barbers in legacy collection, read from artists and map
    if (barbers.length === 0) {
      const artistsSnapshot = await getDocs(collection(db, 'artists'));
      artistsSnapshot.forEach((docItem) => {
        const a = docItem.data() as any;
        barbers.push({
          id: docItem.id,
          name: a.name,
          userId: a.userId,
          phone: a.phone,
          whatsapp: a.whatsapp,
          isMainBarber: a.isMainArtist ?? false,
          experience: a.experience,
          specialties: a.specialties,
          available: a.available,
        } as Barber);
      });
    }

    // If still empty, synthesize Naama to avoid empty flow
    if (barbers.length === 0) {
      barbers.push({ id: 'naama', name: 'Naama Bloom', isMainBarber: true, available: true } as unknown as Barber);
    }

    console.log('✅ Returning', barbers.length, 'barber(s)');
    return barbers;
  } catch (error) {
    console.error('Error getting barbers:', error);
    return [];
  }
};

export const getBarber = async (barberId: string): Promise<Barber | null> => {
  try {
    const docRef = doc(db, 'barbers', barberId);
    let docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Barber;
    }
    // Fallback to artists
    const artistRef = doc(db, 'artists', barberId);
    docSnap = await getDoc(artistRef);
    if (docSnap.exists()) {
      const a = docSnap.data() as any;
      return {
        id: docSnap.id,
        name: a.name,
        userId: a.userId,
        phone: a.phone,
        whatsapp: a.whatsapp,
        isMainBarber: a.isMainArtist ?? false,
        experience: a.experience,
        specialties: a.specialties,
        available: a.available,
      } as Barber;
    }
    return null;
  } catch (error) {
    console.error('Error getting barber:', error);
    return null;
  }
};

export const getBarberByUserId = async (userId: string): Promise<Barber | null> => {
  try {
    const q = query(collection(db, 'barbers'), where('userId', '==', userId));
    let querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Barber;
    }
    // Fallback to artists
    const qa = query(collection(db, 'artists'), where('userId', '==', userId));
    querySnapshot = await getDocs(qa);
    if (!querySnapshot.empty) {
      const d = querySnapshot.docs[0];
      const a = d.data() as any;
      return {
        id: d.id,
        name: a.name,
        userId: a.userId,
        phone: a.phone,
        whatsapp: a.whatsapp,
        isMainBarber: a.isMainArtist ?? false,
        experience: a.experience,
        specialties: a.specialties,
        available: a.available,
      } as Barber;
    }
    return null;
  } catch (error) {
    console.error('Error getting barber by user ID:', error);
    return null;
  }
};

// Treatments functions
export const getTreatments = async (useCache: boolean = true): Promise<Treatment[]> => {
  try {
    // Try cache first if enabled
    if (useCache) {
      const cached = await CacheUtils.getTreatments();
      if (cached && Array.isArray(cached)) {
        console.log('📦 Treatments loaded from cache');
        return cached as Treatment[];
      }
    }

    const querySnapshot = await getDocs(collection(db, 'treatments'));
    const treatments: Treatment[] = [];
    
    querySnapshot.forEach((doc) => {
      treatments.push({
        id: doc.id,
        ...doc.data()
      } as Treatment);
    });
    
    // Cache the results for 60 minutes
    if (useCache) {
      await CacheUtils.setTreatments(treatments, 60);
      console.log('💾 Treatments cached for 60 minutes');
    }
    
    return treatments;
  } catch (error) {
    console.error('Error getting treatments:', error);
    return [];
  }
};

// Appointments functions
export const createAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>) => {
  try {
    const appointment = {
      ...appointmentData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'appointments'), appointment);
    console.log('Appointment created with ID:', docRef.id);
    
    // Send real notification to user about new appointment
    try {
      // Get barber name from barberId
      const barberDoc = await getDoc(doc(db, 'barbers', appointmentData.barberId));
      const barberName = barberDoc.exists() ? barberDoc.data().name : 'הספר';
      
      // Get time from date (extract hour and minute)
      const appointmentDate = appointmentData.date.toDate();
      const appointmentTime = `${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;
      
      await sendAppointmentConfirmationNotification(
        appointmentData.userId,
        docRef.id,
        appointmentDate.toLocaleDateString('he-IL'),
        appointmentTime,
        barberName
      );
      
      // Schedule reminder notifications
      await scheduleAppointmentReminders(
        appointmentData.userId,
        docRef.id,
        appointmentDate.toLocaleDateString('he-IL'),
        appointmentTime,
        barberName
      );
    } catch (notificationError) {
      console.log('Failed to send appointment notification:', notificationError);
    }
    
    // Send notification to admin about new appointment
    try {
      await sendNotificationToAdmin(
        'תור חדש! 📅',
        `תור חדש נוצר עבור ${appointmentData.date.toDate().toLocaleDateString('he-IL')}`,
        { appointmentId: docRef.id },
        'new_appointment'
      );
    } catch (adminNotificationError) {
      console.log('Failed to send admin notification:', adminNotificationError);
    }
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    // Sort by date in JavaScript instead of Firestore
    appointments.sort((a, b) => {
      if (a.date && b.date) {
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date as any).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date as any).getTime();
        return aTime - bTime;
      }
      return 0;
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting user appointments:', error);
    return [];
  }
};

// Cancel appointment with 2-hour restriction
export const cancelAppointment = async (appointmentId: string, userId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const docRef = doc(db, 'appointments', appointmentId);
    const appointmentDoc = await getDoc(docRef);
    
    if (!appointmentDoc.exists()) {
      return { success: false, message: 'התור לא נמצא' };
    }
    
    const appointment = appointmentDoc.data() as Appointment;
    
    // Check if user owns this appointment
    if (appointment.userId !== userId) {
      return { success: false, message: 'אין לך הרשאה לבטל תור זה' };
    }
    
    // Check if appointment can be cancelled (not already cancelled/completed)
    if (appointment.status === 'cancelled') {
      return { success: false, message: 'התור כבר בוטל' };
    }
    
    if (appointment.status === 'completed') {
      return { success: false, message: 'לא ניתן לבטל תור שהושלם' };
    }
    
    // Check 2-hour restriction
    const now = new Date();
    const appointmentDate = appointment.date.toDate();
    const timeDifferenceHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (timeDifferenceHours < 2) {
      return { 
        success: false, 
        message: 'מצטערים התור שלך קרוב מדי! אי אפשר לבטל, דבר עם המספר שלך להמשך טיפול.' 
      };
    }
    
    // Cancel the appointment
    await updateDoc(docRef, {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      cancelledBy: 'customer'
    });
    
    // Send cancellation notification to user
    try {
      const barberDoc = await getDoc(doc(db, 'barbers', appointment.barberId));
      const barberName = barberDoc.exists() ? barberDoc.data().name : 'הספר';
      
      const appointmentDate = appointment.date.toDate();
      const appointmentTime = `${appointmentDate.getHours().toString().padStart(2, '0')}:${appointmentDate.getMinutes().toString().padStart(2, '0')}`;
      
      await sendCancellationNotification(
        appointment.userId,
        appointmentDate.toLocaleDateString('he-IL'),
        appointmentTime,
        barberName
      );
    } catch (notificationError) {
      console.log('Failed to send cancellation notification:', notificationError);
    }
    
    // Send notification to admin about cancellation
    try {
      const [treatment, barber] = await Promise.all([
        getTreatments().then(treatments => treatments.find(t => t.id === appointment.treatmentId)),
        getBarbers().then(barbers => barbers.find(b => b.id === appointment.barberId))
      ]);
      
      const formatDate = (timestamp: Timestamp) => {
        const date = timestamp.toDate();
        return date.toLocaleDateString('he-IL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };
      
      const notificationData = {
        title: 'ביטול תור',
        message: `תור בוטל: ${treatment?.name || 'טיפול לא ידוע'} עם ${barber?.name || 'מספר לא ידוע'} בתאריך ${formatDate(appointment.date)}`,
        type: 'appointment_cancelled' as const,
        data: {
          appointmentId,
          userId: appointment.userId,
          barberId: appointment.barberId,
          treatmentId: appointment.treatmentId,
          date: appointment.date,
          treatmentName: treatment?.name || 'טיפול לא ידוע',
          barberName: barber?.name || 'מספר לא ידוע'
        },
        createdAt: Timestamp.now(),
        isRead: false
      };
      
      await addDoc(collection(db, 'adminNotifications'), notificationData);
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
      // Don't fail the cancellation if notification fails
    }
    
    return { success: true, message: 'התור בוטל בהצלחה' };
    
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return { success: false, message: 'שגיאה בביטול התור. נסה שוב מאוחר יותר.' };
  }
};

export const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for appointment update');
      throw new Error('User not authenticated');
    }
    
    // Get appointment data to check permissions
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('❌ Appointment not found');
      throw new Error('Appointment not found');
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    
    // Check if user is admin or the barber assigned to this appointment
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists()) {
      console.log('❌ Current user document not found');
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    const isAdmin = userData.isAdmin === true;
    const isBarber = userData.isBarber === true;
    const userBarberId = userData.barberId;
    
    // Only allow update if user is admin or the barber assigned to this appointment
    if (!isAdmin && (!isBarber || userBarberId !== appointmentData.barberId)) {
      console.log('❌ Insufficient permissions to update appointment');
      throw new Error('Insufficient permissions');
    }
    
    const docRef = doc(db, 'appointments', appointmentId);
    await updateDoc(docRef, updates);
    
    // Send notification about appointment update
    try {
      const appointmentDoc = await getDoc(docRef);
      if (appointmentDoc.exists()) {
        const appointmentData = appointmentDoc.data() as Appointment;
        
        let notificationTitle = 'התור שלך עודכן! 📅';
        let notificationBody = 'התור שלך עודכן בהצלחה.';
        
        if (updates.status) {
          switch (updates.status) {
            case 'confirmed':
              notificationTitle = 'התור שלך אושר! ✅';
              notificationBody = 'התור שלך אושר בהצלחה.';
              // Send notification to admin about appointment confirmation
              try {
                await sendAppointmentConfirmationToAdmin(appointmentId);
              } catch (adminNotificationError) {
                console.log('Failed to send appointment confirmation to admin:', adminNotificationError);
              }
              break;
            case 'completed':
              notificationTitle = 'התור הושלם! 🎉';
              notificationBody = 'התור שלך הושלם בהצלחה.';
              // Send notification to admin about appointment completion
              try {
                await sendAppointmentCompletionToAdmin(appointmentId);
              } catch (adminNotificationError) {
                console.log('Failed to send appointment completion to admin:', adminNotificationError);
              }
              break;
            case 'cancelled':
              notificationTitle = 'התור בוטל! ❌';
              notificationBody = 'התור שלך בוטל.';
              break;
          }
        }
        
        await sendNotificationToUser(
          appointmentData.userId,
          notificationTitle,
          notificationBody,
          { appointmentId: appointmentId }
        );
      }
    } catch (notificationError) {
      console.log('Failed to send appointment update notification:', notificationError);
    }
  } catch (error) {
    throw error;
  }
};

export const deleteAppointment = async (appointmentId: string) => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for appointment deletion');
      throw new Error('User not authenticated');
    }
    
    // Get appointment data before deleting
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('❌ Appointment not found');
      throw new Error('Appointment not found');
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    
    // Check if user is admin or the barber assigned to this appointment
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists()) {
      console.log('❌ Current user document not found');
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    const isAdmin = userData.isAdmin === true;
    const isBarber = userData.isBarber === true;
    const userBarberId = userData.barberId;
    
    // Only allow deletion if user is admin or the barber assigned to this appointment
    if (!isAdmin && (!isBarber || userBarberId !== appointmentData.barberId)) {
      console.log('❌ Insufficient permissions to delete appointment');
      throw new Error('Insufficient permissions');
    }
    
    // Send notification to user about appointment cancellation
    try {
      await sendNotificationToUser(
        appointmentData.userId,
        'התור בוטל! ❌',
        'התור שלך בוטל בהצלחה.',
        { appointmentId: appointmentId }
      );
    } catch (notificationError) {
      console.log('Failed to send cancellation notification:', notificationError);
    }
    
    // Send notification to admin about appointment cancellation
    try {
      await sendNotificationToAdmin(
        'תור בוטל! ❌',
        `תור בוטל עבור ${appointmentData.date.toDate().toLocaleDateString('he-IL')}`,
        { appointmentId: appointmentId },
        'canceled_appointment'
      );
    } catch (adminNotificationError) {
      console.log('Failed to send admin cancellation notification:', adminNotificationError);
    }
    
    await deleteDoc(doc(db, 'appointments', appointmentId));
  } catch (error) {
    throw error;
  }
};

// Admin and permission functions
export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      
      // Special case: auto-promote orel895@gmail.com to admin
      if (userData.email === 'orel895@gmail.com' && !userData.isAdmin) {
        console.log('🔧 Auto-promoting orel895@gmail.com to admin...');
        await updateDoc(doc(db, 'users', uid), {
          isAdmin: true,
          isBarber: true,
          updatedAt: serverTimestamp()
        });
        return true;
      }
      
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

export const getUserRole = async (uid: string): Promise<string> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      if (userData.isAdmin) return 'admin';
      if (userData.isBarber) return 'barber';
      return 'customer';
    }
    return 'customer';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'customer';
  }
};

export const checkBarberPermission = async (uid: string, permission: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      if (userData.isAdmin) return true; // Admins have all permissions
      if (userData.permissions && userData.permissions[permission as keyof typeof userData.permissions]) {
        return userData.permissions[permission as keyof typeof userData.permissions] || false;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking barber permission:', error);
    return false;
  }
};

export const getBarberAppointments = async (barberId: string): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId)
    );
    
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    // Sort by date
    appointments.sort((a, b) => {
      if (a.date && b.date) {
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date as any).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date as any).getTime();
        return aTime - bTime;
      }
      return 0;
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting barber appointments:', error);
    return [];
  }
};

export const getBarberStatistics = async (barberId: string): Promise<any> => {
  try {
    const appointments = await getBarberAppointments(barberId);
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthAppointments = appointments.filter(app => {
      const appDate = app.date.toDate();
      return appDate >= thisMonth;
    });
    
    const completedAppointments = appointments.filter(app => app.status === 'completed');
    const thisMonthCompleted = thisMonthAppointments.filter(app => app.status === 'completed');
    
    return {
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      thisMonthAppointments: thisMonthAppointments.length,
      thisMonthCompleted: thisMonthCompleted.length,
      completionRate: appointments.length > 0 ? (completedAppointments.length / appointments.length * 100).toFixed(1) : '0',
      monthlyCompletionRate: thisMonthAppointments.length > 0 ? (thisMonthCompleted.length / thisMonthAppointments.length * 100).toFixed(1) : '0'
    };
  } catch (error) {
    console.error('Error getting barber statistics:', error);
    return {
      totalAppointments: 0,
      completedAppointments: 0,
      thisMonthAppointments: 0,
      thisMonthCompleted: 0,
      completionRate: '0',
      monthlyCompletionRate: '0'
    };
  }
};

// Update existing user to admin
export const makeUserAdmin = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      await updateDoc(userDoc.ref, { isAdmin: true });
      console.log(`User ${email} is now admin`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error making user admin:', error);
    return false;
  }
};

// Create user profile in Firestore for existing Auth users
export const createUserProfileFromAuth = async (email: string): Promise<boolean> => {
  try {
    // Check if user already exists in Firestore
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('User already exists in Firestore');
      return true;
    }

    // Get current auth user
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.email !== email) {
      console.log('No matching auth user found');
      return false;
    }

    // Create user profile in Firestore
    const isAdminEmail = email === 'orel895@gmail.com';
    const userProfile: UserProfile = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: currentUser.displayName || 'משתמש',
      firstName: (currentUser.displayName || 'משתמש').split(' ')[0] || 'משתמש',
      phone: currentUser.phoneNumber || '',
      isAdmin: isAdminEmail,
      createdAt: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', currentUser.uid), userProfile);
    console.log(`User profile created for ${email}`);
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
  }
};

export const getAllAppointments = async (): Promise<Appointment[]> => {
  try {
    const q = query(collection(db, 'appointments'));
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    // Sort by date (most recent first)
    appointments.sort((a, b) => {
      if (a.date && b.date) {
        // Handle both Timestamp objects and regular Date objects
        const aTime = a.date.toMillis ? a.date.toMillis() : new Date(a.date as any).getTime();
        const bTime = b.date.toMillis ? b.date.toMillis() : new Date(b.date as any).getTime();
        return bTime - aTime;
      }
      return 0;
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting all appointments:', error);
    throw error;
  }
};

// Optimized appointment queries
export const getAppointmentsByDateRange = async (startDate: Date, endDate: Date): Promise<Appointment[]> => {
  try {
    const q = query(
      collection(db, 'appointments'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    
    querySnapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data()
      } as Appointment);
    });
    
    return appointments;
  } catch (error) {
    console.error('Error getting appointments by date range:', error);
    throw error;
  }
};

export const getCurrentMonthAppointments = async (): Promise<Appointment[]> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return getAppointmentsByDateRange(startOfMonth, endOfMonth);
};

export const getRecentAppointments = async (days: number = 30): Promise<Appointment[]> => {
  const now = new Date();
  const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  
  return getAppointmentsByDateRange(startDate, now);
};

export const getUpcomingAppointments = async (days: number = 30): Promise<Appointment[]> => {
  const now = new Date();
  const endDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return getAppointmentsByDateRange(now, endDate);
};

// Gallery functions
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const q = query(collection(db, 'gallery'));
    const querySnapshot = await getDocs(q);
    const images: GalleryImage[] = [];
    
    querySnapshot.forEach((doc) => {
      images.push({
        id: doc.id,
        ...doc.data()
      } as GalleryImage);
    });
    
    return images.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error getting gallery images:', error);
    return [];
  }
};

export const addGalleryImage = async (imageData: Omit<GalleryImage, 'id' | 'createdAt'>) => {
  try {
    const newImage = {
      ...imageData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'gallery'), newImage);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const deleteGalleryImage = async (imageId: string) => {
  try {
    await deleteDoc(doc(db, 'gallery', imageId));
  } catch (error) {
    throw error;
  }
};

// Treatment management functions
export const addTreatment = async (treatmentData: Omit<Treatment, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'treatments'), treatmentData);
    
    // Clear treatments cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Treatments cache cleared after adding new treatment');
    
    // Send notification about new treatment
    try {
      await sendNewTreatmentNotification(treatmentData.name);
    } catch (notificationError) {
      console.log('Failed to send new treatment notification:', notificationError);
    }
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateTreatment = async (treatmentId: string, updates: Partial<Treatment>) => {
  try {
    const docRef = doc(db, 'treatments', treatmentId);
    await updateDoc(docRef, updates);
    
    // Clear treatments cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Treatments cache cleared after updating treatment');
  } catch (error) {
    throw error;
  }
};

export const deleteTreatment = async (treatmentId: string) => {
  try {
    await deleteDoc(doc(db, 'treatments', treatmentId));
    
    // Clear treatments cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Treatments cache cleared after deleting treatment');
  } catch (error) {
    throw error;
  }
};

// Barber-specific treatment functions
export const addBarberTreatment = async (treatmentData: Omit<BarberTreatment, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const now = Timestamp.now();
    const data = {
      ...treatmentData,
      createdAt: now,
      updatedAt: now,
      isActive: true
    };
    
    const docRef = await addDoc(collection(db, 'barberTreatments'), data);
    
    // Clear cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Cache cleared after adding barber treatment');
    
    // Send notification about new barber treatment
    try {
      await sendNewTreatmentNotification(`${treatmentData.name} (${treatmentData.barberId})`);
    } catch (notificationError) {
      console.log('Failed to send new barber treatment notification:', notificationError);
    }
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateBarberTreatment = async (treatmentId: string, updates: Partial<BarberTreatment>) => {
  try {
    const updatedData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    await updateDoc(doc(db, 'barberTreatments', treatmentId), updatedData);
    
    // Clear cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Cache cleared after updating barber treatment');
  } catch (error) {
    throw error;
  }
};

export const deleteBarberTreatment = async (treatmentId: string) => {
  try {
    await deleteDoc(doc(db, 'barberTreatments', treatmentId));
    
    // Clear cache to ensure fresh data
    await CacheUtils.invalidateDataCaches();
    console.log('🔄 Cache cleared after deleting barber treatment');
  } catch (error) {
    throw error;
  }
};

export const getBarberTreatments = async (barberId: string): Promise<BarberTreatment[]> => {
  try {
    const q = query(
      collection(db, 'barberTreatments'), 
      where('barberId', '==', barberId),
      where('isActive', '==', true)
    );
    const querySnapshot = await getDocs(q);
    const treatments: BarberTreatment[] = [];
    
    querySnapshot.forEach((doc) => {
      treatments.push({
        id: doc.id,
        ...doc.data()
      } as BarberTreatment);
    });
    
    return treatments;
  } catch (error) {
    console.error('Error getting barber treatments:', error);
    return [];
  }
};

export const getAllBarberTreatments = async (): Promise<BarberTreatment[]> => {
  try {
    const q = query(collection(db, 'barberTreatments'), where('isActive', '==', true));
    const querySnapshot = await getDocs(q);
    const treatments: BarberTreatment[] = [];
    
    querySnapshot.forEach((doc) => {
      treatments.push({
        id: doc.id,
        ...doc.data()
      } as BarberTreatment);
    });
    
    return treatments;
  } catch (error) {
    console.error('Error getting all barber treatments:', error);
    return [];
  }
};

// Barber management functions
export const addBarberProfile = async (barberData: Omit<Barber, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, 'barbers'), barberData);
    
    // Send notification about new barber
    try {
      await sendNewBarberNotification(barberData.name);
    } catch (notificationError) {
      console.log('Failed to send new barber notification:', notificationError);
    }
    
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateBarberProfile = async (barberId: string, updates: Partial<Barber>) => {
  try {
    const docRef = doc(db, 'barbers', barberId);
    await updateDoc(docRef, updates);
  } catch (error) {
    throw error;
  }
};

export const deleteBarberProfile = async (barberId: string) => {
  try {
    await deleteDoc(doc(db, 'barbers', barberId));
  } catch (error) {
    throw error;
  }
};

// Firebase Storage helper functions
export const getStorageImages = async (folderPath: string): Promise<string[]> => {
  try {
    const imagesRef = ref(storage, folderPath);
    const result = await listAll(imagesRef);
    
    const urls = await Promise.all(
      result.items.map(async (imageRef) => {
        return await getDownloadURL(imageRef);
      })
    );
    
    return urls;
  } catch (error) {
    console.error(`Error getting images from ${folderPath}:`, error);
    return [];
  }
};

export const getImageUrl = async (imagePath: string): Promise<string | null> => {
  try {
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error(`Error getting image from ${imagePath}:`, error);
    return null;
  }
};

export const getAllStorageImages = async () => {
  try {
    const [galleryImages, atmosphereImages, splashImages, aboutusImages] = await Promise.all([
      getStorageImages('gallery'),
      getStorageImages('atmosphere'), 
      getStorageImages('splash'),
      getStorageImages('aboutus')
    ]);
    
    return {
      gallery: galleryImages,
      atmosphere: atmosphereImages,
      splash: splashImages,
      aboutus: aboutusImages
    };
  } catch (error) {
    console.error('Error getting all storage images:', error);
    return {
      gallery: [],
      atmosphere: [],
      splash: [],
      aboutus: []
    };
  }
};

// Upload image to Firebase Storage
export const uploadImageToStorage = async (
  imageUri: string, 
  folderPath: string, 
  fileName: string,
  compress: boolean = true
): Promise<string> => {
  try {
    console.log('📱 Starting image upload:', { imageUri, folderPath, fileName });
    let finalImageUri = imageUri;
    
    // Compress image before upload if requested
    if (compress) {
      console.log('🗜️ Compressing image before upload...');
      try {
        const preset = folderPath === 'profiles' ? 'PROFILE' : 
                      folderPath === 'gallery' ? 'GALLERY' : 
                      folderPath === 'atmosphere' ? 'ATMOSPHERE' : 'GALLERY';
        finalImageUri = await ImageOptimizer.compressImage(imageUri, ImageOptimizer.PRESETS[preset]);
        console.log('✅ Image compressed successfully:', finalImageUri);
      } catch (compressionError) {
        console.warn('⚠️ Compression failed, using original:', compressionError);
        finalImageUri = imageUri;
      }
    }
    
    console.log('🔄 Fetching image as blob...');
    
    // Determine content type first
    let contentType = 'image/jpeg'; // Default content type
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.png')) contentType = 'image/png';
    if (lowerFileName.endsWith('.webp')) contentType = 'image/webp';
    if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) contentType = 'image/jpeg';
    
    console.log('📋 Content type determined:', contentType);
    
    // Try different approaches for React Native
    let blob;
    try {
      // First try: direct fetch
      const response = await fetch(finalImageUri);
      if (response.ok) {
        blob = await response.blob();
        console.log('📦 Direct fetch blob:', { size: blob.size, type: blob.type });
      }
    } catch (e) {
      console.warn('Direct fetch failed:', e);
    }
    
    // If direct fetch failed or blob is empty, try alternative
    if (!blob || blob.size === 0) {
      console.log('🔄 Trying FileSystem approach...');
      try {
        const FileSystem = await import('expo-file-system');
        const base64Data = await FileSystem.readAsStringAsync(finalImageUri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        
        // Convert base64 to blob manually using react-native-base64
        const byteCharacters = base64.decode(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: contentType });
        console.log('📦 FileSystem blob:', { size: blob.size, type: blob.type });
      } catch (fsError) {
        console.error('FileSystem approach failed:', fsError);
        throw new Error('Failed to create blob from image');
      }
    }
    
    if (!blob || blob.size === 0) {
      throw new Error('Image blob is empty (0 bytes)');
    }
    
    console.log(`📤 Uploading ${compress ? 'compressed' : 'original'} image to ${folderPath}/${fileName}`);
    const imageRef = ref(storage, `${folderPath}/${fileName}`);
    
    await uploadBytes(imageRef, blob, { contentType });
    
    const downloadURL = await getDownloadURL(imageRef);
    console.log('✅ Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Optimized image upload with automatic compression
export const uploadOptimizedImage = async (
  imageUri: string,
  folderPath: string,
  fileName: string,
  preset: keyof typeof ImageOptimizer.PRESETS = 'GALLERY'
): Promise<string> => {
  try {
    console.log('🚀 Starting optimized image upload...');
    
    // Compress image with specific preset
    const compressedUri = await ImageOptimizer.compressImage(imageUri, ImageOptimizer.PRESETS[preset]);
    
    // Upload compressed image
    const response = await fetch(compressedUri);
    const blob = await response.blob();
    
    console.log(`📤 Uploading optimized image (${preset}) to ${folderPath}/${fileName}`);
    const imageRef = ref(storage, `${folderPath}/${fileName}`);
    await uploadBytes(imageRef, blob);
    
    const downloadURL = await getDownloadURL(imageRef);
    console.log('✅ Optimized image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading optimized image:', error);
    throw error;
  }
};

// Get available time slots for a barber on a specific date
export const getBarberAvailableSlots = async (barberId: string, date: string): Promise<string[]> => {
  try {
    const docRef = doc(db, 'barberAvailability', barberId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) {
      return []; // No availability set
    }
    
    const availability = snap.data().availability;
    const dayData = availability.find((day: any) => day.date === date);
    
    if (!dayData || !dayData.isAvailable) {
      return []; // Day not available
    }
    
    return dayData.timeSlots || [];
  } catch (error) {
    console.error('Error getting barber available slots:', error);
    return [];
  }
};

// Check if a specific time slot is available for booking
export const isTimeSlotAvailable = async (barberId: string, date: string, time: string): Promise<boolean> => {
  try {
    // First check if barber has this time slot available
    const availableSlots = await getBarberAvailableSlots(barberId, date);
    if (!availableSlots.includes(time)) {
      return false; // Barber not available at this time
    }
    
    // Then check if there's already an appointment at this time
    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('barberId', '==', barberId),
      where('date', '==', date),
      where('time', '==', time),
      where('status', '!=', 'cancelled')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.empty; // Available if no conflicting appointments
  } catch (error) {
    console.error('Error checking time slot availability:', error);
    return false;
  }
};

// Check what's in Firebase Storage
export const listAllStorageImages = async () => {
  try {
    console.log('📂 Checking Firebase Storage contents...');
    
    const storageImages = await getAllStorageImages();
    
    console.log('🗂️ Firebase Storage contents:');
    console.log('Gallery folder:', storageImages.gallery);
    console.log('Backgrounds folder:', storageImages.backgrounds);
    console.log('Splash folder:', storageImages.splash);
    console.log('Workers folder:', storageImages.workers);
    console.log('About us folder:', storageImages.aboutus);
    console.log('Shop folder:', storageImages.shop);
    
    return storageImages;
  } catch (error) {
    console.error('❌ Error listing storage images:', error);
    throw error;
  }
};

// Restore gallery from Firebase Storage images
export const restoreGalleryFromStorage = async () => {
  try {
    console.log('🔄 Restoring gallery from Firebase Storage...');
    
    // Get images from Firebase Storage
    const storageImages = await getAllStorageImages();
    
    // Clear existing gallery
    const existingImages = await getGalleryImages();
    for (const image of existingImages) {
      console.log('🗑️ Deleting existing image:', image.id);
      await deleteGalleryImage(image.id);
    }
    
    // Add images from storage to gallery collection
    let addedCount = 0;
    
    // Add gallery images
    for (let i = 0; i < storageImages.gallery.length; i++) {
      const imageUrl = storageImages.gallery[i];
      await addGalleryImage({
        imageUrl,
        type: 'gallery',
        order: i,
        isActive: true
      });
      console.log('➕ Added gallery image:', imageUrl);
      addedCount++;
    }
    
    // Add background images
    for (let i = 0; i < storageImages.backgrounds.length; i++) {
      const imageUrl = storageImages.backgrounds[i];
      await addGalleryImage({
        imageUrl,
        type: 'background',
        order: i,
        isActive: true
      });
      console.log('➕ Added background image:', imageUrl);
      addedCount++;
    }
    
    // Add about us images
    for (let i = 0; i < storageImages.aboutus.length; i++) {
      const imageUrl = storageImages.aboutus[i];
      await addGalleryImage({
        imageUrl,
        type: 'gallery',
        order: storageImages.gallery.length + storageImages.backgrounds.length + i,
        isActive: true
      });
      console.log('➕ Added about us image:', imageUrl);
      addedCount++;
    }
    
    // Add shop images
    for (let i = 0; i < storageImages.shop.length; i++) {
      const imageUrl = storageImages.shop[i];
      await addGalleryImage({
        imageUrl,
        type: 'gallery', // Shop items go to gallery for now
        order: storageImages.gallery.length + storageImages.backgrounds.length + storageImages.aboutus.length + i,
        isActive: true
      });
      console.log('➕ Added shop image:', imageUrl);
      addedCount++;
    }
    
    console.log('✅ Gallery restored with', addedCount, 'images from Firebase Storage');
    return addedCount;
  } catch (error) {
    console.error('❌ Error restoring gallery from storage:', error);
    throw error;
  }
};

// Shop Items Management
export const addShopItem = async (shopItem: Omit<ShopItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = doc(collection(db, 'shopItems'));
    const newShopItem: ShopItem = {
      ...shopItem,
      id: docRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(docRef, newShopItem);
    console.log('✅ Shop item added successfully:', newShopItem.name);
    return newShopItem;
  } catch (error) {
    console.error('❌ Error adding shop item:', error);
    throw error;
  }
};

export const getShopItems = async (): Promise<ShopItem[]> => {
  try {
    const q = query(
      collection(db, 'shopItems'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => doc.data() as ShopItem);
    console.log('📦 Loaded', items.length, 'shop items');
    return items;
  } catch (error) {
    console.error('❌ Error loading shop items:', error);
    return [];
  }
};

export const getActiveShopItems = async (): Promise<ShopItem[]> => {
  try {
    console.log('🛍️ Loading shop items...');
    
    // First try with just the isActive filter
    let q = query(
      collection(db, 'shopItems'),
      where('isActive', '==', true)
    );
    
    let snapshot = await getDocs(q);
    let items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ShopItem));
    
    // Sort manually by createdAt if available
    items.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
      }
      return 0;
    });
    
    console.log('🛍️ Loaded', items.length, 'active shop items');
    
    // If no items found, try loading all items
    if (items.length === 0) {
      console.log('🔍 No active items found, loading all shop items...');
      const allSnapshot = await getDocs(collection(db, 'shopItems'));
      const allItems = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShopItem));
      console.log('📋 Found', allItems.length, 'total shop items');
      return allItems;
    }
    
    return items;
  } catch (error) {
    console.error('❌ Error loading shop items:', error);
    console.log('🔄 Fallback: Loading all shop items...');
    
    // Fallback - load all items without filters
    try {
      const allSnapshot = await getDocs(collection(db, 'shopItems'));
      const allItems = allSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShopItem));
      console.log('✅ Fallback loaded', allItems.length, 'shop items');
      return allItems;
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      return [];
    }
  }
};

export const updateShopItem = async (id: string, updates: Partial<ShopItem>) => {
  try {
    const docRef = doc(db, 'shopItems', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
    console.log('✅ Shop item updated successfully:', id);
  } catch (error) {
    console.error('❌ Error updating shop item:', error);
    throw error;
  }
};

export const deleteShopItem = async (id: string) => {
  try {
    const docRef = doc(db, 'shopItems', id);
    await deleteDoc(docRef);
    console.log('🗑️ Shop item deleted successfully:', id);
  } catch (error) {
    console.error('❌ Error deleting shop item:', error);
    throw error;
  }
};

// Clear all gallery images and add fresh ones
export const resetGalleryWithRealImages = async () => {
  try {
    console.log('🧹 Clearing all gallery images and adding fresh ones...');
    
    // Get all existing gallery images
    const existingImages = await getGalleryImages();
    console.log('Found', existingImages.length, 'existing images to delete');
    
    // Delete ALL existing gallery images
    for (const image of existingImages) {
      console.log('🗑️ Deleting image:', image.id);
      await deleteGalleryImage(image.id);
    }
    
    // Add fresh real images
    const realGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of realGalleryImages) {
      console.log('➕ Adding fresh image:', imageData.imageUrl);
      await addGalleryImage(imageData);
    }
    
    console.log('✅ Gallery reset with', realGalleryImages.length, 'fresh real images');
    return realGalleryImages.length;
  } catch (error) {
    console.error('❌ Error resetting gallery:', error);
    throw error;
  }
};

// Replace existing placeholder images with real images
export const replaceGalleryPlaceholders = async () => {
  try {
    console.log('🔄 Replacing placeholder images with real images...');
    
    // Get all existing gallery images
    const existingImages = await getGalleryImages();
    console.log('Found', existingImages.length, 'existing images');
    
    // Debug: show what we have
    existingImages.forEach((img, index) => {
      console.log(`Image ${index}:`, {
        id: img.id,
        imageUrl: img.imageUrl || 'MISSING URL',
        type: img.type,
        isActive: img.isActive
      });
    });
    
    // Delete old placeholder images
    for (const image of existingImages) {
      if (image.imageUrl && (image.imageUrl.includes('placeholder') || image.imageUrl.includes('via.placeholder'))) {
        console.log('🗑️ Deleting placeholder image:', image.id);
        await deleteGalleryImage(image.id);
      } else if (!image.imageUrl) {
        console.log('🗑️ Deleting image with missing URL:', image.id);
        await deleteGalleryImage(image.id);
      }
    }
    
    // Add new real images
    const realGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of realGalleryImages) {
      console.log('➕ Adding real image:', imageData.imageUrl);
      await addGalleryImage(imageData);
    }
    
    console.log('✅ Gallery updated with', realGalleryImages.length, 'real images');
    return realGalleryImages.length;
  } catch (error) {
    console.error('❌ Error replacing gallery placeholders:', error);
    throw error;
  }
};

// Initialize gallery with default images
export const initializeGalleryImages = async () => {
  try {
    // Check if gallery already has images
    const existingImages = await getGalleryImages();
    
    // If we have placeholder images, replace them
    const hasPlaceholders = existingImages.some(img => 
      img.imageUrl && (img.imageUrl.includes('placeholder') || img.imageUrl.includes('via.placeholder'))
    );
    
    if (hasPlaceholders) {
      console.log('🔄 Found placeholder images, replacing with real images...');
      await replaceGalleryPlaceholders();
      return;
    }
    
    if (existingImages.length > 0) {
      console.log('Gallery already has real images, skipping initialization');
      return;
    }

    console.log('Initializing gallery with default images...');
    
    // Add some real gallery images
    const defaultGalleryImages = [
      {
        imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 0,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 1,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 2,
        isActive: true
      },
      {
        imageUrl: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=300&fit=crop&auto=format',
        type: 'gallery' as const,
        order: 3,
        isActive: true
      }
    ];

    for (const imageData of defaultGalleryImages) {
      await addGalleryImage(imageData);
    }
    
    console.log('Gallery initialized with', defaultGalleryImages.length, 'images');
  } catch (error) {
    console.error('Error initializing gallery images:', error);
    throw error;
  }
};

// Initialize empty collections (run once)
export const initializeCollections = async () => {
  try {
    // Initialize gallery images
    await initializeGalleryImages();
    
    // Create availability collection sample
    await addDoc(collection(db, 'availability'), {
      barberId: 'sample-barber-id',
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '18:00',
      isAvailable: true,
      createdAt: Timestamp.now()
    });
    
    // Create settings collection sample
    await addDoc(collection(db, 'settings'), {
      key: 'business_hours',
      value: { start: '09:00', end: '18:00' },
      updatedAt: Timestamp.now()
    });
    
    console.log('Collections initialized successfully');
  } catch (error) {
    console.error('Error initializing collections:', error);
    throw error;
  }
};


// Barber availability functions
export const getBarberAvailability = async (barberId: string): Promise<BarberAvailability[]> => {
  try {
    const q = query(
      collection(db, 'availability'),
      where('barberId', '==', barberId)
    );
    const querySnapshot = await getDocs(q);
    const availability: BarberAvailability[] = [];
    
    querySnapshot.forEach((doc) => {
      availability.push({
        id: doc.id,
        ...doc.data()
      } as BarberAvailability);
    });
    
    return availability.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  } catch (error) {
    console.error('Error getting barber availability:', error);
    return [];
  }
};

// Realtime listener for a barber's availability
export const listenBarberAvailability = (
  barberId: string,
  callback: (rows: BarberAvailability[]) => void
) => {
  const qRef = query(collection(db, 'availability'), where('barberId', '==', barberId));
  return onSnapshot(qRef, (snapshot) => {
    const rows: BarberAvailability[] = [];
    snapshot.forEach((d) => {
      rows.push({ id: d.id, ...(d.data() as Omit<BarberAvailability, 'id'>) } as BarberAvailability);
    });
    callback(rows.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  });
};

export const getAllAvailability = async (): Promise<BarberAvailability[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'availability'));
    const availability: BarberAvailability[] = [];
    
    querySnapshot.forEach((doc) => {
      availability.push({
        id: doc.id,
        ...doc.data()
      } as BarberAvailability);
    });
    
    return availability;
  } catch (error) {
    console.error('Error getting all availability:', error);
    return [];
  }
};

// Real-time listener for ALL availability changes (for admin screens)
export const listenAllAvailability = (
  callback: (availability: BarberAvailability[]) => void
) => {
  console.log('🔊 Setting up global availability listener');
  const qRef = collection(db, 'availability');
  return onSnapshot(qRef, (snapshot) => {
    const availability: BarberAvailability[] = [];
    snapshot.forEach((doc) => {
      availability.push({
        id: doc.id,
        ...doc.data()
      } as BarberAvailability);
    });
    console.log('📡 Global availability update received:', availability.length, 'records');
    callback(availability.sort((a, b) => a.barberId.localeCompare(b.barberId) || a.dayOfWeek - b.dayOfWeek));
  });
};

export const addAvailability = async (availabilityData: Omit<BarberAvailability, 'id' | 'createdAt'>) => {
  try {
    const newAvailability = {
      ...availabilityData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'availability'), newAvailability);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateAvailability = async (availabilityId: string, updates: Partial<BarberAvailability>) => {
  try {
    console.log('🔄 updateAvailability called with ID:', availabilityId, 'updates:', updates);
    
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for availability update');
      throw new Error('User not authenticated');
    }
    
    // Get availability data to check permissions
    const availabilityDoc = await getDoc(doc(db, 'availability', availabilityId));
    if (!availabilityDoc.exists()) {
      console.log('❌ Availability not found');
      throw new Error('Availability not found');
    }
    
    const availabilityData = availabilityDoc.data() as BarberAvailability;
    console.log('📅 Found availability data:', availabilityData);
    
    // Check if user is admin or the barber who owns this availability
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists()) {
      console.log('❌ Current user document not found');
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    const isAdmin = userData.isAdmin === true;
    const userBarberId = userData.barberId;
    
    console.log('👤 User data:', { isAdmin, userBarberId, availabilityBarberId: availabilityData.barberId });
    
    // Only allow update if user is admin or the barber who owns this availability
    if (!isAdmin && userBarberId !== availabilityData.barberId) {
      console.log('❌ Insufficient permissions to update availability');
      throw new Error('Insufficient permissions');
    }
    
    console.log('✅ Permissions OK, updating availability...');
    const docRef = doc(db, 'availability', availabilityId);
    await updateDoc(docRef, updates);
    console.log('✅ Availability updated successfully in Firebase');
  } catch (error) {
    console.error('❌ Error in updateAvailability:', error);
    throw error;
  }
};

export const createAvailability = async (availabilityData: Omit<BarberAvailability, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'availability'), {
      ...availabilityData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const deleteAvailability = async (availabilityId: string) => {
  try {
    await deleteDoc(doc(db, 'availability', availabilityId));
  } catch (error) {
    throw error;
  }
};

// Batch update availability for a barber
export const updateBarberWeeklyAvailability = async (barberId: string, weeklySchedule: Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[]) => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for weekly availability update');
      throw new Error('User not authenticated');
    }
    
    // Check if user is admin or the barber updating their own availability
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists()) {
      console.log('❌ Current user document not found');
      throw new Error('User document not found');
    }
    
    const userData = currentUserDoc.data();
    const isAdmin = userData.isAdmin === true;
    const userBarberId = userData.barberId;
    
    // Only allow update if user is admin or the barber updating their own availability
    if (!isAdmin && userBarberId !== barberId) {
      console.log('❌ Insufficient permissions to update weekly availability for barber:', barberId);
      throw new Error('Insufficient permissions');
    }
    
    // Perform atomic replace with writeBatch to avoid empty state windows
    const batch = writeBatch(db);

    // Delete existing
    const existingAvailability = await getBarberAvailability(barberId);
    existingAvailability.forEach((availability) => {
      batch.delete(doc(db, 'availability', availability.id));
    });

    // Insert new
    weeklySchedule.forEach((schedule) => {
      const newRef = doc(collection(db, 'availability'));
      batch.set(newRef, {
        barberId,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isAvailable: schedule.isAvailable,
        hasBreak: (schedule as any).hasBreak ?? false,
        breakStartTime: (schedule as any).breakStartTime ?? null,
        breakEndTime: (schedule as any).breakEndTime ?? null,
      });
    });

    await batch.commit();
  } catch (error) {
    throw error;
  }
};

// Admin API: set weekly availability for any barber
export const adminSetWeeklyAvailability = async (
  barberId: string,
  weeklySchedule: Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[]
) => updateBarberWeeklyAvailability(barberId, weeklySchedule);

// Barber API: update only own single-day/partial availability (with breaks)
export const barberUpdateOwnAvailability = async (
  availabilityId: string,
  updates: Partial<BarberAvailability>
) => updateAvailability(availabilityId, updates);

// Migrate old barber data to new format
export const migrateBarberData = async (barberId: string, barberData: any) => {
  try {
    const standardizedData: Partial<Barber> = {
      name: barberData.name || '',
      experience: barberData.experience || barberData.bio || '',
      rating: barberData.rating || 5,
      specialties: barberData.specialties || [],
      image: barberData.image || barberData.photoUrl || '',
      available: barberData.available !== false,
      phone: barberData.phone || ''
    };

    await updateBarberProfile(barberId, standardizedData);
    return standardizedData;
  } catch (error) {
    console.error('Error migrating barber data:', error);
    throw error;
  }
};

// Add a new barber with availability
export const addBarber = async ({ name, image, availableSlots, availabilityWindow }: {
  name: string;
  image: string;
  availableSlots: string[];
  availabilityWindow: { start: string; end: string };
}) => {
  try {
    const barber = {
      name,
      image,
      specialties: [],
      experience: '',
      rating: 5,
      available: true,
      availableSlots,
      availabilityWindow,
    };
    const docRef = await addDoc(collection(db, 'barbers'), barber);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Initialize default availability for a barber if none exists
export const initializeBarberAvailability = async (barberId: string): Promise<void> => {
  try {
    const existing = await getBarberAvailability(barberId);
    if (existing.length > 0) {
      return; // Already has availability
    }
    
    // Create default availability (Monday-Thursday 9:00-18:00)
    const defaultSchedule = [
      { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Sunday
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Monday
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Tuesday
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Wednesday
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true },  // Thursday
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Friday
      { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isAvailable: false }, // Saturday
    ];
    
    await updateBarberWeeklyAvailability(barberId, defaultSchedule);
    console.log(`Initialized default availability for barber ${barberId}`);
  } catch (error) {
    console.error('Error initializing barber availability:', error);
  }
};

// Optimistic update functions for better UX
export const updateAvailabilityOptimistic = async (
  availabilityId: string, 
  updates: Partial<BarberAvailability>,
  onOptimisticUpdate?: (updates: Partial<BarberAvailability>) => void,
  onRollback?: (error: any) => void
) => {
  console.log('🚀 updateAvailabilityOptimistic called with:', { availabilityId, updates });
  
  // Apply optimistic update immediately
  if (onOptimisticUpdate) {
    console.log('🚀 Applying optimistic availability update:', updates);
    onOptimisticUpdate(updates);
  }
  
  try {
    // Perform actual Firebase update
    console.log('🔄 Calling updateAvailability...');
    await updateAvailability(availabilityId, updates);
    console.log('✅ Firebase availability update confirmed');
  } catch (error) {
    console.error('❌ Firebase availability update failed, rolling back:', error);
    
    // Rollback optimistic update
    if (onRollback) {
      console.log('🔄 Rolling back optimistic update...');
      onRollback(error);
    }
    throw error;
  }
};

// Batch update with optimistic updates and rollback
export const updateBarberWeeklyAvailabilityOptimistic = async (
  barberId: string, 
  weeklySchedule: Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[],
  onOptimisticUpdate?: (schedule: Omit<BarberAvailability, 'id' | 'barberId' | 'createdAt'>[]) => void,
  onRollback?: (error: any) => void
) => {
  // Apply optimistic update immediately
  if (onOptimisticUpdate) {
    console.log('🚀 Applying optimistic weekly schedule update for barber:', barberId);
    onOptimisticUpdate(weeklySchedule);
  }
  
  try {
    // Perform actual Firebase batch update
    await updateBarberWeeklyAvailability(barberId, weeklySchedule);
    console.log('✅ Firebase weekly schedule update confirmed');
  } catch (error) {
    console.error('❌ Firebase weekly schedule update failed, rolling back:', error);
    
    // Rollback optimistic update
    if (onRollback) {
      onRollback(error);
    }
    throw error;
  }
};

// Get barber appointments for a specific day - helper function for BookingScreen
export const getBarberAppointmentsForDay = async (barberId: string, date: Date): Promise<any[]> => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('Querying appointments for barber:', barberId);
    console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
    
    // Simplified query to avoid Firebase index issues
    const q = query(
      collection(db, 'appointments'),
      where('barberId', '==', barberId)
    );
    
    const snapshot = await getDocs(q);
    const allAppointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter in JavaScript instead of Firestore
    const filteredAppointments = allAppointments.filter((appointment: any) => {
      // Only consider confirmed/pending appointments
      if (!['confirmed', 'pending'].includes(appointment.status)) {
        return false;
      }
      
      // Check if appointment is on the selected date
      let appointmentDate;
      if (appointment.date && typeof appointment.date.toDate === 'function') {
        appointmentDate = appointment.date.toDate();
      } else if (appointment.date) {
        appointmentDate = new Date(appointment.date);
      } else {
        return false;
      }
      
      return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
    });
    
    console.log('Found appointments:', filteredAppointments.length);
    console.log('Appointment details:', filteredAppointments);
    return filteredAppointments;
  } catch (error) {
    console.error('Error getting barber appointments for day:', error);
    return [];
  }
};

// Image Management Functions for Admin Panel

export interface AppImages {
  atmosphereImage?: string;
  aboutUsImage?: string;
  galleryImages?: string[];
}

// Get current app images from Firestore
export const getAppImages = async (): Promise<AppImages> => {
  try {
    const docRef = doc(db, 'settings', 'images');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        atmosphereImage: data.atmosphereImage || '',
        aboutUsImage: data.aboutUsImage || '',
        galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : []
      };
    }
    
    return {
      atmosphereImage: '',
      aboutUsImage: '',
      galleryImages: []
    };
  } catch (error) {
    console.error('Error getting app images:', error);
    throw error;
  }
};

// Upload image to Firebase Storage for app images
export const uploadAppImageToStorage = async (
  imageUri: string, 
  imagePath: string, 
  fileName: string
): Promise<string> => {
  try {
    // Convert image URI to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Create storage reference
    const imageRef = ref(storage, `${imagePath}/${fileName}`);
    
    // Upload image
    await uploadBytes(imageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(imageRef);
    
    console.log('Image uploaded successfully:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Delete image from Firebase Storage (used when replacing)
export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  try {
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
      return; // Skip if not a Firebase Storage URL
    }
    
    // Extract storage path from URL
    const pathStart = imageUrl.indexOf('/o/') + 3;
    const pathEnd = imageUrl.indexOf('?');
    const path = decodeURIComponent(imageUrl.slice(pathStart, pathEnd));
    
    const imageRef = ref(storage, path);
    await deleteObject(imageRef);
    
    console.log('Image deleted successfully:', path);
  } catch (error: any) {
    // Handle specific Firebase Storage errors
    if (error.code === 'storage/object-not-found') {
      console.log('Image already deleted or does not exist:', imageUrl);
      return; // This is not an error - image was already deleted
    }
    
    console.error('Error deleting image:', error);
    // Don't throw error - deletion failure shouldn't prevent upload
  }
};

// Update atmosphere/background image
export const updateAtmosphereImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `atmosphere_${Date.now()}.jpg`;
    
    // Get current image URL to delete old one
    const currentImages = await getAppImages();
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images', fileName);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      atmosphereImage: newImageUrl
    }, { merge: true });
    
    // Delete old image after successful update
    if (currentImages.atmosphereImage) {
      await deleteImageFromStorage(currentImages.atmosphereImage);
    }
    
    console.log('Atmosphere image updated successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error updating atmosphere image:', error);
    throw error;
  }
};

// Update about us image
export const updateAboutUsImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `about_us_${Date.now()}.jpg`;
    
    // Get current image URL to delete old one
    const currentImages = await getAppImages();
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images', fileName);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      aboutUsImage: newImageUrl
    }, { merge: true });
    
    // Delete old image after successful update
    if (currentImages.aboutUsImage) {
      await deleteImageFromStorage(currentImages.aboutUsImage);
    }
    
    console.log('About us image updated successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error updating about us image:', error);
    throw error;
  }
};

// Add image to app gallery (different from gallery collection)
export const addAppGalleryImage = async (imageUri: string): Promise<string> => {
  try {
    const fileName = `gallery_${Date.now()}.jpg`;
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(imageUri, 'app-images/gallery', fileName);
    
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = [...(currentImages.galleryImages || []), newImageUrl];
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    console.log('App gallery image added successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error adding app gallery image:', error);
    throw error;
  }
};

// Remove image from app gallery
export const removeAppGalleryImage = async (imageUrl: string): Promise<void> => {
  try {
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = (currentImages.galleryImages || []).filter(url => url !== imageUrl);
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    // Delete from storage
    await deleteImageFromStorage(imageUrl);
    
    console.log('App gallery image removed successfully');
  } catch (error) {
    console.error('Error removing app gallery image:', error);
    throw error;
  }
};

// Replace app gallery image (remove old, add new)
export const replaceAppGalleryImage = async (oldImageUrl: string, newImageUri: string): Promise<string> => {
  try {
    const fileName = `gallery_${Date.now()}.jpg`;
    
    // Upload new image
    const newImageUrl = await uploadAppImageToStorage(newImageUri, 'app-images/gallery', fileName);
    
    // Get current images
    const currentImages = await getAppImages();
    const updatedGallery = (currentImages.galleryImages || []).map(url => 
      url === oldImageUrl ? newImageUrl : url
    );
    
    // Update Firestore
    const docRef = doc(db, 'settings', 'images');
    await setDoc(docRef, {
      ...currentImages,
      galleryImages: updatedGallery
    }, { merge: true });
    
    // Delete old image
    await deleteImageFromStorage(oldImageUrl);
    
    console.log('App gallery image replaced successfully');
    return newImageUrl;
  } catch (error) {
    console.error('Error replacing app gallery image:', error);
    throw error;
  }
};

// Push Notification functions
export const registerForPushNotifications = async (userId: string) => {
  try {
    // Check if device supports notifications
    if (!Device.isDevice) {
      console.log('📱 Not a physical device, skipping push notification registration');
      return null;
    }

    // Request notification permission with proper explanation
    const { requestNotificationPermission } = await Promise.resolve().then(() => require('./permissions'));
    const hasPermission = await requestNotificationPermission();
    
    if (!hasPermission) {
      console.log('❌ User denied push notification permissions');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('📱 Push token:', token);

    // Save token to user profile
    await updateUserProfile(userId, { pushToken: token });

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

export const sendPushNotification = async (pushToken: string, title: string, body: string, data?: any) => {
  try {
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    console.log('✅ Push notification sent successfully');
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

export const sendNotificationToUser = async (userId: string, title: string, body: string, data?: any) => {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile || !userProfile.pushToken) {
      console.log('❌ User not found or no push token');
      return false;
    }

    await sendPushNotification(userProfile.pushToken, title, body, data);
    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
};

export const sendNotificationToAllUsers = async (title: string, body: string, data?: any) => {
  try {
    const users = await getAllUsers();
    const usersWithTokens = users.filter(user => user.pushToken);
    
    console.log(`📱 Sending notification to ${usersWithTokens.length} users`);
    
    const results = await Promise.allSettled(
      usersWithTokens.map(user => 
        sendPushNotification(user.pushToken!, title, body, data)
      )
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    console.log(`✅ Successfully sent to ${successful}/${usersWithTokens.length} users`);
    
    return successful;
  } catch (error) {
    console.error('Error sending notification to all users:', error);
    return 0;
  }
};

// Send appointment reminder notification
export const sendAppointmentReminder = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('Appointment not found');
      return false;
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    const appointmentDate = appointmentData.date.toDate();
    const now = new Date();
    const timeDiff = appointmentDate.getTime() - now.getTime();
    const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
    
    // Send reminder if appointment is within 24 hours
    if (hoursUntilAppointment > 0 && hoursUntilAppointment <= 24) {
      await sendNotificationToUser(
        appointmentData.userId,
        'תזכורת לתור! ⏰',
        `התור שלך מחר ב-${appointmentDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
        { appointmentId: appointmentId }
      );
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    return false;
  }
};

// Send reminder to all users with upcoming appointments
export const sendRemindersToAllUsers = async () => {
  try {
    const appointments = await getAllAppointments();
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const upcomingAppointments = appointments.filter(appointment => {
      const appointmentDate = appointment.date.toDate();
      return appointmentDate >= now && appointmentDate <= tomorrow && appointment.status === 'confirmed';
    });
    
    console.log(`📱 Sending reminders for ${upcomingAppointments.length} appointments`);
    
    const results = await Promise.allSettled(
      upcomingAppointments.map(appointment => 
        sendAppointmentReminder(appointment.id)
      )
    );
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    console.log(`✅ Successfully sent ${successful} reminders`);
    
    return successful;
  } catch (error) {
    console.error('Error sending reminders to all users:', error);
    return 0;
  }
};

// Send notification to admin about new appointment
export const sendNotificationToAdmin = async (title: string, body: string, data?: any, notificationType?: string) => {
  try {
    const users = await getAllUsers();
    const adminUsers = users.filter(user => user.isAdmin && user.pushToken);
    
    console.log(`📱 Checking notification settings for ${adminUsers.length} admin users`);
    
    // Check each admin's notification settings
    const results = await Promise.allSettled(
      adminUsers.map(async (user) => {
        try {
          // Get admin's notification settings
          const settingsDoc = await getDoc(doc(db, 'adminNotifications', user.uid));
          const settings = settingsDoc.exists() ? settingsDoc.data() : {
            newAppointment: true,
            canceledAppointment: true,
            newUser: true,
            appointmentReminders: true,
            upcomingAppointments: true,
          };
          
          // Check if this type of notification is enabled
          let shouldSend = true;
          if (notificationType) {
            switch (notificationType) {
              case 'new_appointment':
                shouldSend = settings.newAppointment !== false;
                break;
              case 'canceled_appointment':
                shouldSend = settings.canceledAppointment !== false;
                break;
              case 'new_user':
                shouldSend = settings.newUser !== false;
                break;
              case 'appointment_reminder':
                shouldSend = settings.appointmentReminders !== false;
                break;
              case 'upcoming_appointment':
                shouldSend = settings.upcomingAppointments !== false;
                break;
            }
          }
          
          if (shouldSend) {
            console.log(`📱 Sending notification to admin ${user.email} (settings allow)`);
            return await sendPushNotification(user.pushToken!, title, body, data);
          } else {
            console.log(`📱 Skipping notification to admin ${user.email} (disabled in settings)`);
            return null;
          }
        } catch (userError) {
          console.error(`Error checking settings for admin ${user.email}:`, userError);
          // Fallback: send notification if we can't check settings
          return await sendPushNotification(user.pushToken!, title, body, data);
        }
      })
    );
    
    const successful = results.filter(result => result.status === 'fulfilled' && result.value !== null).length;
    console.log(`✅ Successfully sent to ${successful}/${adminUsers.length} admin users (respecting settings)`);
    
    return successful;
  } catch (error) {
    console.error('Error sending notification to admin:', error);
    return 0;
  }
};

// Send welcome notification to new user
export const sendWelcomeNotification = async (userId: string) => {
  try {
    await sendNotificationToUser(
      userId,
      'ברוכים הבאים! 🎉',
      'תודה שנרשמת לאפליקציה שלנו! אנחנו שמחים לראות אותך.',
      { type: 'welcome' }
    );
  } catch (error) {
    console.error('Error sending welcome notification:', error);
  }
};

// Send promotional notification
export const sendPromotionalNotification = async (title: string, body: string, data?: any) => {
  try {
    const users = await getAllUsers();
    const usersWithTokens = users.filter(user => user.pushToken && !user.isAdmin); // Don't send to admins
    
    console.log(`📱 Sending promotional notification to ${usersWithTokens.length} users`);
    
    const results = await Promise.allSettled(
      usersWithTokens.map(user => 
        sendPushNotification(user.pushToken!, title, body, data)
      )
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    console.log(`✅ Successfully sent promotional notification to ${successful}/${usersWithTokens.length} users`);
    
    return successful;
  } catch (error) {
    console.error('Error sending promotional notification:', error);
    return 0;
  }
};

// Send notification about new treatment
export const sendNewTreatmentNotification = async (treatmentName: string) => {
  try {
    await sendPromotionalNotification(
      'טיפול חדש! ✂️',
      `טיפול חדש נוסף: ${treatmentName}. בואו לנסות!`,
      { type: 'new_treatment', treatmentName: treatmentName }
    );
  } catch (error) {
    console.error('Error sending new treatment notification:', error);
  }
};

// Send notification about special offer
export const sendSpecialOfferNotification = async (offerTitle: string, offerDescription: string) => {
  try {
    await sendPromotionalNotification(
      `מבצע מיוחד! 🎁`,
      `${offerTitle}: ${offerDescription}`,
      { type: 'special_offer', offerTitle: offerTitle }
    );
  } catch (error) {
    console.error('Error sending special offer notification:', error);
  }
};

// Send notification about new barber
export const sendNewBarberNotification = async (barberName: string) => {
  try {
    await sendPromotionalNotification(
      'ספר חדש! ✂️',
      `ספר חדש הצטרף: ${barberName}. בואו להכיר!`,
      { type: 'new_barber', barberName: barberName }
    );
  } catch (error) {
    console.error('Error sending new barber notification:', error);
  }
};

// Send notification about maintenance
export const sendMaintenanceNotification = async (message: string) => {
  try {
    await sendNotificationToAllUsers(
      'תחזוקה מתוכננת! 🔧',
      message,
      { type: 'maintenance' }
    );
  } catch (error) {
    console.error('Error sending maintenance notification:', error);
  }
};

// Send notification about system update
export const sendSystemUpdateNotification = async (updateDetails: string) => {
  try {
    await sendNotificationToAllUsers(
      'עדכון מערכת! 📱',
      updateDetails,
      { type: 'system_update' }
    );
  } catch (error) {
    console.error('Error sending system update notification:', error);
  }
};

// Send notification about appointment reminder to admin
export const sendAppointmentReminderToAdmin = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('Appointment not found');
      return false;
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    const appointmentDate = appointmentData.date.toDate();
    
    await sendNotificationToAdmin(
      'תזכורת לתור! ⏰',
      `תור מחר ב-${appointmentDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
      { appointmentId: appointmentId },
      'appointment_reminder'
    );
    
    return true;
  } catch (error) {
    console.error('Error sending appointment reminder to admin:', error);
    return false;
  }
};

// Send notification about daily summary to admin
export const sendDailySummaryToAdmin = async () => {
  try {
    const appointments = await getAllAppointments();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayAppointments = appointments.filter(appointment => {
      const appointmentDate = appointment.date.toDate();
      return appointmentDate >= todayStart && appointmentDate < todayEnd;
    });
    
    const confirmedAppointments = todayAppointments.filter(app => app.status === 'confirmed');
    const completedAppointments = todayAppointments.filter(app => app.status === 'completed');
    const cancelledAppointments = todayAppointments.filter(app => app.status === 'cancelled');
    
    const summary = `סיכום יומי: ${confirmedAppointments.length} תורים מאושרים, ${completedAppointments.length} הושלמו, ${cancelledAppointments.length} בוטלו`;
    
    await sendNotificationToAdmin(
      'סיכום יומי 📊',
      summary,
      { type: 'daily_summary' },
      'upcoming_appointment'
    );
    
    return true;
  } catch (error) {
    console.error('Error sending daily summary to admin:', error);
    return false;
  }
};

// Send notification about new user registration to admin
export const sendNewUserNotificationToAdmin = async (userName: string, userEmail: string) => {
  try {
    await sendNotificationToAdmin(
      'משתמש חדש! 👤',
      `משתמש חדש נרשם: ${userName} (${userEmail})`,
      { type: 'new_user', userName: userName, userEmail: userEmail },
      'new_user'
    );
  } catch (error) {
    console.error('Error sending new user notification to admin:', error);
  }
};

// Send notification about low appointment slots
export const sendLowSlotsNotificationToAdmin = async (barberName: string, availableSlots: number) => {
  try {
    await sendNotificationToAdmin(
      'פחות מקומות פנויים! ⚠️',
      `לספר ${barberName} נשארו רק ${availableSlots} מקומות פנויים`,
      { type: 'low_slots', barberName: barberName, availableSlots: availableSlots },
      'upcoming_appointment'
    );
  } catch (error) {
    console.error('Error sending low slots notification to admin:', error);
  }
};

// Send notification about appointment confirmation to admin
export const sendAppointmentConfirmationToAdmin = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('Appointment not found');
      return false;
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    const appointmentDate = appointmentData.date.toDate();
    
    await sendNotificationToAdmin(
      'תור אושר! ✅',
      `תור אושר עבור ${appointmentDate.toLocaleDateString('he-IL')} ב-${appointmentDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
      { appointmentId: appointmentId },
      'new_appointment'
    );
    
    return true;
  } catch (error) {
    console.error('Error sending appointment confirmation to admin:', error);
    return false;
  }
};

// Send notification about appointment completion to admin
export const sendAppointmentCompletionToAdmin = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('Appointment not found');
      return false;
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    const appointmentDate = appointmentData.date.toDate();
    
    await sendNotificationToAdmin(
      'תור הושלם! 🎉',
      `תור הושלם עבור ${appointmentDate.toLocaleDateString('he-IL')} ב-${appointmentDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
      { appointmentId: appointmentId },
      'upcoming_appointment'
    );
    
    return true;
  } catch (error) {
    console.error('Error sending appointment completion to admin:', error);
    return false;
  }
};

// Send notification about appointment cancellation to admin
export const sendAppointmentCancellationToAdmin = async (appointmentId: string) => {
  try {
    const appointmentDoc = await getDoc(doc(db, 'appointments', appointmentId));
    if (!appointmentDoc.exists()) {
      console.log('Appointment not found');
      return false;
    }
    
    const appointmentData = appointmentDoc.data() as Appointment;
    const appointmentDate = appointmentData.date.toDate();
    
    await sendNotificationToAdmin(
      'תור בוטל! ❌',
      `תור בוטל עבור ${appointmentDate.toLocaleDateString('he-IL')} ב-${appointmentDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
      { appointmentId: appointmentId },
      'canceled_appointment'
    );
    
    return true;
  } catch (error) {
    console.error('Error sending appointment cancellation to admin:', error);
    return false;
  }
};

// Business Configuration types
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
    throw error;
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

export const updateBusinessConfig = async (businessId: string, updates: Partial<BusinessConfig>): Promise<void> => {
  try {
    const docRef = doc(db, 'businessConfigs', businessId);
    await updateDoc(docRef, updates);
    console.log('Business config updated successfully for:', businessId);
  } catch (error) {
    console.error('Error updating business config:', error);
    throw error;
  }
};

export const getAllBusinessConfigs = async (): Promise<BusinessConfig[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'businessConfigs'));
    const configs: BusinessConfig[] = [];
    
    querySnapshot.forEach((doc) => {
      configs.push(doc.data() as BusinessConfig);
    });
    
    return configs;
  } catch (error) {
    console.error('Error getting all business configs:', error);
    throw error;
  }
};

// Initialize the default Test Salon business configuration
export const initializeBarbersBarConfig = async (): Promise<void> => {
  try {
    const barbersBarConfig: BusinessConfig = {
      businessId: "Test Salon",
      businessName: "Test Salon",
      ownerPhone: "+972523456789", // User's actual phone number
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

// Test SMS function with specific phone number
export const testSMSToOwner = async (): Promise<any> => {
  try {
    const testPhone = "+972523456789"; // User's number
    console.log('🧪 Testing SMS to owner phone:', testPhone);
    
    const result = await sendSMSVerification(testPhone);
    console.log('✅ Test SMS sent successfully!');
    console.log('📱 Verification ID:', result.verificationId);
    
    if (result._generatedCode) {
      console.log('🔐 Generated code:', result._generatedCode);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test SMS failed:', error);
    throw error;
  }
};

// ===== WAITLIST FUNCTIONS =====

export interface WaitlistEntry {
  waitlistId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  barberId: string;
  requestedDate: string; // YYYY-MM-DD format
  requestedTime: string; // HH:MM format
  treatmentId: string;
  treatmentName: string;
  status: 'waiting' | 'notified' | 'assigned' | 'removed';
  notes?: string;
  createdAt: Timestamp;
  priority: number; // Higher number = higher priority (based on wait time)
}

// Add user to waitlist when no slots available
export const addToWaitlist = async (waitlistData: Omit<WaitlistEntry, 'waitlistId' | 'createdAt' | 'priority'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'waitlist'), {
      ...waitlistData,
      createdAt: Timestamp.now(),
      priority: Math.floor(Date.now() / 1000) // Simple priority based on timestamp
    });
    
    console.log('✅ User added to waitlist:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding to waitlist:', error);
    throw error;
  }
};

// Get waitlist entries for a specific barber and date
export const getWaitlistForBarberAndDate = async (barberId: string, date: string): Promise<WaitlistEntry[]> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for waitlist access');
      return [];
    }
    
    // Check if user is admin or the barber requesting their own waitlist
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists()) {
      console.log('❌ Current user document not found');
      return [];
    }
    
    const userData = currentUserDoc.data();
    const isAdmin = userData.isAdmin === true;
    const isBarber = userData.isBarber === true;
    const userBarberId = userData.barberId;
    
    // Only allow access if user is admin or the barber requesting their own waitlist
    if (!isAdmin && (!isBarber || userBarberId !== barberId)) {
      console.log('❌ Insufficient permissions to access waitlist for barber:', barberId);
      return [];
    }
    
    const q = query(
      collection(db, 'waitlist'),
      where('barberId', '==', barberId),
      where('requestedDate', '==', date),
      where('status', '==', 'waiting'),
      orderBy('priority', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const entries: WaitlistEntry[] = [];
    
    snapshot.forEach(doc => {
      entries.push({
        waitlistId: doc.id,
        ...doc.data()
      } as WaitlistEntry);
    });
    
    return entries;
  } catch (error) {
    console.error('❌ Error getting waitlist:', error);
    return [];
  }
};

// Get all waitlist entries for admin view
export const getAllWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.log('❌ User not authenticated for waitlist access');
      return [];
    }
    
    // Check if user is admin
    const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!currentUserDoc.exists() || !currentUserDoc.data().isAdmin) {
      console.log('❌ Only admins can view all waitlist entries');
      return [];
    }
    
    const q = query(
      collection(db, 'waitlist'),
      where('status', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const entries: WaitlistEntry[] = [];
    
    snapshot.forEach(doc => {
      entries.push({
        waitlistId: doc.id,
        ...doc.data()
      } as WaitlistEntry);
    });
    
    return entries;
  } catch (error) {
    console.error('❌ Error getting all waitlist entries:', error);
    return [];
  }
};

// Update waitlist entry status
export const updateWaitlistStatus = async (waitlistId: string, status: WaitlistEntry['status'], notes?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'waitlist', waitlistId);
    await updateDoc(docRef, {
      status,
      ...(notes && { notes })
    });
    
    console.log('✅ Waitlist status updated:', status);
  } catch (error) {
    console.error('❌ Error updating waitlist status:', error);
    throw error;
  }
};

// Assign waitlist entry to appointment (when slot opens)
export const assignWaitlistToAppointment = async (waitlistId: string, appointmentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'waitlist', waitlistId);
    await updateDoc(docRef, {
      status: 'assigned',
      notes: `Assigned to appointment: ${appointmentId}`
    });
    
    console.log('✅ Waitlist entry assigned to appointment:', appointmentId);
  } catch (error) {
    console.error('❌ Error assigning waitlist to appointment:', error);
    throw error;
  }
};

// Remove user from waitlist
export const removeFromWaitlist = async (waitlistId: string, reason?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'waitlist', waitlistId);
    await updateDoc(docRef, {
      status: 'removed',
      notes: reason || 'Removed by admin'
    });
    
    console.log('✅ User removed from waitlist:', waitlistId);
  } catch (error) {
    console.error('❌ Error removing from waitlist:', error);
    throw error;
  }
};

// Clean up expired waitlist entries (past dates)
export const cleanupExpiredWaitlistEntries = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const q = query(
      collection(db, 'waitlist'),
      where('status', '==', 'waiting')
    );
    
    const querySnapshot = await getDocs(q);
    const expiredEntries: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.preferredDate) {
        const preferredDate = new Date(data.preferredDate);
        preferredDate.setHours(0, 0, 0, 0);
        
        // If preferred date is in the past, mark for deletion
        if (preferredDate < today) {
          expiredEntries.push(doc.id);
        }
      }
    });
    
    // Delete expired entries
    const deletePromises = expiredEntries.map(id => deleteDoc(doc(db, 'waitlist', id)));
    await Promise.all(deletePromises);
    
    console.log(`🧹 Cleaned up ${expiredEntries.length} expired waitlist entries`);
  } catch (error) {
    console.error('❌ Error cleaning up expired waitlist entries:', error);
  }
};

// Listen to waitlist changes in real-time
export const listenWaitlistChanges = (callback: (entries: WaitlistEntry[]) => void) => {
  const q = query(
    collection(db, 'waitlist'),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const entries: WaitlistEntry[] = [];
    snapshot.forEach(doc => {
      entries.push({
        waitlistId: doc.id,
        ...doc.data()
      } as WaitlistEntry);
    });
    
    callback(entries);
  });
};

// Listen to specific barber's waitlist
export const listenBarberWaitlist = (barberId: string, callback: (entries: WaitlistEntry[]) => void) => {
  const q = query(
    collection(db, 'waitlist'),
    where('barberId', '==', barberId),
    where('status', '==', 'waiting'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const entries: WaitlistEntry[] = [];
    snapshot.forEach(doc => {
      entries.push({
        waitlistId: doc.id,
        ...doc.data()
      } as WaitlistEntry);
    });
    
    callback(entries);
  });
};

// Notification management functions
export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'reminder' | 'cancellation' | 'confirmation';
  appointmentId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date; // For scheduled reminders
}

// Create a new notification
export const createNotification = async (notificationData: Omit<NotificationData, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const notification: NotificationData = {
      ...notificationData,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isRead: false
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    console.log('✅ Notification created successfully:', notification.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get user notifications
export const getUserNotifications = async (userId: string): Promise<NotificationData[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: NotificationData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        scheduledFor: data.scheduledFor?.toDate()
      } as NotificationData);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { isRead: true });
    console.log('✅ Notification marked as read:', notificationId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Delete old notifications (older than 1 day after appointment)
export const cleanupOldNotifications = async (): Promise<void> => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const q = query(
      collection(db, 'notifications'),
      where('appointmentDate', '<', oneDayAgo.toISOString().split('T')[0])
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    console.log(`✅ Cleaned up ${deletePromises.length} old notifications`);
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
  }
};

// Send appointment confirmation notification
export const sendAppointmentConfirmationNotification = async (
  userId: string, 
  appointmentId: string, 
  appointmentDate: string, 
  appointmentTime: string,
  barberName: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      title: 'אישור תור',
      message: `התור שלך ליום ${appointmentDate} בשעה ${appointmentTime} עם ${barberName} אושר בהצלחה!`,
      type: 'confirmation',
      appointmentId,
      appointmentDate,
      appointmentTime,
      isRead: false
    });
    
    console.log('✅ Appointment confirmation notification sent');
  } catch (error) {
    console.error('Error sending appointment confirmation notification:', error);
  }
};

// Schedule reminder notifications
export const scheduleAppointmentReminders = async (
  userId: string,
  appointmentId: string,
  appointmentDate: string,
  appointmentTime: string,
  barberName: string
): Promise<void> => {
  try {
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
    
    // 1 hour before reminder
    const oneHourBefore = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (oneHourBefore > new Date()) {
      await createNotification({
        userId,
        title: 'תזכורת לתור - שעה לפני',
        message: `התור שלך עם ${barberName} מתחיל בעוד שעה. אל תשכח!`,
        type: 'reminder',
        appointmentId,
        appointmentDate,
        appointmentTime,
        scheduledFor: oneHourBefore,
        isRead: false
      });
    }
    
    // 5 minutes before reminder
    const fiveMinutesBefore = new Date(appointmentDateTime.getTime() - 5 * 60 * 1000);
    if (fiveMinutesBefore > new Date()) {
      await createNotification({
        userId,
        title: 'תזכורת לתור - 5 דקות לפני',
        message: `התור שלך עם ${barberName} מתחיל בעוד 5 דקות!`,
        type: 'reminder',
        appointmentId,
        appointmentDate,
        appointmentTime,
        scheduledFor: fiveMinutesBefore,
        isRead: false
      });
    }
    
    console.log('✅ Appointment reminders scheduled');
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
};

// Send cancellation notification
export const sendCancellationNotification = async (
  userId: string,
  appointmentDate: string,
  appointmentTime: string,
  barberName: string
): Promise<void> => {
  try {
    await createNotification({
      userId,
      title: 'ביטול תור',
      message: `התור שלך ליום ${appointmentDate} בשעה ${appointmentTime} עם ${barberName} בוטל.`,
      type: 'cancellation',
      appointmentDate,
      appointmentTime,
      isRead: false
    });
    
    console.log('✅ Cancellation notification sent');
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
  }
};