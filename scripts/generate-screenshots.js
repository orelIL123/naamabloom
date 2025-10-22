#!/usr/bin/env node

/**
 * Automated Screenshot Generation for Google Play Store
 * Creates professional mockup screenshots for the Barbers Bar app
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class ScreenshotGenerator {
    constructor() {
        this.projectRoot = process.cwd();
        this.screenshotDir = path.join(this.projectRoot, 'screenshots');
        this.assetsDir = path.join(this.projectRoot, 'assets');
        
        // Screenshot dimensions for Google Play Store
        this.dimensions = {
            phone: { width: 1080, height: 1920 },
            tablet: { width: 1920, height: 1280 },
            tv: { width: 1920, height: 1080 }
        };
        
        // App branding colors
        this.colors = {
            primary: '#3498db',
            secondary: '#2c3e50',
            accent: '#e74c3c',
            success: '#27ae60',
            warning: '#f39c12',
            background: '#f8f9fa',
            text: '#2c3e50',
            textSecondary: '#7f8c8d'
        };
        
        // Screenshot content data
        this.screenshotData = [
            {
                id: 'booking-interface',
                titleHe: 'קביעת תורים',
                titleEn: 'Book Appointments',
                descriptionHe: 'בחרו את הספר והזמן המועדף עליכם',
                descriptionEn: 'Choose your preferred barber and time',
                mockupType: 'booking',
                features: ['📅 קביעת תורים מהירה', '⏰ זמינות בזמן אמת', '👤 בחירת ספר']
            },
            {
                id: 'barber-profiles',
                titleHe: 'הצוות המקצועי',
                titleEn: 'Professional Team',
                descriptionHe: 'הכירו את הספרים המיומנים שלנו',
                descriptionEn: 'Meet our skilled barbers',
                mockupType: 'team',
                features: ['⭐ דירוגים וביקורות', '🏆 ספרים מקצועיים', '💼 פרופילים מפורטים']
            },
            {
                id: 'gallery-styles',
                titleHe: 'גלריית סגנונות',
                titleEn: 'Style Gallery',
                descriptionHe: 'גלו את המגוון הרחב של התספורות',
                descriptionEn: 'Discover our wide range of hairstyles',
                mockupType: 'gallery',
                features: ['✂️ סגנונות מגוונים', '📸 גלריית עבודות', '🎨 השראה לעיצוב']
            },
            {
                id: 'appointment-management',
                titleHe: 'ניהול תורים',
                titleEn: 'Manage Appointments',
                descriptionHe: 'עקבו אחרי התורים והתראות',
                descriptionEn: 'Track appointments and notifications',
                mockupType: 'management',
                features: ['📋 היסטוריית תורים', '🔔 התראות חכמות', '📊 סטטיסטיקות אישיות']
            },
            {
                id: 'user-profile',
                titleHe: 'פרופיל אישי',
                titleEn: 'Personal Profile',
                descriptionHe: 'נהלו את הפרופיל והעדפות שלכם',
                descriptionEn: 'Manage your profile and preferences',
                mockupType: 'profile',
                features: ['👤 פרופיל מותאם אישית', '⚙️ הגדרות מתקדמות', '🎯 העדפות אישיות']
            }
        ];
    }

    async generateAllScreenshots() {
        console.log('📸 Starting screenshot generation...');
        
        // Create directories
        await this.createDirectories();
        
        // Generate phone screenshots
        await this.generatePhoneScreenshots();
        
        // Generate tablet screenshots
        await this.generateTabletScreenshots();
        
        // Generate feature graphics
        await this.generateFeatureGraphics();
        
        console.log('✅ All screenshots generated successfully!');
        console.log(`📁 Screenshots saved to: ${this.screenshotDir}`);
    }

    async createDirectories() {
        const dirs = [
            this.screenshotDir,
            path.join(this.screenshotDir, 'phone'),
            path.join(this.screenshotDir, 'tablet'),
            path.join(this.screenshotDir, 'feature-graphics'),
            path.join(this.screenshotDir, 'tv')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async generatePhoneScreenshots() {
        console.log('📱 Generating phone screenshots...');
        
        for (let i = 0; i < this.screenshotData.length; i++) {
            const data = this.screenshotData[i];
            const outputPath = path.join(this.screenshotDir, 'phone', `${String(i + 1).padStart(2, '0')}-${data.id}.png`);
            
            await this.createPhoneMockup(data, outputPath);
            console.log(`📸 Created: ${data.id}`);
        }
    }

    async generateTabletScreenshots() {
        console.log('📟 Generating tablet screenshots...');
        
        for (let i = 0; i < Math.min(3, this.screenshotData.length); i++) {
            const data = this.screenshotData[i];
            const outputPath = path.join(this.screenshotDir, 'tablet', `${String(i + 1).padStart(2, '0')}-${data.id}-tablet.png`);
            
            await this.createTabletMockup(data, outputPath);
        }
    }

    async generateFeatureGraphics() {
        console.log('🎨 Generating feature graphics...');
        
        const featureGraphicPath = path.join(this.screenshotDir, 'feature-graphics', 'feature-graphic-1024x500.jpg');
        await this.createFeatureGraphic(featureGraphicPath);
    }

    async createPhoneMockup(data, outputPath) {
        const { width, height } = this.dimensions.phone;
        
        const svg = this.generatePhoneSVG(data, width, height);
        
        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);
    }

    async createTabletMockup(data, outputPath) {
        const { width, height } = this.dimensions.tablet;
        
        const svg = this.generateTabletSVG(data, width, height);
        
        await sharp(Buffer.from(svg))
            .png()
            .toFile(outputPath);
    }

    async createFeatureGraphic(outputPath) {
        const width = 1024;
        const height = 500;
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="featureBg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                </defs>
                
                <!-- Background -->
                <rect width="100%" height="100%" fill="url(#featureBg)"/>
                
                <!-- Phone mockup -->
                <rect x="50" y="80" width="200" height="340" rx="25" fill="white" filter="url(#shadow)"/>
                <rect x="65" y="100" width="170" height="300" rx="15" fill="#f8f9fa"/>
                
                <!-- App content mockup -->
                <rect x="75" y="110" width="150" height="40" fill="${this.colors.primary}"/>
                <text x="150" y="135" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="white">Barbers Bar</text>
                
                <rect x="85" y="160" width="130" height="20" fill="${this.colors.background}" rx="5"/>
                <rect x="85" y="190" width="100" height="15" fill="${this.colors.textSecondary}" rx="3"/>
                <rect x="85" y="215" width="80" height="15" fill="${this.colors.textSecondary}" rx="3"/>
                
                <rect x="85" y="250" width="130" height="30" fill="${this.colors.success}" rx="15"/>
                <text x="150" y="270" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="white">קבע תור</text>
                
                <circle cx="100" cy="320" r="15" fill="${this.colors.primary}"/>
                <circle cx="130" cy="320" r="15" fill="${this.colors.accent}"/>
                <circle cx="160" cy="320" r="15" fill="${this.colors.warning}"/>
                <circle cx="190" cy="320" r="15" fill="${this.colors.success}"/>
                
                <!-- Main content -->
                <text x="400" y="120" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">ברברס בר</text>
                <text x="400" y="160" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">Barbers Bar</text>
                
                <text x="400" y="220" font-family="Arial, sans-serif" font-size="28" fill="white">מספרת יוקרה לגברים</text>
                <text x="400" y="250" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)">Premium Men's Barbershop</text>
                
                <!-- Features -->
                <text x="400" y="300" font-family="Arial, sans-serif" font-size="16" fill="white">📅 קביעת תורים מהירה</text>
                <text x="400" y="325" font-family="Arial, sans-serif" font-size="16" fill="white">💇‍♂️ ספרים מקצועיים</text>
                <text x="400" y="350" font-family="Arial, sans-serif" font-size="16" fill="white">🎨 גלריית סגנונות</text>
                <text x="400" y="375" font-family="Arial, sans-serif" font-size="16" fill="white">⭐ ניהול תורים חכם</text>
                
                <!-- Download badge mockup -->
                <rect x="700" y="350" width="200" height="60" rx="30" fill="rgba(0,0,0,0.8)"/>
                <text x="800" y="375" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="white">DOWNLOAD ON</text>
                <text x="800" y="395" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">Google Play</text>
            </svg>
        `;
        
        await sharp(Buffer.from(svg))
            .jpeg({ quality: 90 })
            .toFile(outputPath);
            
        console.log('🎨 Feature graphic created');
    }

    generatePhoneSVG(data, width, height) {
        return `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.2)"/>
                    </filter>
                </defs>
                
                <!-- Background -->
                <rect width="100%" height="100%" fill="url(#bg)"/>
                
                <!-- Device frame -->
                <rect x="40" y="80" width="${width-80}" height="${height-160}" rx="40" fill="white" stroke="#ddd" stroke-width="2" filter="url(#shadow)"/>
                
                <!-- Status bar -->
                <rect x="60" y="100" width="${width-120}" height="80" fill="#1a1a1a"/>
                <text x="90" y="145" font-family="Arial, sans-serif" font-size="24" font-weight="500" fill="white">9:41</text>
                <circle cx="${width-120}" cy="140" r="8" fill="#00C851"/>
                <rect x="${width-150}" y="135" width="20" height="10" fill="white" rx="2"/>
                
                <!-- App header -->
                <rect x="60" y="180" width="${width-120}" height="100" fill="${this.colors.primary}"/>
                <text x="${width/2}" y="220" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">ברברס בר</text>
                <text x="${width/2}" y="250" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="rgba(255,255,255,0.9)">Barbers Bar</text>
                
                <!-- Main content area -->
                <rect x="80" y="320" width="${width-160}" height="600" fill="${this.colors.background}" rx="20"/>
                
                <!-- Title -->
                <text x="${width/2}" y="380" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="${this.colors.text}">${data.titleHe}</text>
                <text x="${width/2}" y="420" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="${this.colors.textSecondary}">${data.titleEn}</text>
                
                <!-- Description -->
                <text x="${width/2}" y="480" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${this.colors.text}">${data.descriptionHe}</text>
                <text x="${width/2}" y="510" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.textSecondary}">${data.descriptionEn}</text>
                
                ${this.generateMockupContent(data.mockupType, width)}
                
                <!-- Features list -->
                ${data.features.map((feature, index) => `
                    <text x="120" y="${580 + index * 40}" font-family="Arial, sans-serif" font-size="18" fill="${this.colors.text}">${feature}</text>
                `).join('')}
                
                <!-- Bottom navigation mockup -->
                <rect x="80" y="850" width="${width-160}" height="80" fill="white" rx="10"/>
                <circle cx="180" cy="890" r="25" fill="${this.colors.primary}"/>
                <circle cx="300" cy="890" r="20" fill="${this.colors.textSecondary}"/>
                <circle cx="420" cy="890" r="20" fill="${this.colors.textSecondary}"/>
                <circle cx="540" cy="890" r="20" fill="${this.colors.textSecondary}"/>
                <circle cx="660" cy="890" r="20" fill="${this.colors.textSecondary}"/>
                
                <!-- Footer -->
                <text x="${width/2}" y="${height-40}" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="white">חוויית טיפוח מושלמת לגברים</text>
            </svg>
        `;
    }

    generateTabletSVG(data, width, height) {
        return `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
                    </filter>
                </defs>
                
                <!-- Background -->
                <rect width="100%" height="100%" fill="url(#bg)"/>
                
                <!-- Device frame -->
                <rect x="80" y="40" width="${width-160}" height="${height-80}" rx="30" fill="white" stroke="#ddd" stroke-width="2" filter="url(#shadow)"/>
                
                <!-- App header -->
                <rect x="100" y="60" width="${width-200}" height="120" fill="${this.colors.primary}"/>
                <text x="${width/2}" y="115" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">ברברס בר</text>
                <text x="${width/2}" y="155" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="rgba(255,255,255,0.9)">Barbers Bar - ${data.titleEn}</text>
                
                <!-- Main content split view -->
                <rect x="120" y="220" width="${(width-240)/2-20}" height="${height-300}" fill="${this.colors.background}" rx="15"/>
                <rect x="${120 + (width-240)/2 + 20}" y="220" width="${(width-240)/2-20}" height="${height-300}" fill="white" rx="15"/>
                
                <!-- Left panel -->
                <text x="140" y="270" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="${this.colors.text}">${data.titleHe}</text>
                <text x="140" y="310" font-family="Arial, sans-serif" font-size="20" fill="${this.colors.textSecondary}">${data.descriptionHe}</text>
                
                ${data.features.map((feature, index) => `
                    <text x="140" y="${360 + index * 50}" font-family="Arial, sans-serif" font-size="18" fill="${this.colors.text}">${feature}</text>
                `).join('')}
                
                <!-- Right panel mockup -->
                <rect x="${140 + (width-240)/2 + 20}" y="260" width="${(width-240)/2-60}" height="40" fill="${this.colors.primary}" rx="20"/>
                <text x="${width/2 + 60}" y="285" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">קבע תור עכשיו</text>
                
                <rect x="${140 + (width-240)/2 + 20}" y="320" width="${(width-240)/2-60}" height="200" fill="${this.colors.background}" rx="10"/>
                
                <!-- Mockup elements -->
                <circle cx="${width/2 + 60}" cy="420" r="40" fill="${this.colors.accent}"/>
                <text x="${width/2 + 60}" y="430" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">✂️</text>
                
                <rect x="${140 + (width-240)/2 + 40}" y="480" width="${(width-240)/2-100}" height="30" fill="${this.colors.success}" rx="15"/>
                <rect x="${140 + (width-240)/2 + 40}" y="520" width="${(width-240)/2-120}" height="25" fill="${this.colors.warning}" rx="12"/>
                <rect x="${140 + (width-240)/2 + 40}" y="555" width="${(width-240)/2-140}" height="20" fill="${this.colors.textSecondary}" rx="10"/>
            </svg>
        `;
    }

    generateMockupContent(type, width) {
        const centerX = width / 2;
        
        switch (type) {
            case 'booking':
                return `
                    <!-- Calendar mockup -->
                    <rect x="120" y="540" width="${width-240}" height="200" fill="white" rx="15" stroke="${this.colors.textSecondary}" stroke-width="1"/>
                    <rect x="140" y="560" width="80" height="40" fill="${this.colors.primary}" rx="20"/>
                    <text x="180" y="585" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">15</text>
                    
                    <rect x="240" y="560" width="80" height="40" fill="${this.colors.background}" rx="20"/>
                    <text x="280" y="585" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.text}">16</text>
                    
                    <rect x="340" y="560" width="80" height="40" fill="${this.colors.background}" rx="20"/>
                    <text x="380" y="585" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.text}">17</text>
                    
                    <!-- Time slots -->
                    <rect x="140" y="620" width="120" height="30" fill="${this.colors.success}" rx="15"/>
                    <text x="200" y="640" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="white">09:00</text>
                    
                    <rect x="280" y="620" width="120" height="30" fill="${this.colors.background}" rx="15"/>
                    <text x="340" y="640" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${this.colors.text}">10:30</text>
                `;
                
            case 'team':
                return `
                    <!-- Barber profiles -->
                    <circle cx="200" cy="580" r="40" fill="${this.colors.primary}"/>
                    <text x="200" y="590" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">👨</text>
                    <text x="200" y="650" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.text}">דניאל</text>
                    
                    <circle cx="350" cy="580" r="40" fill="${this.colors.accent}"/>
                    <text x="350" y="590" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">👨</text>
                    <text x="350" y="650" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.text}">יוסי</text>
                    
                    <circle cx="500" cy="580" r="40" fill="${this.colors.warning}"/>
                    <text x="500" y="590" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="white">👨</text>
                    <text x="500" y="650" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.text}">אורי</text>
                    
                    <!-- Rating stars -->
                    <text x="200" y="680" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.warning}">⭐⭐⭐⭐⭐</text>
                    <text x="350" y="680" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.warning}">⭐⭐⭐⭐⭐</text>
                    <text x="500" y="680" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.warning}">⭐⭐⭐⭐⭐</text>
                `;
                
            case 'gallery':
                return `
                    <!-- Image gallery grid -->
                    <rect x="140" y="540" width="120" height="120" fill="${this.colors.primary}" rx="10"/>
                    <text x="200" y="610" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">✂️</text>
                    
                    <rect x="280" y="540" width="120" height="120" fill="${this.colors.accent}" rx="10"/>
                    <text x="340" y="610" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">💇</text>
                    
                    <rect x="420" y="540" width="120" height="120" fill="${this.colors.success}" rx="10"/>
                    <text x="480" y="610" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">🧔</text>
                    
                    <rect x="560" y="540" width="120" height="120" fill="${this.colors.warning}" rx="10"/>
                    <text x="620" y="610" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">✨</text>
                    
                    <!-- Labels -->
                    <text x="200" y="680" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${this.colors.text}">תספורות קלאסיות</text>
                    <text x="340" y="680" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${this.colors.text}">עיצוב זקן</text>
                    <text x="480" y="680" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${this.colors.text}">טיפוח פנים</text>
                    <text x="620" y="680" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${this.colors.text}">סגנונות מיוחדים</text>
                `;
                
            case 'management':
                return `
                    <!-- Appointment list -->
                    <rect x="120" y="540" width="${width-240}" height="60" fill="white" rx="10" stroke="${this.colors.textSecondary}" stroke-width="1"/>
                    <circle cx="160" cy="570" r="20" fill="${this.colors.success}"/>
                    <text x="160" y="577" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">✓</text>
                    <text x="200" y="565" font-family="Arial, sans-serif" font-size="16" fill="${this.colors.text}">תור עם דניאל</text>
                    <text x="200" y="585" font-family="Arial, sans-serif" font-size="14" fill="${this.colors.textSecondary}">מחר 15:30</text>
                    
                    <rect x="120" y="620" width="${width-240}" height="60" fill="white" rx="10" stroke="${this.colors.textSecondary}" stroke-width="1"/>
                    <circle cx="160" cy="650" r="20" fill="${this.colors.warning}"/>
                    <text x="160" y="657" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="white">⏰</text>
                    <text x="200" y="645" font-family="Arial, sans-serif" font-size="16" fill="${this.colors.text}">תור עם יוסי</text>
                    <text x="200" y="665" font-family="Arial, sans-serif" font-size="14" fill="${this.colors.textSecondary}">ב-20/12 בשעה 18:00</text>
                `;
                
            case 'profile':
                return `
                    <!-- Profile mockup -->
                    <circle cx="${centerX}" cy="580" r="50" fill="${this.colors.primary}"/>
                    <text x="${centerX}" y="595" font-family="Arial, sans-serif" font-size="36" text-anchor="middle" fill="white">👤</text>
                    
                    <text x="${centerX}" y="660" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="${this.colors.text}">יוחנן כהן</text>
                    <text x="${centerX}" y="690" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="${this.colors.textSecondary}">לקוח VIP</text>
                    
                    <!-- Stats -->
                    <rect x="180" y="720" width="100" height="40" fill="${this.colors.background}" rx="20"/>
                    <text x="230" y="735" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${this.colors.text}">תורים</text>
                    <text x="230" y="750" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="${this.colors.primary}">24</text>
                    
                    <rect x="300" y="720" width="100" height="40" fill="${this.colors.background}" rx="20"/>
                    <text x="350" y="735" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="${this.colors.text}">נקודות</text>
                    <text x="350" y="750" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="${this.colors.success}">850</text>
                `;
                
            default:
                return '';
        }
    }

    async optimizeScreenshots() {
        console.log('🔧 Optimizing screenshots...');
        
        const phoneDir = path.join(this.screenshotDir, 'phone');
        const files = await fs.readdir(phoneDir);
        
        for (const file of files) {
            if (file.endsWith('.png')) {
                const filePath = path.join(phoneDir, file);
                await sharp(filePath)
                    .png({ quality: 90, compressionLevel: 9 })
                    .toFile(filePath.replace('.png', '_optimized.png'));
                
                // Replace original with optimized
                await fs.rename(filePath.replace('.png', '_optimized.png'), filePath);
            }
        }
        
        console.log('✅ Screenshots optimized');
    }

    async generateSummary() {
        console.log('\n📊 Screenshot Generation Summary');
        console.log('================================');
        
        const phoneFiles = await fs.readdir(path.join(this.screenshotDir, 'phone'));
        const tabletFiles = await fs.readdir(path.join(this.screenshotDir, 'tablet'));
        
        console.log(`📱 Phone screenshots: ${phoneFiles.length}`);
        console.log(`📟 Tablet screenshots: ${tabletFiles.length}`);
        console.log(`🎨 Feature graphics: 1`);
        console.log(`📁 Output directory: ${this.screenshotDir}`);
        
        console.log('\n📋 Files created:');
        phoneFiles.forEach(file => console.log(`  📱 ${file}`));
        tabletFiles.forEach(file => console.log(`  📟 ${file}`));
        console.log('  🎨 feature-graphic-1024x500.jpg');
        
        console.log('\n✅ Ready for Google Play Store upload!');
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    const generator = new ScreenshotGenerator();

    switch (command) {
        case 'all':
            generator.generateAllScreenshots()
                .then(() => generator.optimizeScreenshots())
                .then(() => generator.generateSummary())
                .catch(console.error);
            break;

        case 'phone':
            generator.createDirectories()
                .then(() => generator.generatePhoneScreenshots())
                .catch(console.error);
            break;

        case 'tablet':
            generator.createDirectories()
                .then(() => generator.generateTabletScreenshots())
                .catch(console.error);
            break;

        case 'feature':
            generator.createDirectories()
                .then(() => generator.generateFeatureGraphics())
                .catch(console.error);
            break;

        default:
            console.log('Available commands:');
            console.log('  all      - Generate all screenshots and graphics');
            console.log('  phone    - Generate phone screenshots only');
            console.log('  tablet   - Generate tablet screenshots only');
            console.log('  feature  - Generate feature graphics only');
    }
}

module.exports = ScreenshotGenerator;