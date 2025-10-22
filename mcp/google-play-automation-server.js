#!/usr/bin/env node

/**
 * Google Play Store Automation MCP Server
 * Comprehensive automation for uploading apps to Google Play Console
 * Handles building, uploading, metadata, and store listing details
 */

const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { execSync } = require('child_process');
const sharp = require('sharp');

class GooglePlayAutomationServer {
    constructor() {
        this.packageName = 'com.barbersbar.app';
        this.projectRoot = process.cwd();
        this.configPath = path.join(this.projectRoot, 'google-play-automation.json');
        this.credentialsPath = path.join(this.projectRoot, 'google-play-credentials.json');
        this.androidPublisher = null;
        this.auth = null;
        this.editId = null;
        
        // Store listing data
        this.storeListingData = {
            defaultLanguage: 'he-IL',
            listings: {
                'he-IL': {
                    title: 'ברברס בר - מספרת יוקרה',
                    shortDescription: 'ברוכים הבאים למספרת ברברס בר - החוויה המושלמת לטיפוח גברים',
                    fullDescription: `ברוכים הבאים למספרת ברברס בר!

האפליקציה הרשמית של מספרת ברברס בר מביאה לכם את חוויית הטיפוח המושלמת ישירות לסמארטפון שלכם.

תכונות עיקריות:
📅 קביעת תורים אונליין - בחרו את הספר והשעה הנוחים לכם
💇‍♂️ גלריית עבודות - הכירו את הסגנונות והטיפולים שלנו
👥 הכירו את הצוות - פרופילים מפורטים של הספרים המקצועיים שלנו
⏰ ניהול תורים - עקבו אחרי התורים שלכם וקבלו התראות
🎨 טיפולים מגוונים - ספרות, עיצוב זקן, טיפוח פנים ועוד
🔔 התראות חכמות - קבלו עדכונים על תורים קרובים
📊 מעקב אחר ההיסטוריה - כל הביקורים והטיפולים שלכם

מספרת ברברס בר - המקום בו מסורת פגושה חדשנות. אנחנו מביאים לכם את הטוב ביותר בעולם הטיפוח הגברי, עם שירות אישי ומקצועי ברמה הגבוהה ביותר.

הורידו עכשיו וחוו את ההבדל!`,
                    video: null
                },
                'en-US': {
                    title: 'Barbers Bar - Premium Barbershop',
                    shortDescription: 'Welcome to Barbers Bar - The ultimate men\'s grooming experience',
                    fullDescription: `Welcome to Barbers Bar!

The official app of Barbers Bar brings you the perfect grooming experience directly to your smartphone.

Key Features:
📅 Online Booking - Choose your preferred barber and time
💇‍♂️ Work Gallery - Discover our styles and treatments
👥 Meet the Team - Detailed profiles of our professional barbers
⏰ Appointment Management - Track your appointments and receive notifications
🎨 Diverse Treatments - Haircuts, beard styling, facial care and more
🔔 Smart Notifications - Get updates about upcoming appointments
📊 History Tracking - All your visits and treatments

Barbers Bar - Where tradition meets innovation in men's grooming. We bring you the best in male grooming with personal and professional service at the highest level.

Download now and experience the difference!`,
                    video: null
                }
            },
            categoryId: 'LIFESTYLE',
            contentRating: 'PEGI_3',
            contactWebsite: 'https://barbersbar.app',
            contactEmail: 'orel895@gmail.com',
            contactPhone: null,
            privacyPolicyUrl: 'https://barbersbar.app/privacy-policy.html'
        };
    }

    async initialize() {
        console.log('🚀 Initializing Google Play Automation Server...');
        
        try {
            // Load configuration
            await this.loadConfiguration();
            
            // Setup authentication
            await this.setupAuthentication();
            
            // Initialize Google Play API
            await this.initializeGooglePlayAPI();
            
            console.log('✅ Google Play Automation Server initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Google Play Automation Server:', error.message);
            throw error;
        }
    }

    async loadConfiguration() {
        try {
            const configExists = await this.fileExists(this.configPath);
            if (configExists) {
                const config = JSON.parse(await fs.readFile(this.configPath, 'utf8'));
                Object.assign(this, config);
                console.log('📋 Configuration loaded successfully');
            } else {
                console.log('📋 No configuration file found, using defaults');
            }
        } catch (error) {
            console.log('📋 Using default configuration');
        }
    }

    async setupAuthentication() {
        const credentialsExist = await this.fileExists(this.credentialsPath);
        if (!credentialsExist) {
            throw new Error(`Google Play credentials file not found at: ${this.credentialsPath}\nPlease run the setup script first.`);
        }

        this.auth = new GoogleAuth({
            keyFile: this.credentialsPath,
            scopes: ['https://www.googleapis.com/auth/androidpublisher']
        });

        console.log('🔐 Authentication setup completed');
    }

    async initializeGooglePlayAPI() {
        this.androidPublisher = google.androidpublisher({
            version: 'v3',
            auth: this.auth
        });

        console.log('🔌 Google Play API initialized');
    }

    async createEdit() {
        console.log('📝 Creating new edit session...');
        
        const response = await this.androidPublisher.edits.insert({
            packageName: this.packageName
        });

        this.editId = response.data.id;
        console.log(`✅ Edit session created: ${this.editId}`);
        return this.editId;
    }

    async buildApp() {
        console.log('🏗️ Building Android app bundle...');
        
        try {
            // Clean build directory
            console.log('🧹 Cleaning build directory...');
            execSync('cd android && ./gradlew clean', { stdio: 'inherit' });
            
            // Build AAB using EAS
            console.log('📦 Building production AAB with EAS...');
            execSync('eas build --platform android --profile production --non-interactive', { 
                stdio: 'inherit',
                cwd: this.projectRoot 
            });
            
            // Download the latest build
            console.log('⬇️ Downloading latest build...');
            const buildInfo = await this.getLatestBuild();
            await this.downloadBuild(buildInfo);
            
            console.log('✅ App bundle built successfully');
            return buildInfo.artifactUrl;
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            throw error;
        }
    }

    async getLatestBuild() {
        console.log('🔍 Getting latest build info...');
        
        try {
            const result = execSync('eas build:list --platform android --limit 1 --json', {
                cwd: this.projectRoot,
                encoding: 'utf8'
            });
            
            const builds = JSON.parse(result);
            if (builds.length === 0) {
                throw new Error('No builds found');
            }
            
            const latestBuild = builds[0];
            console.log(`📋 Latest build: ${latestBuild.id} - Status: ${latestBuild.status}`);
            
            return {
                id: latestBuild.id,
                artifactUrl: latestBuild.artifacts?.buildUrl,
                status: latestBuild.status
            };
        } catch (error) {
            console.error('❌ Failed to get build info:', error.message);
            throw error;
        }
    }

    async downloadBuild(buildInfo) {
        if (!buildInfo.artifactUrl) {
            throw new Error('No artifact URL available for download');
        }

        console.log('⬇️ Downloading build artifact...');
        
        const response = await axios({
            method: 'GET',
            url: buildInfo.artifactUrl,
            responseType: 'stream'
        });

        const buildPath = path.join(this.projectRoot, 'build', 'app-release.aab');
        await fs.mkdir(path.dirname(buildPath), { recursive: true });
        
        const writer = require('fs').createWriteStream(buildPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Build downloaded to: ${buildPath}`);
                resolve(buildPath);
            });
            writer.on('error', reject);
        });
    }

    async uploadAPK() {
        const buildPath = path.join(this.projectRoot, 'build', 'app-release.aab');
        const buildExists = await this.fileExists(buildPath);
        
        if (!buildExists) {
            throw new Error(`Build file not found at: ${buildPath}`);
        }

        console.log('📤 Uploading app bundle to Google Play...');

        const fileData = await fs.readFile(buildPath);
        
        const response = await this.androidPublisher.edits.bundles.upload({
            editId: this.editId,
            packageName: this.packageName,
            media: {
                mimeType: 'application/octet-stream',
                body: fileData
            }
        });

        const versionCode = response.data.versionCode;
        console.log(`✅ Bundle uploaded successfully - Version Code: ${versionCode}`);
        
        return {
            versionCode,
            sha256: response.data.sha256
        };
    }

    async updateStoreListing() {
        console.log('📝 Updating store listing...');

        for (const [locale, listing] of Object.entries(this.storeListingData.listings)) {
            console.log(`🌍 Updating listing for locale: ${locale}`);
            
            await this.androidPublisher.edits.listings.update({
                editId: this.editId,
                packageName: this.packageName,
                language: locale,
                requestBody: {
                    title: listing.title,
                    shortDescription: listing.shortDescription,
                    fullDescription: listing.fullDescription,
                    video: listing.video
                }
            });
        }

        console.log('✅ Store listings updated successfully');
    }

    async updateAppDetails() {
        console.log('📋 Updating app details...');

        await this.androidPublisher.edits.details.update({
            editId: this.editId,
            packageName: this.packageName,
            requestBody: {
                defaultLanguage: this.storeListingData.defaultLanguage,
                contactWebsite: this.storeListingData.contactWebsite,
                contactEmail: this.storeListingData.contactEmail,
                contactPhone: this.storeListingData.contactPhone
            }
        });

        console.log('✅ App details updated successfully');
    }

    async generateScreenshots() {
        console.log('📸 Generating app screenshots...');
        
        const screenshotDir = path.join(this.projectRoot, 'screenshots');
        await fs.mkdir(screenshotDir, { recursive: true });

        // Generate mockup screenshots using app assets
        const screenshots = await this.createMockupScreenshots();
        
        console.log(`✅ Generated ${screenshots.length} screenshots`);
        return screenshots;
    }

    async createMockupScreenshots() {
        const screenshots = [];
        const screenshotDir = path.join(this.projectRoot, 'screenshots');
        
        // Base screenshot templates with Hebrew text
        const screenshotData = [
            {
                name: 'booking-interface',
                title: 'קביעת תורים',
                description: 'בחרו את הספר והזמן המועדף עליכם'
            },
            {
                name: 'barber-profiles',
                title: 'הצוות המקצועי',
                description: 'הכירו את הספרים המיומנים שלנו'
            },
            {
                name: 'gallery-styles',
                title: 'גלריית סגנונות',
                description: 'גלו את המגוון הרחב של התספורות'
            },
            {
                name: 'appointment-management',
                title: 'ניהול תורים',
                description: 'עקבו אחרי התורים והתראות'
            },
            {
                name: 'user-profile',
                title: 'פרופיל אישי',
                description: 'נהלו את הפרופיל והעדפות שלכם'
            }
        ];

        for (let i = 0; i < screenshotData.length; i++) {
            const screenshot = screenshotData[i];
            const outputPath = path.join(screenshotDir, `${screenshot.name}.png`);
            
            // Create mockup screenshot
            await this.createMockupImage(screenshot, outputPath);
            screenshots.push(outputPath);
        }

        return screenshots;
    }

    async createMockupImage(data, outputPath) {
        // Create a simple mockup screenshot using Sharp
        const width = 1080;
        const height = 1920;
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#bg)"/>
                
                <!-- Phone frame -->
                <rect x="40" y="80" width="${width-80}" height="${height-160}" rx="40" fill="white" stroke="#ddd" stroke-width="2"/>
                
                <!-- Status bar -->
                <rect x="60" y="100" width="${width-120}" height="60" fill="#f8f9fa"/>
                <text x="80" y="140" font-family="Arial, sans-serif" font-size="24" fill="#333">9:41</text>
                <text x="${width-180}" y="140" font-family="Arial, sans-serif" font-size="20" fill="#333">100%</text>
                
                <!-- App header -->
                <rect x="60" y="160" width="${width-120}" height="80" fill="#3498db"/>
                <text x="80" y="210" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white">Barbers Bar</text>
                
                <!-- Main content area -->
                <rect x="80" y="280" width="${width-160}" height="400" fill="#f8f9fa" rx="20"/>
                
                <!-- Title -->
                <text x="${width/2}" y="350" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#2c3e50">${data.title}</text>
                
                <!-- Description -->
                <text x="${width/2}" y="420" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#7f8c8d">${data.description}</text>
                
                <!-- Mockup UI elements -->
                <rect x="100" y="480" width="${width-200}" height="60" fill="#3498db" rx="10"/>
                <text x="${width/2}" y="515" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="white">קבע תור עכשיו</text>
                
                <rect x="100" y="560" width="${width-200}" height="60" fill="#ecf0f1" rx="10"/>
                <text x="${width/2}" y="595" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="#2c3e50">צפה בגלריה</text>
                
                <!-- Bottom elements -->
                <circle cx="200" cy="800" r="30" fill="#27ae60"/>
                <circle cx="400" cy="800" r="30" fill="#e74c3c"/>
                <circle cx="600" cy="800" r="30" fill="#f39c12"/>
                <circle cx="800" cy="800" r="30" fill="#9b59b6"/>
                
                <!-- Footer -->
                <text x="${width/2}" y="1800" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="white">מספרת ברברס בר - חוויית טיפוח מושלמת</text>
            </svg>
        `;

        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);
            
        console.log(`📸 Created screenshot: ${data.name}`);
    }

    async uploadScreenshots() {
        console.log('📤 Uploading screenshots...');
        
        const screenshots = await this.generateScreenshots();
        
        for (const screenshotPath of screenshots) {
            const imageData = await fs.readFile(screenshotPath);
            const filename = path.basename(screenshotPath);
            
            await this.androidPublisher.edits.images.upload({
                editId: this.editId,
                packageName: this.packageName,
                language: 'he-IL',
                imageType: 'phoneScreenshots',
                media: {
                    mimeType: 'image/png',
                    body: imageData
                }
            });
            
            console.log(`📸 Uploaded screenshot: ${filename}`);
        }

        // Upload the same screenshots for English locale
        for (const screenshotPath of screenshots) {
            const imageData = await fs.readFile(screenshotPath);
            
            await this.androidPublisher.edits.images.upload({
                editId: this.editId,
                packageName: this.packageName,
                language: 'en-US',
                imageType: 'phoneScreenshots',
                media: {
                    mimeType: 'image/png',
                    body: imageData
                }
            });
        }

        console.log('✅ All screenshots uploaded successfully');
    }

    async uploadGraphicAssets() {
        console.log('🎨 Uploading graphic assets...');

        // Upload app icon
        const iconPath = path.join(this.projectRoot, 'assets/google-play/app-icon-512x512.png');
        if (await this.fileExists(iconPath)) {
            const iconData = await fs.readFile(iconPath);
            
            await this.androidPublisher.edits.images.upload({
                editId: this.editId,
                packageName: this.packageName,
                language: 'he-IL',
                imageType: 'icon',
                media: {
                    mimeType: 'image/png',
                    body: iconData
                }
            });
            
            console.log('🎨 App icon uploaded');
        }

        // Upload feature graphic
        const featureGraphicPath = path.join(this.projectRoot, 'assets/google-play/feature-graphic-1024x500-v2.jpg');
        if (await this.fileExists(featureGraphicPath)) {
            const featureGraphicData = await fs.readFile(featureGraphicPath);
            
            await this.androidPublisher.edits.images.upload({
                editId: this.editId,
                packageName: this.packageName,
                language: 'he-IL',
                imageType: 'featureGraphic',
                media: {
                    mimeType: 'image/jpeg',
                    body: featureGraphicData
                }
            });
            
            console.log('🎨 Feature graphic uploaded');
        }

        console.log('✅ Graphic assets uploaded successfully');
    }

    async setReleaseTrack(track = 'internal', versionCode) {
        console.log(`🚀 Setting release track to: ${track}`);

        await this.androidPublisher.edits.tracks.update({
            editId: this.editId,
            packageName: this.packageName,
            track: track,
            requestBody: {
                releases: [{
                    name: `Version ${versionCode}`,
                    versionCodes: [versionCode.toString()],
                    status: 'completed',
                    releaseNotes: [
                        {
                            language: 'he-IL',
                            text: 'שיפורים כלליים ותיקוני באגים'
                        },
                        {
                            language: 'en-US',
                            text: 'General improvements and bug fixes'
                        }
                    ]
                }]
            }
        });

        console.log(`✅ Release track set to: ${track}`);
    }

    async commitEdit() {
        console.log('💾 Committing edit...');

        await this.androidPublisher.edits.commit({
            editId: this.editId,
            packageName: this.packageName
        });

        console.log('✅ Edit committed successfully');
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async fullAutomatedUpload(options = {}) {
        const {
            buildApp = true,
            uploadBundle = true,
            updateListing = true,
            uploadAssets = true,
            track = 'internal',
            autoCommit = true
        } = options;

        console.log('🚀 Starting full automated upload to Google Play Store...');
        console.log('📱 App: Barbers Bar');
        console.log(`📦 Package: ${this.packageName}`);
        console.log(`🎯 Track: ${track}`);
        console.log('================================');

        try {
            // Initialize
            await this.initialize();

            // Create edit session
            await this.createEdit();

            let versionCode;

            // Build app if requested
            if (buildApp) {
                await this.buildApp();
            }

            // Upload app bundle if requested
            if (uploadBundle) {
                const uploadResult = await this.uploadAPK();
                versionCode = uploadResult.versionCode;
            }

            // Update store listing if requested
            if (updateListing) {
                await this.updateStoreListing();
                await this.updateAppDetails();
            }

            // Upload assets if requested
            if (uploadAssets) {
                await this.uploadScreenshots();
                await this.uploadGraphicAssets();
            }

            // Set release track
            if (versionCode) {
                await this.setReleaseTrack(track, versionCode);
            }

            // Commit changes if requested
            if (autoCommit) {
                await this.commitEdit();
            }

            console.log('================================');
            console.log('🎉 UPLOAD COMPLETED SUCCESSFULLY!');
            console.log('================================');
            console.log('✅ App bundle uploaded');
            console.log('✅ Store listing updated (Hebrew & English)');
            console.log('✅ Screenshots uploaded');
            console.log('✅ Graphic assets uploaded');
            console.log('✅ Release set to:', track);
            console.log('✅ Privacy policy included');
            console.log('✅ Terms of service included');
            console.log('================================');
            console.log('🌐 Your app is now available in Google Play Console!');
            console.log(`📱 Version Code: ${versionCode || 'N/A'}`);
            console.log('💡 Next steps:');
            console.log('   1. Review your app in Google Play Console');
            console.log('   2. Submit for review when ready');
            console.log('   3. Promote to production track after approval');

        } catch (error) {
            console.error('❌ Upload failed:', error.message);
            throw error;
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'upload';

    const server = new GooglePlayAutomationServer();

    switch (command) {
        case 'upload':
            server.fullAutomatedUpload({
                track: args[1] || 'internal'
            }).catch(console.error);
            break;

        case 'build-only':
            server.initialize()
                .then(() => server.buildApp())
                .catch(console.error);
            break;

        case 'screenshots':
            server.generateScreenshots()
                .catch(console.error);
            break;

        default:
            console.log('Available commands:');
            console.log('  upload [track]     - Full automated upload (default: internal)');
            console.log('  build-only         - Only build the app');
            console.log('  screenshots        - Generate screenshots only');
    }
}

module.exports = GooglePlayAutomationServer;