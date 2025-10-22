import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { auth, checkIsAdmin, checkIsBarber, UserProfile } from '../app/config/firebase';

// Storage keys
const AUTH_STORAGE_KEY = 'user_auth_data';
const USER_PROFILE_KEY = 'user_profile_data';
const LOGIN_METHOD_KEY = 'user_login_method';

// Login method types
export type LoginMethod = 'email' | 'phone' | 'google' | 'apple';

// Stored auth data interface
interface StoredAuthData {
  email?: string;
  phone?: string;
  password?: string;
  loginMethod: LoginMethod;
  lastLoginTime: number;
  rememberMe: boolean;
}

// Auth manager class
export class AuthManager {
  private static instance: AuthManager;
  private authStateListener: (() => void) | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Initialize auth manager
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔐 Initializing AuthManager...');
    
    // Set up auth state listener
    this.authStateListener = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('👤 User authenticated:', user.uid);
        await this.saveUserData(user);
      } else {
        console.log('👤 User signed out');
        await this.clearStoredAuthData();
      }
    });

    this.isInitialized = true;
    console.log('✅ AuthManager initialized');
  }

  // Save user authentication data
  public async saveAuthData(
    email: string,
    password: string,
    loginMethod: LoginMethod = 'email',
    rememberMe: boolean = true
  ): Promise<void> {
    try {
      const authData: StoredAuthData = {
        email,
        password: rememberMe ? password : undefined,
        loginMethod,
        lastLoginTime: Date.now(),
        rememberMe
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      console.log('💾 Auth data saved successfully');
    } catch (error) {
      console.error('❌ Error saving auth data:', error);
    }
  }

  // Save phone authentication data
  public async savePhoneAuthData(
    phone: string,
    loginMethod: LoginMethod = 'phone',
    rememberMe: boolean = true
  ): Promise<void> {
    try {
      const authData: StoredAuthData = {
        phone,
        loginMethod,
        lastLoginTime: Date.now(),
        rememberMe
      };

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      console.log('💾 Phone auth data saved successfully');
    } catch (error) {
      console.error('❌ Error saving phone auth data:', error);
    }
  }

  // Save user profile data
  public async saveUserData(user: User): Promise<void> {
    try {
      const userProfile: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        profileImage: user.photoURL || undefined,
      };

      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      console.log('💾 User profile saved successfully');
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
    }
  }

  // Get stored auth data
  public async getStoredAuthData(): Promise<StoredAuthData | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const authData = JSON.parse(stored) as StoredAuthData;
        
        // Check if data is not too old (30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (authData.lastLoginTime > thirtyDaysAgo) {
          return authData;
        } else {
          // Clear old data
          await this.clearStoredAuthData();
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting stored auth data:', error);
      return null;
    }
  }

  // Get stored user profile
  public async getStoredUserProfile(): Promise<Partial<UserProfile> | null> {
    try {
      const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
      if (stored) {
        return JSON.parse(stored) as Partial<UserProfile>;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting stored user profile:', error);
      return null;
    }
  }

  // Auto login with stored credentials
  public async attemptAutoLogin(): Promise<{ success: boolean; user?: User; isAdmin?: boolean; isBarber?: boolean }> {
    try {
      console.log('🔄 Attempting auto login...');
      
      const authData = await this.getStoredAuthData();
      if (!authData || !authData.rememberMe) {
        console.log('❌ No stored auth data or remember me disabled');
        return { success: false };
      }

      // Check if user is already logged in
      if (auth.currentUser) {
        console.log('✅ User already logged in');
        const isAdmin = await checkIsAdmin(auth.currentUser.uid);
        const isBarber = await checkIsBarber(auth.currentUser.uid);
        return { 
          success: true, 
          user: auth.currentUser, 
          isAdmin, 
          isBarber 
        };
      }

      // Try to login with stored credentials
      if (authData.email && authData.password) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, authData.email, authData.password);
          console.log('✅ Auto login successful with email');
          
          const isAdmin = await checkIsAdmin(userCredential.user.uid);
          const isBarber = await checkIsBarber(userCredential.user.uid);
          
          return { 
            success: true, 
            user: userCredential.user, 
            isAdmin, 
            isBarber 
          };
        } catch (error) {
          console.error('❌ Auto login failed with email:', error);
          // Clear invalid credentials
          await this.clearStoredAuthData();
        }
      }

      return { success: false };
    } catch (error) {
      console.error('❌ Error during auto login:', error);
      return { success: false };
    }
  }

  // Clear stored authentication data
  public async clearStoredAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USER_PROFILE_KEY, LOGIN_METHOD_KEY]);
      console.log('🗑️ Stored auth data cleared');
    } catch (error) {
      console.error('❌ Error clearing stored auth data:', error);
    }
  }

  // Check if user should be remembered
  public async shouldRememberUser(): Promise<boolean> {
    try {
      const authData = await this.getStoredAuthData();
      return authData?.rememberMe || false;
    } catch (error) {
      console.error('❌ Error checking remember user:', error);
      return false;
    }
  }

  // Update remember me preference
  public async updateRememberMe(rememberMe: boolean): Promise<void> {
    try {
      const authData = await this.getStoredAuthData();
      if (authData) {
        authData.rememberMe = rememberMe;
        if (!rememberMe) {
          authData.password = undefined; // Remove password if not remembering
        }
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        console.log('💾 Remember me preference updated');
      }
    } catch (error) {
      console.error('❌ Error updating remember me:', error);
    }
  }

  // Get user role information
  public async getUserRoleInfo(userId: string): Promise<{ isAdmin: boolean; isBarber: boolean }> {
    try {
      const [isAdmin, isBarber] = await Promise.all([
        checkIsAdmin(userId),
        checkIsBarber(userId)
      ]);
      
      return { isAdmin, isBarber };
    } catch (error) {
      console.error('❌ Error getting user role info:', error);
      return { isAdmin: false, isBarber: false };
    }
  }

  // Cleanup
  public cleanup(): void {
    if (this.authStateListener) {
      this.authStateListener();
      this.authStateListener = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance();

// Convenience functions
export const saveAuthData = (email: string, password: string, loginMethod: LoginMethod = 'email', rememberMe: boolean = true) =>
  authManager.saveAuthData(email, password, loginMethod, rememberMe);

export const savePhoneAuthData = (phone: string, loginMethod: LoginMethod = 'phone', rememberMe: boolean = true) =>
  authManager.savePhoneAuthData(phone, loginMethod, rememberMe);

export const attemptAutoLogin = () => authManager.attemptAutoLogin();

export const clearStoredAuthData = () => authManager.clearStoredAuthData();

export const getStoredAuthData = () => authManager.getStoredAuthData();

export const shouldRememberUser = () => authManager.shouldRememberUser();

export const updateRememberMe = (rememberMe: boolean) => authManager.updateRememberMe(rememberMe);
