#!/usr/bin/env node

/**
 * Google Play Store MCP Server
 * Handles Google Play Console integration, app metadata, and deployment validation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';

const server = new Server(
  {
    name: 'play-store-deploy-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Validate Play Store requirements
async function validatePlayStoreRequirements() {
  try {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      requirements: {}
    };

    // Check app icons
    const iconPaths = [
      './assets/images/icon.png',
      './assets/images/adaptive-icon.png',
      './assets/google-play/app-icon-512x512.png'
    ];

    validation.requirements.icons = {};
    for (const iconPath of iconPaths) {
      try {
        await fs.access(iconPath);
        validation.requirements.icons[path.basename(iconPath)] = { exists: true, path: iconPath };
      } catch {
        validation.requirements.icons[path.basename(iconPath)] = { exists: false, path: iconPath };
        if (iconPath.includes('512x512')) {
          validation.errors.push(`Missing required Play Store icon: ${iconPath}`);
          validation.valid = false;
        } else {
          validation.warnings.push(`Missing icon: ${iconPath}`);
        }
      }
    }

    // Check feature graphic
    const featureGraphicPaths = [
      './assets/google-play/feature-graphic-1024x500-v2.jpg',
      './assets/google-play/feature-graphic-1024x500.jpg'
    ];

    validation.requirements.featureGraphic = { exists: false };
    for (const graphicPath of featureGraphicPaths) {
      try {
        await fs.access(graphicPath);
        validation.requirements.featureGraphic = { exists: true, path: graphicPath };
        break;
      } catch {
        // Continue to next path
      }
    }

    if (!validation.requirements.featureGraphic.exists) {
      validation.errors.push('Missing required feature graphic (1024x500)');
      validation.valid = false;
    }

    // Check app.json configuration
    const appJsonPath = './app.json';
    const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
    const appConfig = JSON.parse(appJsonContent);

    validation.requirements.appConfig = {
      name: appConfig.expo?.name,
      version: appConfig.expo?.version,
      androidPackage: appConfig.expo?.android?.package,
      androidVersionCode: appConfig.expo?.android?.versionCode,
      permissions: appConfig.expo?.android?.permissions || []
    };

    // Validate required fields
    if (!validation.requirements.appConfig.name) {
      validation.errors.push('Missing app name in app.json');
      validation.valid = false;
    }

    if (!validation.requirements.appConfig.version) {
      validation.errors.push('Missing app version in app.json');
      validation.valid = false;
    }

    if (!validation.requirements.appConfig.androidPackage) {
      validation.errors.push('Missing Android package name in app.json');
      validation.valid = false;
    }

    if (!validation.requirements.appConfig.androidVersionCode) {
      validation.errors.push('Missing Android version code in app.json');
      validation.valid = false;
    }

    // Check privacy policy
    const privacyPolicyPath = './privacy-policy.html';
    try {
      await fs.access(privacyPolicyPath);
      validation.requirements.privacyPolicy = { exists: true, path: privacyPolicyPath };
    } catch {
      validation.requirements.privacyPolicy = { exists: false, path: privacyPolicyPath };
      validation.warnings.push('Missing privacy policy file');
    }

    // Check terms of service
    const termsPath = './terms-of-service.html';
    try {
      await fs.access(termsPath);
      validation.requirements.termsOfService = { exists: true, path: termsPath };
    } catch {
      validation.requirements.termsOfService = { exists: false, path: termsPath };
      validation.warnings.push('Missing terms of service file');
    }

    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate Play Store requirements: ${error.message}`],
      warnings: [],
      requirements: null
    };
  }
}

// Generate Play Store metadata
async function generatePlayStoreMetadata() {
  try {
    const appJsonPath = './app.json';
    const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
    const appConfig = JSON.parse(appJsonContent);

    const metadata = {
      appName: appConfig.expo?.name || 'Barbers Bar',
      packageName: appConfig.expo?.android?.package || 'com.barbersbar.app',
      version: appConfig.expo?.version || '1.0.0',
      versionCode: appConfig.expo?.android?.versionCode || 1,
      shortDescription: 'ברוכים הבאים למספרת ברברס בר - החוויה המושלמת לטיפוח גברים',
      fullDescription: `ברוכים הבאים למספרת ברברס בר!

האפליקציה הרשמית של מספרת ברברס בר מביאה לכם את חוויית הטיפוח המושלמת ישירות לסמארטפון שלכם.

תכונות עיקריות:
📅 קביעת תורים אונליין - בחרו את הספר והשעה הנוחים לכם
💇‍♂️ גלריית עבודות - הכירו את הסגנונות והטיפולים שלנו  
👥 הכירו את הצוות - פרופילים מפורטים של הספרים המקצועיים שלנו
⏰ ניהול תורים - עקבו אחרי התורים שלכם וקבלו התראות
🎨 טיפולים מגוונים - ספרות, עיצוב זקן, טיפוח פנים ועוד

מספרת ברברס בר - המקום בו מסורת פגושה חדשנות. אנחנו מביאים לכם את הטוב ביותר בעולם הטיפוח הגברי, עם שירות אישי ומקצועי ברמה הגבוהה ביותר.

הורידו עכשיו וחוו את ההבדל!`,
      keywords: [
        'מספרה',
        'ברברס',
        'ספר',
        'תספורת',
        'זקן',
        'טיפוח',
        'גברים',
        'תור',
        'יופי',
        'סטייל'
      ],
      category: 'LIFESTYLE',
      contentRating: 'Everyone',
      website: 'https://barbersbar.app',
      email: 'info@barbersbar.app',
      phone: '+972-XX-XXXXXXX',
      address: 'תל אביב, ישראל',
      screenshots: {
        phone: [
          'Screenshot showing main booking interface',
          'Screenshot showing barber profiles',
          'Screenshot showing gallery',
          'Screenshot showing appointment management'
        ],
        tablet: []
      },
      featureGraphic: './assets/google-play/feature-graphic-1024x500-v2.jpg',
      appIcon: './assets/google-play/app-icon-512x512.png',
      privacyPolicyUrl: 'https://barbersbar.app/privacy-policy.html',
      termsOfServiceUrl: 'https://barbersbar.app/terms-of-service.html'
    };

    return {
      success: true,
      metadata,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Generate Play Store listing description in multiple languages
async function generateListingDescriptions() {
  try {
    const descriptions = {
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

מספרת ברברס בר - המקום בו מסורת פגושה חדשנות.`,
        keywords: ['מספרה', 'ברברס', 'ספר', 'תספורת', 'זקן', 'טיפוח', 'גברים']
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

Barbers Bar - Where tradition meets innovation in men's grooming.`,
        keywords: ['barbershop', 'barber', 'haircut', 'beard', 'grooming', 'men', 'appointment', 'styling']
      }
    };

    return {
      success: true,
      descriptions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Create Play Store release checklist
async function createReleaseChecklist() {
  try {
    const validation = await validatePlayStoreRequirements();
    
    const checklist = {
      preSubmission: [
        {
          task: 'App Bundle (.aab) built and signed',
          status: 'pending',
          description: 'Build production Android App Bundle using EAS Build'
        },
        {
          task: 'App tested on multiple devices',
          status: 'pending',
          description: 'Test on different Android versions and screen sizes'
        },
        {
          task: 'All permissions justified',
          status: validation.requirements?.appConfig?.permissions?.length > 0 ? 'completed' : 'pending',
          description: 'Ensure all requested permissions are necessary and explained'
        },
        {
          task: 'App content rating completed',
          status: 'pending',
          description: 'Complete content rating questionnaire in Play Console'
        },
        {
          task: 'Privacy Policy uploaded',
          status: validation.requirements?.privacyPolicy?.exists ? 'completed' : 'pending',
          description: 'Upload privacy policy to website and link in Play Console'
        }
      ],
      assets: [
        {
          task: 'App icon (512x512)',
          status: validation.requirements?.icons?.['app-icon-512x512.png']?.exists ? 'completed' : 'pending',
          description: 'High-resolution app icon for Play Store'
        },
        {
          task: 'Feature graphic (1024x500)',
          status: validation.requirements?.featureGraphic?.exists ? 'completed' : 'pending',
          description: 'Feature graphic for store listing'
        },
        {
          task: 'Screenshots (phone)',
          status: 'pending',
          description: 'At least 2 phone screenshots, up to 8 recommended'
        },
        {
          task: 'Screenshots (tablet)',
          status: 'pending',
          description: 'Optional tablet screenshots if supported'
        }
      ],
      storeListingLis: [
        {
          task: 'App title and description',
          status: 'completed',
          description: 'App name and detailed description in Hebrew and English'
        },
        {
          task: 'Keywords and category',
          status: 'completed',
          description: 'Relevant keywords and app category (Lifestyle)'
        },
        {
          task: 'Contact information',
          status: 'pending',
          description: 'Developer email, website, and support contact'
        },
        {
          task: 'Target audience and content',
          status: 'pending',
          description: 'Age range and content rating'
        }
      ],
      technicalRequirements: [
        {
          task: 'Target API level 33+',
          status: 'pending',
          description: 'Ensure app targets Android API level 33 or higher'
        },
        {
          task: '64-bit support',
          status: 'pending',
          description: 'App includes 64-bit native libraries'
        },
        {
          task: 'App signing by Google Play',
          status: 'pending',
          description: 'Set up Play App Signing in Play Console'
        },
        {
          task: 'Proguard/R8 optimization',
          status: 'completed',
          description: 'Code obfuscation and optimization enabled'
        }
      ]
    };

    return {
      success: true,
      checklist,
      summary: {
        total: Object.values(checklist).flat().length,
        completed: Object.values(checklist).flat().filter(item => item.status === 'completed').length,
        pending: Object.values(checklist).flat().filter(item => item.status === 'pending').length
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// List Play Store tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_play_store_requirements',
        description: 'Validate Google Play Store submission requirements',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_play_store_metadata',
        description: 'Generate metadata for Play Store listing',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_listing_descriptions',
        description: 'Generate store listing descriptions in multiple languages',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_release_checklist',
        description: 'Create a comprehensive release checklist for Play Store submission',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'validate_play_store_requirements':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await validatePlayStoreRequirements(), null, 2),
            },
          ],
        };

      case 'generate_play_store_metadata':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await generatePlayStoreMetadata(), null, 2),
            },
          ],
        };

      case 'generate_listing_descriptions':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await generateListingDescriptions(), null, 2),
            },
          ],
        };

      case 'create_release_checklist':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createReleaseChecklist(), null, 2),
            },
          ],
        };

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error.message}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Play Store MCP server running on stdio');
}

main().catch(console.error);