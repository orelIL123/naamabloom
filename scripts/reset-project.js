#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Project reset utility
async function resetProject() {
  try {
    // Clear local configurations
    const filesToReset = [
      '.env',
      'google-services.json',
      'GoogleService-Info.plist'
    ];

    filesToReset.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Removed sensitive file: ${file}`);
      }
    });

    // Reset Firebase config
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-config.js');
    if (fs.existsSync(firebaseConfigPath)) {
      fs.writeFileSync(firebaseConfigPath, `
// Replace with your Firebase configuration
export default {
  apiKey: '',
  authDomain: '',
  projectId: '',
  // ... other config
};
`);
      console.log('Firebase config reset');
    }

    console.log('Project reset complete. Please update configurations manually.');
  } catch (error) {
    console.error('Error during project reset:', error);
    process.exit(1);
  }
}

resetProject();