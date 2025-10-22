#!/usr/bin/env node

/**
 * MCP Setup Validation Script
 * Validates Firebase configuration, Android setup, and Google Play readiness
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.successes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (type === 'error') this.errors.push(message);
    else if (type === 'warning') this.warnings.push(message);
    else if (type === 'success') this.successes.push(message);
  }

  async validateFileExists(filePath, required = true) {
    const fullPath = path.resolve(PROJECT_ROOT, filePath);
    try {
      await fs.access(fullPath);
      this.log(`File exists: ${filePath}`, 'success');
      return true;
    } catch (error) {
      const type = required ? 'error' : 'warning';
      this.log(`File missing: ${filePath}`, type);
      return false;
    }
  }

  async validateJsonFile(filePath, requiredFields = []) {
    const fullPath = path.resolve(PROJECT_ROOT, filePath);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      const json = JSON.parse(content);
      
      this.log(`Valid JSON: ${filePath}`, 'success');
      
      for (const field of requiredFields) {
        const keys = field.split('.');
        let value = json;
        
        for (const key of keys) {
          if (key.includes('[') && key.includes(']')) {
            const arrayKey = key.substring(0, key.indexOf('['));
            const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
            value = value?.[arrayKey]?.[index];
          } else {
            value = value?.[key];
          }
        }
        
        if (!value) {
          this.log(`Missing required field in ${filePath}: ${field}`, 'error');
        } else {
          this.log(`Found required field in ${filePath}: ${field}`, 'success');
        }
      }
      
      return json;
    } catch (error) {
      this.log(`Invalid JSON file ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  async validateFirebaseConfig() {
    this.log('🔥 Validating Firebase configuration...', 'info');
    
    // Validate google-services.json
    const googleServices = await this.validateJsonFile('app/google-services.json', [
      'project_info.project_id',
      'project_info.project_number',
      'project_info.storage_bucket',
      'client[0].client_info.mobilesdk_app_id',
      'client[0].client_info.android_client_info.package_name'
    ]);
    
    if (googleServices) {
      const projectId = googleServices.project_info?.project_id;
      const packageName = googleServices.client?.[0]?.client_info?.android_client_info?.package_name;
      
      if (projectId === 'barbers-bar-ae31f') {
        this.log('Project ID matches expected value', 'success');
      } else {
        this.log(`Project ID mismatch: expected 'barbers-bar-ae31f', got '${projectId}'`, 'warning');
      }
      
      if (packageName === 'com.barbersbar.app') {
        this.log('Package name matches expected value', 'success');
      } else {
        this.log(`Package name mismatch: expected 'com.barbersbar.app', got '${packageName}'`, 'error');
      }
    }
    
    // Validate firebase.json
    await this.validateJsonFile('firebase.json', [
      'functions.source',
      'firestore.rules',
      'storage.rules'
    ]);
    
    // Validate iOS GoogleService-Info.plist exists
    await this.validateFileExists('app/GoogleService-Info.plist');
  }

  async validateAndroidConfig() {
    this.log('🤖 Validating Android configuration...', 'info');
    
    // Validate app.json
    const appConfig = await this.validateJsonFile('app.json', [
      'expo.name',
      'expo.version',
      'expo.android.package',
      'expo.android.versionCode',
      'expo.android.googleServicesFile'
    ]);
    
    if (appConfig) {
      const androidConfig = appConfig.expo?.android;
      if (androidConfig?.package === 'com.barbersbar.app') {
        this.log('Android package name in app.json is correct', 'success');
      } else {
        this.log(`Android package name in app.json incorrect: ${androidConfig?.package}`, 'error');
      }
    }
    
    // Validate EAS configuration
    await this.validateJsonFile('eas.json', [
      'build.production.android.buildType',
      'build.production.android.credentialsSource'
    ]);
    
    // Validate gradle files
    await this.validateFileExists('android/gradle.properties');
    await this.validateFileExists('android/app/build.gradle');
    await this.validateFileExists('android/build.gradle');
    
    // Check if build.gradle has correct package name
    try {
      const buildGradlePath = path.resolve(PROJECT_ROOT, 'android/app/build.gradle');
      const buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');
      
      if (buildGradleContent.includes('com.barbersbar.app')) {
        this.log('Build.gradle has correct package name', 'success');
      } else {
        this.log('Build.gradle package name needs to be updated', 'error');
      }
      
      if (buildGradleContent.includes('google-services')) {
        this.log('Google Services plugin configured in build.gradle', 'success');
      } else {
        this.log('Google Services plugin missing from build.gradle', 'warning');
      }
    } catch (error) {
      this.log(`Could not read build.gradle: ${error.message}`, 'error');
    }
  }

  async validatePlayStoreAssets() {
    this.log('🎮 Validating Google Play Store assets...', 'info');
    
    // Required Play Store assets
    const requiredAssets = [
      'assets/google-play/app-icon-512x512.png',
      'assets/google-play/feature-graphic-1024x500-v2.jpg',
      'privacy-policy.html',
      'terms-of-service.html'
    ];
    
    for (const asset of requiredAssets) {
      await this.validateFileExists(asset);
    }
    
    // Optional but recommended assets
    const recommendedAssets = [
      'assets/images/icon.png',
      'assets/images/adaptive-icon.png',
      'assets/images/splash.png'
    ];
    
    for (const asset of recommendedAssets) {
      await this.validateFileExists(asset, false);
    }
  }

  async validateEnvironmentVariables() {
    this.log('🌍 Validating environment configuration...', 'info');
    
    await this.validateFileExists('.env.production');
    await this.validateFileExists('env.template');
    
    const requiredEnvVars = [
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EAS_PROJECT_ID',
      'ANDROID_PACKAGE_NAME'
    ];
    
    // Check if .env.production has required variables
    try {
      const envPath = path.resolve(PROJECT_ROOT, '.env.production');
      const envContent = await fs.readFile(envPath, 'utf8');
      
      for (const envVar of requiredEnvVars) {
        if (envContent.includes(envVar)) {
          this.log(`Environment variable configured: ${envVar}`, 'success');
        } else {
          this.log(`Missing environment variable: ${envVar}`, 'warning');
        }
      }
    } catch (error) {
      this.log('Could not read .env.production file', 'warning');
    }
  }

  async validateMCPServers() {
    this.log('🔧 Validating MCP server configuration...', 'info');
    
    await this.validateFileExists('mcp-server.json');
    await this.validateFileExists('mcp/firebase-server.js');
    await this.validateFileExists('mcp/android-server.js'); 
    await this.validateFileExists('mcp/play-store-server.js');
    await this.validateFileExists('mcp/package.json');
    
    // Validate MCP server configuration
    await this.validateJsonFile('mcp-server.json', [
      'mcpServers.firebase-deploy',
      'mcpServers.android-deploy',
      'mcpServers.play-store-deploy'
    ]);
  }

  async validateCLITools() {
    this.log('🛠️ Validating CLI tools...', 'info');
    
    const tools = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'Expo CLI', command: 'npx expo --version' },
      { name: 'EAS CLI', command: 'npx eas --version' },
      { name: 'Firebase CLI', command: 'npx firebase --version' }
    ];
    
    for (const tool of tools) {
      try {
        const version = execSync(tool.command, { encoding: 'utf8', timeout: 5000 }).trim();
        this.log(`${tool.name} installed: ${version}`, 'success');
      } catch (error) {
        this.log(`${tool.name} not found or not working`, 'warning');
      }
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.errors.length + this.warnings.length + this.successes.length,
        successes: this.successes.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        ready: this.errors.length === 0
      },
      details: {
        successes: this.successes,
        warnings: this.warnings,
        errors: this.errors
      }
    };
    
    // Write report to file
    const reportPath = path.resolve(PROJECT_ROOT, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  async run() {
    this.log('🚀 Starting Barbers Bar deployment validation...', 'info');
    
    await this.validateFirebaseConfig();
    await this.validateAndroidConfig();
    await this.validatePlayStoreAssets();
    await this.validateEnvironmentVariables();
    await this.validateMCPServers();
    await this.validateCLITools();
    
    const report = await this.generateReport();
    
    this.log('\n📊 Validation Summary:', 'info');
    this.log(`✅ Successes: ${report.summary.successes}`, 'success');
    this.log(`⚠️ Warnings: ${report.summary.warnings}`, 'warning');
    this.log(`❌ Errors: ${report.summary.errors}`, 'error');
    this.log(`\n🎯 Ready for deployment: ${report.summary.ready ? 'YES' : 'NO'}`, report.summary.ready ? 'success' : 'error');
    
    if (!report.summary.ready) {
      this.log('\n❌ Please fix the errors above before proceeding with deployment.', 'error');
      process.exit(1);
    } else {
      this.log('\n🎉 All validations passed! Ready for Google Play deployment.', 'success');
    }
    
    return report;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SetupValidator();
  validator.run().catch(console.error);
}

export default SetupValidator;