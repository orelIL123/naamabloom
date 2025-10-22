import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../app/config/firebase';
import {
    sendNotificationToUsers
} from './pushNotificationService';

export interface UpdateInfo {
  version: string;
  buildNumber: string;
  releaseNotes: string;
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
  releaseDate: Date;
  isForced: boolean;
}

export class UpdateNotificationService {
  private static instance: UpdateNotificationService;

  private constructor() {}

  public static getInstance(): UpdateNotificationService {
    if (!UpdateNotificationService.instance) {
      UpdateNotificationService.instance = new UpdateNotificationService();
    }
    return UpdateNotificationService.instance;
  }

  // Send update notification to all users
  public async notifyAllUsersAboutUpdate(updateInfo: UpdateInfo): Promise<void> {
    try {
      console.log('🚀 Sending update notification to all users...');
      
      // Get all users
      const allUsers = await this.getAllUsers();
      
      if (allUsers.length === 0) {
        console.log('No users found to notify');
        return;
      }

      // Create update message
      const updateMessage = this.createUpdateMessage(updateInfo);
      
      // Send to all users
      await sendNotificationToUsers(
        allUsers,
        'עדכון חדש לאפליקציה! 📱',
        updateMessage,
        { 
          type: 'system_update',
          version: updateInfo.version,
          buildNumber: updateInfo.buildNumber,
          releaseDate: updateInfo.releaseDate.toISOString()
        }
      );

      console.log(`✅ Update notification sent to ${allUsers.length} users`);
    } catch (error) {
      console.error('Error sending update notification:', error);
    }
  }

  // Send update notification to admins only
  public async notifyAdminsAboutUpdate(updateInfo: UpdateInfo): Promise<void> {
    try {
      console.log('🚀 Sending update notification to admins...');
      
      // Get admin users
      const adminUsers = await this.getAdminUsers();
      
      if (adminUsers.length === 0) {
        console.log('No admin users found to notify');
        return;
      }

      // Create detailed update message for admins
      const adminUpdateMessage = this.createAdminUpdateMessage(updateInfo);
      
      // Send to admins
      await sendNotificationToUsers(
        adminUsers,
        'עדכון חדש לאפליקציה! 📱',
        adminUpdateMessage,
        { 
          type: 'system_update',
          version: updateInfo.version,
          buildNumber: updateInfo.buildNumber,
          releaseDate: updateInfo.releaseDate.toISOString(),
          isForced: updateInfo.isForced
        }
      );

      console.log(`✅ Update notification sent to ${adminUsers.length} admins`);
    } catch (error) {
      console.error('Error sending update notification to admins:', error);
    }
  }

  // Send update notification to barbers only
  public async notifyBarbersAboutUpdate(updateInfo: UpdateInfo): Promise<void> {
    try {
      console.log('🚀 Sending update notification to barbers...');
      
      // Get barber users
      const barberUsers = await this.getBarberUsers();
      
      if (barberUsers.length === 0) {
        console.log('No barber users found to notify');
        return;
      }

      // Create barber-specific update message
      const barberUpdateMessage = this.createBarberUpdateMessage(updateInfo);
      
      // Send to barbers
      await sendNotificationToUsers(
        barberUsers,
        'עדכון חדש לאפליקציה! 📱',
        barberUpdateMessage,
        { 
          type: 'system_update',
          version: updateInfo.version,
          buildNumber: updateInfo.buildNumber,
          releaseDate: updateInfo.releaseDate.toISOString()
        }
      );

      console.log(`✅ Update notification sent to ${barberUsers.length} barbers`);
    } catch (error) {
      console.error('Error sending update notification to barbers:', error);
    }
  }

  // Send update notification to specific user
  public async notifyUserAboutUpdate(userId: string, updateInfo: UpdateInfo): Promise<void> {
    try {
      console.log(`🚀 Sending update notification to user ${userId}...`);
      
      // Get user profile
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        console.log(`User ${userId} not found`);
        return;
      }

      // Create personalized update message
      const personalizedMessage = this.createPersonalizedUpdateMessage(updateInfo, userProfile);
      
      // Send to user
      await sendNotificationToUsers(
        [userProfile],
        'עדכון חדש לאפליקציה! 📱',
        personalizedMessage,
        { 
          type: 'system_update',
          version: updateInfo.version,
          buildNumber: updateInfo.buildNumber,
          releaseDate: updateInfo.releaseDate.toISOString()
        }
      );

      console.log(`✅ Update notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending update notification to user:', error);
    }
  }

  // Create update message for general users
  private createUpdateMessage(updateInfo: UpdateInfo): string {
    let message = `גרסה ${updateInfo.version} זמינה עכשיו!\n\n`;
    
    if (updateInfo.releaseNotes) {
      message += `מה חדש:\n${updateInfo.releaseNotes}\n\n`;
    }
    
    if (updateInfo.newFeatures.length > 0) {
      message += `תכונות חדשות:\n`;
      updateInfo.newFeatures.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.improvements.length > 0) {
      message += `שיפורים:\n`;
      updateInfo.improvements.forEach(improvement => {
        message += `• ${improvement}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.bugFixes.length > 0) {
      message += `תיקוני באגים:\n`;
      updateInfo.bugFixes.forEach(fix => {
        message += `• ${fix}\n`;
      });
      message += '\n';
    }
    
    message += `עדכון זה כולל שיפורי ביצועים ואבטחה.`;
    
    if (updateInfo.isForced) {
      message += `\n\n⚠️ עדכון חובה - אנא עדכן את האפליקציה בהקדם.`;
    }
    
    return message;
  }

  // Create detailed update message for admins
  private createAdminUpdateMessage(updateInfo: UpdateInfo): string {
    let message = `עדכון חדש לאפליקציה - גרסה ${updateInfo.version}\n\n`;
    
    message += `פרטי העדכון:\n`;
    message += `• מספר גרסה: ${updateInfo.version}\n`;
    message += `• מספר בנייה: ${updateInfo.buildNumber}\n`;
    message += `• תאריך שחרור: ${updateInfo.releaseDate.toLocaleDateString('he-IL')}\n\n`;
    
    if (updateInfo.releaseNotes) {
      message += `הערות שחרור:\n${updateInfo.releaseNotes}\n\n`;
    }
    
    if (updateInfo.newFeatures.length > 0) {
      message += `תכונות חדשות:\n`;
      updateInfo.newFeatures.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.improvements.length > 0) {
      message += `שיפורים:\n`;
      updateInfo.improvements.forEach(improvement => {
        message += `• ${improvement}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.bugFixes.length > 0) {
      message += `תיקוני באגים:\n`;
      updateInfo.bugFixes.forEach(fix => {
        message += `• ${fix}\n`;
      });
      message += '\n';
    }
    
    message += `העדכון כולל שיפורי ביצועים, אבטחה ויציבות.`;
    
    if (updateInfo.isForced) {
      message += `\n\n⚠️ עדכון חובה - כל המשתמשים יקבלו התראה לעדכון.`;
    }
    
    return message;
  }

  // Create barber-specific update message
  private createBarberUpdateMessage(updateInfo: UpdateInfo): string {
    let message = `עדכון חדש לאפליקציה - גרסה ${updateInfo.version}\n\n`;
    
    message += `מה חדש עבורך:\n`;
    
    if (updateInfo.newFeatures.length > 0) {
      message += `תכונות חדשות:\n`;
      updateInfo.newFeatures.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.improvements.length > 0) {
      message += `שיפורים:\n`;
      updateInfo.improvements.forEach(improvement => {
        message += `• ${improvement}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.bugFixes.length > 0) {
      message += `תיקוני באגים:\n`;
      updateInfo.bugFixes.forEach(fix => {
        message += `• ${fix}\n`;
      });
      message += '\n';
    }
    
    message += `העדכון כולל שיפורי ביצועים ואבטחה.`;
    
    if (updateInfo.isForced) {
      message += `\n\n⚠️ עדכון חובה - אנא עדכן את האפליקציה בהקדם.`;
    }
    
    return message;
  }

  // Create personalized update message
  private createPersonalizedUpdateMessage(updateInfo: UpdateInfo, userProfile: any): string {
    let message = `שלום ${userProfile.displayName || 'יקר'}! 👋\n\n`;
    
    message += `עדכון חדש לאפליקציה - גרסה ${updateInfo.version}\n\n`;
    
    if (updateInfo.releaseNotes) {
      message += `מה חדש:\n${updateInfo.releaseNotes}\n\n`;
    }
    
    if (updateInfo.newFeatures.length > 0) {
      message += `תכונות חדשות:\n`;
      updateInfo.newFeatures.forEach(feature => {
        message += `• ${feature}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.improvements.length > 0) {
      message += `שיפורים:\n`;
      updateInfo.improvements.forEach(improvement => {
        message += `• ${improvement}\n`;
      });
      message += '\n';
    }
    
    if (updateInfo.bugFixes.length > 0) {
      message += `תיקוני באגים:\n`;
      updateInfo.bugFixes.forEach(fix => {
        message += `• ${fix}\n`;
      });
      message += '\n';
    }
    
    message += `העדכון כולל שיפורי ביצועים ואבטחה.`;
    
    if (updateInfo.isForced) {
      message += `\n\n⚠️ עדכון חובה - אנא עדכן את האפליקציה בהקדם.`;
    }
    
    return message;
  }

  // Get all users
  private async getAllUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      return usersSnap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Get admin users
  private async getAdminUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isAdmin', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  // Get barber users
  private async getBarberUsers(): Promise<any[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('isBarber', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting barber users:', error);
      return [];
    }
  }

  // Get user profile
  private async getUserProfile(userId: string): Promise<any> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../app/config/firebase');
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { uid: userId, ...userSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const updateNotificationService = UpdateNotificationService.getInstance();

// Convenience functions
export const notifyAllUsersAboutUpdate = (updateInfo: UpdateInfo) =>
  updateNotificationService.notifyAllUsersAboutUpdate(updateInfo);

export const notifyAdminsAboutUpdate = (updateInfo: UpdateInfo) =>
  updateNotificationService.notifyAdminsAboutUpdate(updateInfo);

export const notifyBarbersAboutUpdate = (updateInfo: UpdateInfo) =>
  updateNotificationService.notifyBarbersAboutUpdate(updateInfo);

export const notifyUserAboutUpdate = (userId: string, updateInfo: UpdateInfo) =>
  updateNotificationService.notifyUserAboutUpdate(userId, updateInfo);

