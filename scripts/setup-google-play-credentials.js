#!/usr/bin/env node

/**
 * Google Play Console API Credentials Setup Script
 * This script helps you set up the necessary credentials for uploading to Google Play Store
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class GooglePlayCredentialsSetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.credentialsPath = path.join(this.projectRoot, 'google-play-credentials.json');
        this.configPath = path.join(this.projectRoot, 'google-play-automation.json');
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async setup() {
        console.log('🔧 Google Play Console API Credentials Setup');
        console.log('============================================');
        console.log('');
        console.log('This script will help you set up the credentials needed to upload');
        console.log('your Barbers Bar app to Google Play Store automatically.');
        console.log('');

        try {
            await this.displayInstructions();
            await this.setupCredentials();
            await this.validateCredentials();
            await this.createConfiguration();
            
            console.log('');
            console.log('🎉 Setup completed successfully!');
            console.log('');
            console.log('You can now run the automated upload with:');
            console.log('  npm run upload-to-playstore');
            console.log('or');
            console.log('  node mcp/google-play-automation-server.js upload');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
        } finally {
            this.rl.close();
        }
    }

    async displayInstructions() {
        console.log('📋 Step 1: Create Google Play Console API Access');
        console.log('');
        console.log('Before continuing, you need to:');
        console.log('');
        console.log('1. Go to Google Cloud Console (https://console.cloud.google.com/)');
        console.log('2. Create a new project or select existing one');
        console.log('3. Enable the Google Play Developer API');
        console.log('4. Create a Service Account:');
        console.log('   - Go to IAM & Admin > Service Accounts');
        console.log('   - Click "Create Service Account"');
        console.log('   - Give it a name like "play-store-uploader"');
        console.log('   - Download the JSON key file');
        console.log('');
        console.log('5. Grant access in Google Play Console:');
        console.log('   - Go to Google Play Console (https://play.google.com/console/)');
        console.log('   - Setup > API access');
        console.log('   - Link your Cloud project');
        console.log('   - Grant access to the service account');
        console.log('   - Give it "Release manager" permissions');
        console.log('');
        
        await this.question('Press Enter when you have completed these steps...');
    }

    async setupCredentials() {
        console.log('📄 Step 2: Provide Service Account Credentials');
        console.log('');
        
        const setupMethod = await this.question(
            'How would you like to provide the credentials?\n' +
            '1. Copy and paste the JSON content\n' +
            '2. Provide path to JSON file\n' +
            'Choose (1 or 2): '
        );

        if (setupMethod === '1') {
            await this.setupCredentialsFromPaste();
        } else if (setupMethod === '2') {
            await this.setupCredentialsFromFile();
        } else {
            throw new Error('Invalid option. Please choose 1 or 2.');
        }
    }

    async setupCredentialsFromPaste() {
        console.log('');
        console.log('📋 Paste your service account JSON content below.');
        console.log('(The content should start with { and end with })');
        console.log('');
        
        const jsonContent = await this.question('Paste JSON content: ');
        
        try {
            const credentials = JSON.parse(jsonContent);
            await this.validateAndSaveCredentials(credentials);
        } catch (error) {
            throw new Error('Invalid JSON format. Please check your input.');
        }
    }

    async setupCredentialsFromFile() {
        console.log('');
        const filePath = await this.question('Enter the path to your service account JSON file: ');
        
        try {
            const jsonContent = await fs.readFile(filePath, 'utf8');
            const credentials = JSON.parse(jsonContent);
            await this.validateAndSaveCredentials(credentials);
        } catch (error) {
            throw new Error(`Failed to read credentials file: ${error.message}`);
        }
    }

    async validateAndSaveCredentials(credentials) {
        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        const missingFields = requiredFields.filter(field => !credentials[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        if (credentials.type !== 'service_account') {
            throw new Error('Invalid credential type. Expected "service_account".');
        }

        // Save credentials
        await fs.writeFile(this.credentialsPath, JSON.stringify(credentials, null, 2));
        console.log('✅ Credentials saved successfully');
    }

    async validateCredentials() {
        console.log('');
        console.log('🔍 Step 3: Validating Credentials');
        
        try {
            const { GoogleAuth } = require('google-auth-library');
            const { google } = require('googleapis');

            const auth = new GoogleAuth({
                keyFile: this.credentialsPath,
                scopes: ['https://www.googleapis.com/auth/androidpublisher']
            });

            const androidPublisher = google.androidpublisher({
                version: 'v3',
                auth: auth
            });

            // Test API access by listing apps (this should work even if the package doesn't exist yet)
            console.log('🔐 Testing API access...');
            
            // This might fail if the app doesn't exist yet, but it will test authentication
            try {
                await androidPublisher.edits.insert({
                    packageName: 'com.barbersbar.app'
                });
                console.log('✅ API access validated successfully');
            } catch (error) {
                if (error.message.includes('not found')) {
                    console.log('⚠️  App not found in Play Console yet - this is expected for new apps');
                    console.log('✅ API credentials are valid');
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            console.error('❌ Credential validation failed:', error.message);
            console.log('');
            console.log('Please check:');
            console.log('1. The service account has the correct permissions');
            console.log('2. The Google Play Developer API is enabled');
            console.log('3. The service account is linked in Google Play Console');
            throw error;
        }
    }

    async createConfiguration() {
        console.log('');
        console.log('⚙️  Step 4: Creating Configuration');
        
        const config = {
            packageName: 'com.barbersbar.app',
            defaultTrack: 'internal',
            autoCommit: true,
            uploadTimeout: 300000, // 5 minutes
            retryAttempts: 3,
            features: {
                buildApp: true,
                uploadBundle: true,
                updateListing: true,
                uploadAssets: true,
                generateScreenshots: true
            },
            contact: {
                website: 'https://barbersbar.app',
                email: 'orel895@gmail.com',
                privacyPolicyUrl: 'https://barbersbar.app/privacy-policy.html',
                termsOfServiceUrl: 'https://barbersbar.app/terms-of-service.html'
            }
        };

        await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
        console.log('✅ Configuration saved');
    }

    async question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// Additional setup functions
async function installDependencies() {
    console.log('📦 Installing required dependencies...');
    
    const { execSync } = require('child_process');
    
    const dependencies = [
        'googleapis',
        'google-auth-library',
        'axios',
        'form-data',
        'sharp'
    ];

    try {
        console.log('Installing:', dependencies.join(', '));
        execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully');
    } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message);
        console.log('');
        console.log('Please install manually:');
        console.log(`npm install ${dependencies.join(' ')}`);
    }
}

async function setupPackageScripts() {
    console.log('📝 Setting up package.json scripts...');
    
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        if (!packageJson.scripts) {
            packageJson.scripts = {};
        }

        // Add upload scripts
        packageJson.scripts['upload-to-playstore'] = 'node mcp/google-play-automation-server.js upload';
        packageJson.scripts['upload-to-playstore-internal'] = 'node mcp/google-play-automation-server.js upload internal';
        packageJson.scripts['upload-to-playstore-alpha'] = 'node mcp/google-play-automation-server.js upload alpha';
        packageJson.scripts['upload-to-playstore-beta'] = 'node mcp/google-play-automation-server.js upload beta';
        packageJson.scripts['generate-screenshots'] = 'node mcp/google-play-automation-server.js screenshots';
        packageJson.scripts['setup-playstore'] = 'node scripts/setup-google-play-credentials.js';

        await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Package.json scripts added');
    } catch (error) {
        console.log('⚠️  Could not update package.json:', error.message);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'setup';

    switch (command) {
        case 'setup':
            Promise.resolve()
                .then(() => installDependencies())
                .then(() => setupPackageScripts())
                .then(() => new GooglePlayCredentialsSetup().setup())
                .catch(console.error);
            break;

        case 'install-deps':
            installDependencies().catch(console.error);
            break;

        case 'scripts':
            setupPackageScripts().catch(console.error);
            break;

        default:
            console.log('Available commands:');
            console.log('  setup        - Full setup process');
            console.log('  install-deps - Install dependencies only');
            console.log('  scripts      - Add package.json scripts only');
    }
}

module.exports = { GooglePlayCredentialsSetup, installDependencies, setupPackageScripts };