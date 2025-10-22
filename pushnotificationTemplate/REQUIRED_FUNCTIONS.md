# 🔧 פונקציות שצריך ליישם בפרויקט החדש

## פונקציות בסיסיות שצריך ליישם

### 1. ניהול משתמשים

```typescript
// צריך ליישם בפרויקט החדש
interface UserProfile {
  uid: string;
  displayName: string;
  phone: string;
  pushToken?: string;
  isAdmin?: boolean;
}

// פונקציות שצריך ליישם:
async function getUserProfile(userId: string): Promise<UserProfile | null>
async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void>
async function getAllUsers(): Promise<UserProfile[]>
```

### 2. ניהול תורים (אופציונלי)

```typescript
// אם יש לך מערכת תורים, צריך ליישם:
interface Appointment {
  id: string;
  userId: string;
  date: Date;
  treatmentName: string;
  barberName: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
}

// פונקציות שצריך ליישם:
async function createAppointment(data: AppointmentData): Promise<Appointment>
async function cancelAppointment(appointmentId: string): Promise<void>
async function confirmAppointment(appointmentId: string): Promise<void>
```

### 3. אינטגרציה עם Firebase

```typescript
// אם אתה משתמש ב-Firebase, צריך ליישם:
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// דוגמה לום:
export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updates);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { uid: userId, ...userSnap.data() } as UserProfile;
  }
  
  return null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);
  
  return usersSnap.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as UserProfile[];
}
```

## דוגמה מלאה לום

### קובץ: `services/userService.ts`

```typescript
import { doc, updateDoc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  phone: string;
  email?: string;
  pushToken?: string;
  isAdmin?: boolean;
  createdAt: any;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { uid: userId, ...userSnap.data() } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
    console.log('✅ User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    return usersSnap.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as UserProfile[];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

export async function findUserByPhone(phone: string): Promise<UserProfile | null> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by phone:', error);
    return null;
  }
}

export async function getAdminUsers(): Promise<UserProfile[]> {
  try {
    const users = await getAllUsers();
    return users.filter(user => user.isAdmin);
  } catch (error) {
    console.error('Error getting admin users:', error);
    return [];
  }
}
```

### קובץ: `services/appointmentService.ts` (אופציונלי)

```typescript
import { doc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Appointment {
  id?: string;
  userId: string;
  barberId: string;
  treatmentId: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  treatmentName: string;
  barberName: string;
  createdAt: Timestamp;
}

export async function createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsRef, {
      ...appointmentData,
      createdAt: Timestamp.now()
    });
    
    return {
      id: docRef.id,
      ...appointmentData,
      createdAt: Timestamp.now()
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    await updateDoc(appointmentRef, { status });
    console.log('✅ Appointment status updated');
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
}

export async function cancelAppointment(appointmentId: string): Promise<void> {
  await updateAppointmentStatus(appointmentId, 'cancelled');
}

export async function confirmAppointment(appointmentId: string): Promise<void> {
  await updateAppointmentStatus(appointmentId, 'confirmed');
}

export async function getAppointmentsByUser(userId: string): Promise<Appointment[]> {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[];
  } catch (error) {
    console.error('Error getting appointments by user:', error);
    return [];
  }
}
```

## אינטגרציה עם המערכת הקיימת

### עדכון notificationService.ts

```typescript
// הוסף את הייבוא שלך
import { getUserProfile, updateUserProfile, getAllUsers } from './userService';

// עדכן את הפונקציות להשתמש בפונקציות שלך
export const registerForPushNotifications = async (userId: string): Promise<string | null> => {
  try {
    // ... קוד קיים ...
    
    // שמור את ה-token באמצעות הפונקציה שלך
    await updateUserProfile(userId, { pushToken: token });
    
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};
```

## בדיקות

```typescript
// בדיקה בסיסית
async function testNotificationSystem() {
  try {
    // בדיקת רישום
    const token = await registerForPushNotifications('test-user');
    console.log('Registration test:', token ? '✅' : '❌');
    
    // בדיקת שליחה
    const user = await getUserProfile('test-user');
    if (user) {
      await sendNotificationToUser(user, 'בדיקה', 'הודעת בדיקה');
      console.log('Send test: ✅');
    }
    
    // בדיקת SMS
    await sendSms('0521234567', 'בדיקת SMS');
    console.log('SMS test: ✅');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}
```

## סיכום

1. **העתק את קבצי המערכת** לפרויקט החדש
2. **יישם את הפונקציות הבסיסיות** (ניהול משתמשים)
3. **הגדר את Firebase** ואת משתני הסביבה
4. **בדוק את המערכת** עם הפונקציות הבסיסיות
5. **התאם אישית** לפי הצרכים של הפרויקט שלך

המערכת מוכנה לשימוש מיד אחרי יישום הפונקציות הבסיסיות! 🚀
