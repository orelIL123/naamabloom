#!/usr/bin/env node

/**
 * Store Listing Metadata Manager
 * Manages and validates all store listing data for Google Play Store
 */

const fs = require('fs').promises;
const path = require('path');

class StoreListingMetadata {
    constructor() {
        this.projectRoot = process.cwd();
        this.metadataPath = path.join(this.projectRoot, 'google-play-metadata.json');
        
        this.metadata = {
            packageName: 'com.barbersbar.app',
            defaultLanguage: 'he-IL',
            
            // App basic info
            appInfo: {
                category: 'LIFESTYLE',
                contentRating: 'PEGI_3', // Everyone
                targetAudience: {
                    minAge: 13,
                    maxAge: 65
                },
                recentChanges: {
                    'he-IL': 'שיפורים כלליים ותיקוני באגים למען חוויית משתמש טובה יותר',
                    'en-US': 'General improvements and bug fixes for better user experience'
                }
            },
            
            // Store listings per language
            listings: {
                'he-IL': {
                    title: 'ברברס בר - מספרת יוקרה',
                    shortDescription: 'ברוכים הבאים למספרת ברברס בר - החוויה המושלמת לטיפוח גברים',
                    fullDescription: `ברוכים הבאים למספרת ברברס בר!

האפליקציה הרשמית של מספרת ברברס בר מביאה לכם את חוויית הטיפוח המושלמת ישירות לסמארטפון שלכם.

🌟 תכונות עיקריות:
📅 קביעת תורים אונליין - בחרו את הספר והשעה הנוחים לכם
💇‍♂️ גלריית עבודות - הכירו את הסגנונות והטיפולים שלנו  
👥 הכירו את הצוות - פרופילים מפורטים של הספרים המקצועיים שלנו
⏰ ניהול תורים - עקבו אחרי התורים שלכם וקבלו התראות
🎨 טיפולים מגוונים - ספרות, עיצוב זקן, טיפוח פנים ועוד
🔔 התראות חכמות - קבלו עדכונים על תורים קרובים
📊 מעקב אחר ההיסטוריה - כל הביקורים והטיפולים שלכם
⭐ מערכת דירוגים - דרגו את החוויה שלכם ועזרו לאחרים

🏆 למה לבחור בברברס בר?
✂️ ספרים מקצועיים ומנוסים
🏪 מספרה מודרנית ומעוצבת
🧴 מוצרי טיפוח איכותיים
💺 אווירה נעימה ורגועה
🚗 מיקום נוח עם חניה
💳 מחירים הוגנים ושירות אמין

מספרת ברברס בר - המקום בו מסורת פגושה חדשנות. אנחנו מביאים לכם את הטוב ביותר בעולם הטיפוח הגברי, עם שירות אישי ומקצועי ברמה הגבוהה ביותר.

הורידו עכשיו וחוו את ההבדל!`,
                    
                    keywords: [
                        'מספרה', 'ברברס', 'ספר', 'תספורת', 'זקן', 'טיפוח', 'גברים', 
                        'תור', 'יופי', 'סטייל', 'עיצוב', 'זקן', 'שפם', 'תספורות',
                        'מספרת גברים', 'ברבר', 'סטייליסט', 'תיספורת', 'עיצוב שיער'
                    ],
                    
                    promo: 'אפליקציית המספרה המובילה לגברים - קבעו תור בקלות ונהנו מחוויית טיפוח מושלמת!'
                },
                
                'en-US': {
                    title: 'Barbers Bar - Premium Barbershop',
                    shortDescription: 'Welcome to Barbers Bar - The ultimate men\'s grooming experience',
                    fullDescription: `Welcome to Barbers Bar!

The official app of Barbers Bar brings you the perfect grooming experience directly to your smartphone.

🌟 Key Features:
📅 Online Booking - Choose your preferred barber and time
💇‍♂️ Work Gallery - Discover our styles and treatments
👥 Meet the Team - Detailed profiles of our professional barbers
⏰ Appointment Management - Track your appointments and receive notifications
🎨 Diverse Treatments - Haircuts, beard styling, facial care and more
🔔 Smart Notifications - Get updates about upcoming appointments
📊 History Tracking - All your visits and treatments
⭐ Rating System - Rate your experience and help others

🏆 Why Choose Barbers Bar?
✂️ Professional and experienced barbers
🏪 Modern and stylish barbershop
🧴 Premium grooming products
💺 Comfortable and relaxing atmosphere
🚗 Convenient location with parking
💳 Fair prices and reliable service

Barbers Bar - Where tradition meets innovation in men's grooming. We bring you the best in male grooming with personal and professional service at the highest level.

Download now and experience the difference!`,
                    
                    keywords: [
                        'barbershop', 'barber', 'haircut', 'beard', 'grooming', 'men', 
                        'appointment', 'styling', 'beauty', 'salon', 'hair', 'trim',
                        'shave', 'mustache', 'men\'s haircut', 'hair styling', 'beard trim'
                    ],
                    
                    promo: 'The leading barbershop app for men - book appointments easily and enjoy the perfect grooming experience!'
                }
            },
            
            // Contact information
            contact: {
                website: 'https://barbersbar.app',
                email: 'orel895@gmail.com',
                phone: null,
                privacyPolicyUrl: 'https://barbersbar.app/privacy-policy.html',
                termsOfServiceUrl: 'https://barbersbar.app/terms-of-service.html'
            },
            
            // Graphic assets
            assets: {
                appIcon: {
                    path: './assets/google-play/app-icon-512x512.png',
                    size: '512x512',
                    format: 'PNG'
                },
                featureGraphic: {
                    path: './assets/google-play/feature-graphic-1024x500-v2.jpg',
                    size: '1024x500',
                    format: 'JPEG'
                },
                screenshots: {
                    phone: [
                        {
                            path: './screenshots/phone/01-booking-interface.png',
                            description: 'Main booking interface showing available time slots'
                        },
                        {
                            path: './screenshots/phone/02-barber-profiles.png',
                            description: 'Professional barber profiles with ratings and specialties'
                        },
                        {
                            path: './screenshots/phone/03-gallery-styles.png',
                            description: 'Gallery showcasing haircut styles and beard treatments'
                        },
                        {
                            path: './screenshots/phone/04-appointment-management.png',
                            description: 'Appointment management and history tracking'
                        },
                        {
                            path: './screenshots/phone/05-user-profile.png',
                            description: 'User profile and personal settings'
                        }
                    ],
                    tablet: [
                        {
                            path: './screenshots/tablet/01-booking-interface-tablet.png',
                            description: 'Tablet view of booking interface'
                        },
                        {
                            path: './screenshots/tablet/02-barber-profiles-tablet.png',
                            description: 'Tablet view of barber profiles'
                        },
                        {
                            path: './screenshots/tablet/03-gallery-styles-tablet.png',
                            description: 'Tablet view of style gallery'
                        }
                    ]
                }
            },
            
            // App permissions and explanations
            permissions: [
                {
                    name: 'CAMERA',
                    reason: {
                        'he-IL': 'נדרש לצילום תמונות פרופיל והעלאת תמונות לגלריית המספרה',
                        'en-US': 'Required for taking profile pictures and uploading gallery images'
                    }
                },
                {
                    name: 'READ_EXTERNAL_STORAGE',
                    reason: {
                        'he-IL': 'נדרש לבחירת תמונות מגלריית המכשיר',
                        'en-US': 'Required for selecting images from device gallery'
                    }
                },
                {
                    name: 'WRITE_EXTERNAL_STORAGE',
                    reason: {
                        'he-IL': 'נדרש לשמירת תמונות מעובדות',
                        'en-US': 'Required for saving processed images'
                    }
                },
                {
                    name: 'INTERNET',
                    reason: {
                        'he-IL': 'נדרש לסנכרון תורים וגישה לתכונות מקוונות',
                        'en-US': 'Required for syncing appointments and accessing online features'
                    }
                },
                {
                    name: 'ACCESS_NETWORK_STATE',
                    reason: {
                        'he-IL': 'נדרש לבדיקת חיבור לאינטרנט',
                        'en-US': 'Required for checking network connectivity'
                    }
                },
                {
                    name: 'RECEIVE_BOOT_COMPLETED',
                    reason: {
                        'he-IL': 'נדרש לתזמון התראות על תורים',
                        'en-US': 'Required for scheduling appointment notifications'
                    }
                },
                {
                    name: 'WAKE_LOCK',
                    reason: {
                        'he-IL': 'נדרש לשמירת פעילות האפליקציה במהלך התראות',
                        'en-US': 'Required for maintaining app functionality during notifications'
                    }
                },
                {
                    name: 'VIBRATE',
                    reason: {
                        'he-IL': 'נדרש לרטט התראות',
                        'en-US': 'Required for notification vibration alerts'
                    }
                }
            ],
            
            // Release notes templates
            releaseNotes: {
                'he-IL': {
                    template: 'גרסה {version} - {date}\n\n• שיפורים כלליים ותיקוני באגים\n• ביצועים משופרים\n• חוויית משתמש מטובה יותר\n• תמיכה בתכונות חדשות',
                    latest: 'גרסה 1.0.5 - עדכון אוגוסט 2025\n\n• שיפור מהירות טעינת האפליקציה\n• תיקון בעיות בקביעת תורים\n• ממשק משתמש משופר\n• יציבות מוגברת'
                },
                'en-US': {
                    template: 'Version {version} - {date}\n\n• General improvements and bug fixes\n• Enhanced performance\n• Better user experience\n• Support for new features',
                    latest: 'Version 1.0.5 - August 2025 Update\n\n• Improved app loading speed\n• Fixed appointment booking issues\n• Enhanced user interface\n• Increased stability'
                }
            },
            
            // Marketing copy
            marketing: {
                'he-IL': {
                    tagline: 'חוויית הטיפוח המושלמת לגברים',
                    highlights: [
                        'מספרת יוקרה מובילה',
                        'ספרים מקצועיים ומנוסים',
                        'טכנולוגיה מתקדמת',
                        'שירות אישי ומקצועי'
                    ],
                    benefits: [
                        'חיסכון בזמן עם קביעת תורים מהירה',
                        'אין יותר המתנה בתור',
                        'בחירה מדויקת של ספר וטיפול',
                        'מעקב אחר היסטוריית הטיפולים'
                    ]
                },
                'en-US': {
                    tagline: 'The Perfect Grooming Experience for Men',
                    highlights: [
                        'Leading premium barbershop',
                        'Professional and experienced barbers',
                        'Advanced technology',
                        'Personal and professional service'
                    ],
                    benefits: [
                        'Save time with quick appointment booking',
                        'No more waiting in line',
                        'Precise selection of barber and treatment',
                        'Track your treatment history'
                    ]
                }
            }
        };
    }

    async generateMetadata() {
        console.log('📋 Generating store listing metadata...');
        
        // Save metadata to file
        await fs.writeFile(this.metadataPath, JSON.stringify(this.metadata, null, 2));
        
        console.log('✅ Metadata generated successfully');
        return this.metadata;
    }

    async validateMetadata() {
        console.log('🔍 Validating metadata...');
        
        const validations = [];
        
        // Validate title lengths
        for (const [locale, listing] of Object.entries(this.metadata.listings)) {
            if (listing.title.length > 50) {
                validations.push(`❌ Title too long for ${locale}: ${listing.title.length}/50 characters`);
            } else {
                validations.push(`✅ Title length OK for ${locale}: ${listing.title.length}/50 characters`);
            }
            
            if (listing.shortDescription.length > 80) {
                validations.push(`❌ Short description too long for ${locale}: ${listing.shortDescription.length}/80 characters`);
            } else {
                validations.push(`✅ Short description length OK for ${locale}: ${listing.shortDescription.length}/80 characters`);
            }
            
            if (listing.fullDescription.length > 4000) {
                validations.push(`❌ Full description too long for ${locale}: ${listing.fullDescription.length}/4000 characters`);
            } else {
                validations.push(`✅ Full description length OK for ${locale}: ${listing.fullDescription.length}/4000 characters`);
            }
        }
        
        // Validate contact info
        if (this.metadata.contact.email) {
            validations.push('✅ Contact email provided');
        } else {
            validations.push('❌ Contact email missing');
        }
        
        if (this.metadata.contact.privacyPolicyUrl) {
            validations.push('✅ Privacy policy URL provided');
        } else {
            validations.push('❌ Privacy policy URL missing');
        }
        
        // Print validation results
        console.log('\n📊 Validation Results:');
        validations.forEach(validation => console.log(validation));
        
        const hasErrors = validations.some(v => v.startsWith('❌'));
        if (hasErrors) {
            console.log('\n⚠️  Please fix validation errors before uploading');
            return false;
        } else {
            console.log('\n✅ All validations passed!');
            return true;
        }
    }

    async generateStoreDescription(locale = 'he-IL') {
        const listing = this.metadata.listings[locale];
        const marketing = this.metadata.marketing[locale];
        
        return {
            title: listing.title,
            shortDescription: listing.shortDescription,
            fullDescription: listing.fullDescription,
            keywords: listing.keywords.join(', '),
            promo: listing.promo,
            tagline: marketing.tagline,
            highlights: marketing.highlights,
            benefits: marketing.benefits
        };
    }

    async exportForGooglePlay() {
        console.log('📤 Exporting metadata for Google Play Console...');
        
        const exportData = {
            packageName: this.metadata.packageName,
            defaultLanguage: this.metadata.defaultLanguage,
            
            // Basic app info
            categoryId: this.metadata.appInfo.category,
            contentRating: this.metadata.appInfo.contentRating,
            
            // Contact info
            contactWebsite: this.metadata.contact.website,
            contactEmail: this.metadata.contact.email,
            contactPhone: this.metadata.contact.phone,
            privacyPolicyUrl: this.metadata.contact.privacyPolicyUrl,
            
            // Listings
            listings: {},
            
            // Recent changes
            recentChanges: this.metadata.appInfo.recentChanges
        };
        
        // Format listings for Google Play API
        for (const [locale, listing] of Object.entries(this.metadata.listings)) {
            exportData.listings[locale] = {
                title: listing.title,
                shortDescription: listing.shortDescription,
                fullDescription: listing.fullDescription,
                video: null // No video for now
            };
        }
        
        const exportPath = path.join(this.projectRoot, 'google-play-export.json');
        await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
        
        console.log(`✅ Export saved to: ${exportPath}`);
        return exportData;
    }

    async generateMarketing() {
        console.log('📢 Generating marketing materials...');
        
        const marketing = {
            socialMedia: {
                facebook: {
                    'he-IL': `🔥 ברברס בר - האפליקציה החדשה לקביעת תורים במספרה!
                    
📱 הורידו עכשיו וקבעו תור בקלות
✂️ ספרים מקצועיים ומנוסים  
⭐ שירות אישי ומקצועי
📅 ללא המתנה בתור

#ברברס_בר #מספרה #תספורת #גברים #אפליקציה`,
                    
                    'en-US': `🔥 Barbers Bar - The new barbershop booking app!
                    
📱 Download now and book appointments easily
✂️ Professional and experienced barbers
⭐ Personal and professional service  
📅 No more waiting in line

#BarbersBar #Barbershop #Haircut #Men #App`
                },
                
                instagram: {
                    'he-IL': `גברים, הגיע הזמן לשדרג! 💇‍♂️
                    
ברברס בר מביאה לכם:
📱 אפליקציה חדשנית לקביעת תורים
✂️ ספרים מקצועיים ברמה עולמית
🏆 חוויית טיפוח יוקרתית
📸 גלריה מלאה בהשראה

הורידו היום! 👆

#ברברס_בר #סטייל #תספורת #גברים`,
                    
                    'en-US': `Men, it's time to upgrade! 💇‍♂️
                    
Barbers Bar brings you:
📱 Innovative booking app
✂️ World-class professional barbers
🏆 Luxury grooming experience  
📸 Gallery full of inspiration

Download today! 👆

#BarbersBar #Style #Haircut #Men`
                }
            },
            
            pressRelease: {
                'he-IL': `ברברס בר משיקה אפליקציה חדשנית לקביעת תורים
                
מספרת ברברס בר, המספרה המובילה לגברים, מכריזה על השקת אפליקציה חדשנית המאפשרת קביעת תורים בקלות ומהירות. האפליקציה מביאה את חוויית הטיפוח הגברי לעידן הדיגיטלי.`,
                
                'en-US': `Barbers Bar Launches Innovative Appointment Booking App
                
Barbers Bar, the leading men's barbershop, announces the launch of an innovative app that makes appointment booking easy and fast. The app brings the male grooming experience into the digital age.`
            }
        };
        
        const marketingPath = path.join(this.projectRoot, 'marketing-materials.json');
        await fs.writeFile(marketingPath, JSON.stringify(marketing, null, 2));
        
        console.log(`✅ Marketing materials saved to: ${marketingPath}`);
        return marketing;
    }

    async generateSEOKeywords() {
        console.log('🔍 Generating SEO keywords...');
        
        const seoKeywords = {
            'he-IL': {
                primary: [
                    'מספרה לגברים',
                    'ברברס בר',
                    'קביעת תור מספרה',
                    'תספורת גברים',
                    'עיצוב זקן'
                ],
                secondary: [
                    'מספרה ברמת גן',
                    'ספר מקצועי',
                    'תספורת אופנתית',
                    'טיפוח גברים',
                    'מספרת יוקרה',
                    'עיצוב שיער גברים',
                    'תספורת קצרה',
                    'זקן מעוצב'
                ],
                longTail: [
                    'איך לקבוע תור במספרה',
                    'מספרה טובה לגברים באזור',
                    'תספורת גברים מודרנית',
                    'עיצוב זקן מקצועי',
                    'מספרה עם אפליקציה'
                ]
            },
            'en-US': {
                primary: [
                    'men\'s barbershop',
                    'barbers bar',
                    'barbershop appointment',
                    'men\'s haircut',
                    'beard styling'
                ],
                secondary: [
                    'professional barber',
                    'modern haircut',
                    'men\'s grooming',
                    'premium barbershop',
                    'hair styling men',
                    'short haircut',
                    'styled beard'
                ],
                longTail: [
                    'how to book barbershop appointment',
                    'best barbershop for men',
                    'modern men\'s haircut',
                    'professional beard styling',
                    'barbershop with app'
                ]
            }
        };
        
        const seoPath = path.join(this.projectRoot, 'seo-keywords.json');
        await fs.writeFile(seoPath, JSON.stringify(seoKeywords, null, 2));
        
        console.log(`✅ SEO keywords saved to: ${seoPath}`);
        return seoKeywords;
    }

    async generateReport() {
        console.log('\n📊 Store Listing Metadata Report');
        console.log('===============================');
        
        // Basic info
        console.log(`📱 App Package: ${this.metadata.packageName}`);
        console.log(`🌍 Default Language: ${this.metadata.defaultLanguage}`);
        console.log(`📂 Category: ${this.metadata.appInfo.category}`);
        console.log(`🔞 Content Rating: ${this.metadata.appInfo.contentRating}`);
        
        // Listings
        console.log('\n📝 Store Listings:');
        for (const [locale, listing] of Object.entries(this.metadata.listings)) {
            console.log(`\n🌍 ${locale}:`);
            console.log(`  📖 Title: ${listing.title} (${listing.title.length}/50 chars)`);
            console.log(`  📄 Short Description: ${listing.shortDescription.length}/80 chars`);
            console.log(`  📃 Full Description: ${listing.fullDescription.length}/4000 chars`);
            console.log(`  🏷️  Keywords: ${listing.keywords.length} keywords`);
        }
        
        // Assets
        console.log('\n🎨 Assets:');
        console.log(`  📱 App Icon: ${this.metadata.assets.appIcon.path}`);
        console.log(`  🖼️  Feature Graphic: ${this.metadata.assets.featureGraphic.path}`);
        console.log(`  📸 Phone Screenshots: ${this.metadata.assets.screenshots.phone.length}`);
        console.log(`  📟 Tablet Screenshots: ${this.metadata.assets.screenshots.tablet.length}`);
        
        // Permissions
        console.log('\n🔐 Permissions:');
        this.metadata.permissions.forEach(permission => {
            console.log(`  • ${permission.name}`);
        });
        
        // Contact
        console.log('\n📞 Contact Information:');
        console.log(`  🌐 Website: ${this.metadata.contact.website}`);
        console.log(`  📧 Email: ${this.metadata.contact.email}`);
        console.log(`  🔒 Privacy Policy: ${this.metadata.contact.privacyPolicyUrl}`);
        console.log(`  📋 Terms of Service: ${this.metadata.contact.termsOfServiceUrl}`);
        
        console.log('\n✅ Metadata report complete!');
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0] || 'generate';

    const metadata = new StoreListingMetadata();

    switch (command) {
        case 'generate':
            metadata.generateMetadata()
                .then(() => metadata.validateMetadata())
                .then(() => metadata.generateReport())
                .catch(console.error);
            break;

        case 'validate':
            metadata.validateMetadata()
                .catch(console.error);
            break;

        case 'export':
            metadata.generateMetadata()
                .then(() => metadata.exportForGooglePlay())
                .catch(console.error);
            break;

        case 'marketing':
            metadata.generateMarketing()
                .catch(console.error);
            break;

        case 'seo':
            metadata.generateSEOKeywords()
                .catch(console.error);
            break;

        case 'report':
            metadata.generateMetadata()
                .then(() => metadata.generateReport())
                .catch(console.error);
            break;

        case 'all':
            metadata.generateMetadata()
                .then(() => metadata.validateMetadata())
                .then(() => metadata.exportForGooglePlay())
                .then(() => metadata.generateMarketing())
                .then(() => metadata.generateSEOKeywords())
                .then(() => metadata.generateReport())
                .catch(console.error);
            break;

        default:
            console.log('Available commands:');
            console.log('  generate    - Generate metadata file');
            console.log('  validate    - Validate metadata');
            console.log('  export      - Export for Google Play');
            console.log('  marketing   - Generate marketing materials');
            console.log('  seo         - Generate SEO keywords');
            console.log('  report      - Generate detailed report');
            console.log('  all         - Run all commands');
    }
}

module.exports = StoreListingMetadata;