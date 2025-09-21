#!/usr/bin/env ts-node

import { processScheduledReminders } from '../services/firebase';

/**
 * סקריפט לעיבוד התזכורות המתוזמנות
 *
 * מריץ את הפונקציה processScheduledReminders שמוצאת תזכורות שהגיע זמנן ושולחת אותן.
 * יש להריץ את הסקריפט הזה כל דקה או כל 5 דקות באמצעות cron job.
 *
 * דוגמה להגדרת cron job (כל 5 דקות):
 * star/5 * * * * cd /path/to/your/project && npm run process-reminders
 *
 * או להתקין ב-vercel/netlify בתור scheduled function
 */

async function main() {
  try {
    console.log(`🚀 Starting reminder processing at ${new Date().toISOString()}`);

    // עיבוד כל התזכורות שהגיע זמנן
    const processedCount = await processScheduledReminders();

    if (processedCount > 0) {
      console.log(`✅ Successfully processed ${processedCount} reminders`);
    } else {
      console.log('ℹ️ No reminders to process at this time');
    }

    console.log(`🏁 Reminder processing completed at ${new Date().toISOString()}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error processing reminders:', error);
    process.exit(1);
  }
}

// הרצה רק אם הסקריפט נקרא ישירות (לא בתור import)
if (require.main === module) {
  main();
}

export { main as processRemindersMain };