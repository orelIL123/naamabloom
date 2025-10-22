#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * סקריפט לבדיקת משתני הסביבה
 * 
 * Usage: node scripts/validate-env.js
 * שימוש: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Required environment variables
const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'
];

// Optional environment variables with defaults
const optionalVars = [
  'EAS_PROJECT_ID',
  'IOS_BUILD_NUMBER',
  'ANDROID_VERSION_CODE',
  'NODE_ENV'
];

// File paths to check
const requiredFiles = [
  './ios/BarbersBar/GoogleService-Info.plist',
  './android/app/google-services.json'
];

console.log('🔍 Barbers Bar - Environment Validation');
console.log('=====================================\n');

let hasErrors = false;

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 Please copy env.template to .env and fill in the values\n');
  hasErrors = true;
} else {
  console.log('✅ .env file found');
  
  // Load and parse .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  // Check required variables
  console.log('\n📋 Checking required environment variables:');
  requiredVars.forEach(varName => {
    if (envVars[varName] && envVars[varName] !== 'your-firebase-project-id') {
      console.log(`✅ ${varName}`);
    } else {
      console.error(`❌ ${varName} - Missing or has default value`);
      hasErrors = true;
    }
  });
  
  // Check optional variables
  console.log('\n📋 Checking optional environment variables:');
  optionalVars.forEach(varName => {
    if (envVars[varName]) {
      console.log(`✅ ${varName} = ${envVars[varName]}`);
    } else {
      console.log(`⚠️  ${varName} - Not set (using default)`);
    }
  });
}

// Check required files
console.log('\n📁 Checking required files:');
requiredFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${filePath}`);
  } else {
    console.error(`❌ ${filePath} - File not found`);
    hasErrors = true;
  }
});

// Check .gitignore
console.log('\n🔒 Checking .gitignore:');
const gitignorePath = path.join(process.cwd(), '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  
  const requiredIgnores = [
    '.env',
    'GoogleService-Info.plist',
    'google-services.json'
  ];
  
  requiredIgnores.forEach(ignore => {
    if (gitignoreContent.includes(ignore)) {
      console.log(`✅ ${ignore} is ignored`);
    } else {
      console.error(`❌ ${ignore} is NOT ignored in .gitignore`);
      hasErrors = true;
    }
  });
} else {
  console.error('❌ .gitignore file not found');
  hasErrors = true;
}

// Final result
console.log('\n=====================================');
if (hasErrors) {
  console.error('❌ Validation failed! Please fix the issues above.');
  process.exit(1);
} else {
  console.log('✅ All validations passed! Environment is properly configured.');
  console.log('\n🚀 You can now run: npx expo start');
}
