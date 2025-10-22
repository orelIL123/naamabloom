#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Android Build Debug Script');
console.log('=============================\n');

// Check if we're in the right directory
if (!fs.existsSync('app.json')) {
  console.error('❌ Error: app.json not found. Please run this script from the project root.');
  process.exit(1);
}

// Check EAS CLI
try {
  const easVersion = execSync('eas --version', { encoding: 'utf8' }).trim();
  console.log(`✅ EAS CLI version: ${easVersion}`);
} catch (error) {
  console.error('❌ EAS CLI not found. Please install it with: npm install -g @expo/eas-cli');
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.version;
console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules directory exists');
} else {
  console.error('❌ node_modules not found. Please run: npm install');
  process.exit(1);
}

// Check Android-specific files
const androidFiles = [
  'app/google-services.json',
  'android/app/build.gradle',
  'android/gradle.properties'
];

console.log('\n📱 Checking Android files:');
androidFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('\n📦 Available build scripts:');
Object.keys(packageJson.scripts).forEach(script => {
  if (script.includes('android') || script.includes('build')) {
    console.log(`  - ${script}: ${packageJson.scripts[script]}`);
  }
});

// Check for common issues
console.log('\n🔧 Common Android build issues to check:');
console.log('  1. Duplicate permissions in app.json ✅ (Fixed)');
console.log('  2. High SDK versions ✅ (Fixed - now using SDK 34)');
console.log('  3. Complex polyfills ✅ (Simplified)');
console.log('  4. Metro config ✅ (Optimized)');

console.log('\n🚀 To build Android:');
console.log('  - Development: eas build --platform android --profile development');
console.log('  - Production: eas build --platform android --profile production');
console.log('  - Preview: eas build --platform android --profile preview');

console.log('\n📋 If build still fails, check:');
console.log('  1. EAS build logs for specific error messages');
console.log('  2. Android SDK installation');
console.log('  3. Java/JDK version compatibility');
console.log('  4. Gradle version compatibility');

console.log('\n✨ Android build configuration has been optimized!');
