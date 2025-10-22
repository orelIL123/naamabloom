#!/usr/bin/env node

/**
 * Android MCP Server
 * Handles Android build configuration, Google Services, and APK/AAB generation
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
import { execSync } from 'child_process';

const server = new Server(
  {
    name: 'android-deploy-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Validate Android build configuration
async function validateAndroidConfig() {
  try {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      config: {}
    };

    // Check app.json configuration
    const appJsonPath = './app.json';
    const appJsonContent = await fs.readFile(appJsonPath, 'utf8');
    const appConfig = JSON.parse(appJsonContent);
    
    const androidConfig = appConfig.expo?.android;
    if (!androidConfig) {
      validation.errors.push('Missing android configuration in app.json');
      validation.valid = false;
    } else {
      validation.config.appJson = {
        package: androidConfig.package,
        versionCode: androidConfig.versionCode,
        permissions: androidConfig.permissions,
        googleServicesFile: androidConfig.googleServicesFile
      };
    }

    // Check EAS configuration
    const easJsonPath = './eas.json';
    const easJsonContent = await fs.readFile(easJsonPath, 'utf8');
    const easConfig = JSON.parse(easJsonContent);
    
    const androidBuildConfig = easConfig.build?.production?.android;
    if (!androidBuildConfig) {
      validation.warnings.push('Missing production android build configuration in eas.json');
    } else {
      validation.config.easBuild = {
        buildType: androidBuildConfig.buildType,
        credentialsSource: androidBuildConfig.credentialsSource,
        gradle: androidBuildConfig.gradle
      };
    }

    // Check gradle.properties
    const gradlePropsPath = './android/gradle.properties';
    try {
      const gradleContent = await fs.readFile(gradlePropsPath, 'utf8');
      validation.config.gradle = {
        newArchEnabled: gradleContent.includes('newArchEnabled=true'),
        hermesEnabled: gradleContent.includes('hermesEnabled=true'),
        useAndroidX: gradleContent.includes('android.useAndroidX=true'),
        enablePngCrunch: gradleContent.includes('android.enablePngCrunchInReleaseBuilds=true')
      };
    } catch (error) {
      validation.warnings.push(`Could not read gradle.properties: ${error.message}`);
    }

    // Check build.gradle
    const buildGradlePath = './android/app/build.gradle';
    try {
      const buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');
      
      // Extract package name from namespace or applicationId
      const namespaceMatch = buildGradleContent.match(/namespace\s+"([^"]+)"/);
      const appIdMatch = buildGradleContent.match(/applicationId\s+"([^"]+)"/);
      
      validation.config.buildGradle = {
        namespace: namespaceMatch?.[1],
        applicationId: appIdMatch?.[1],
        hasProguard: buildGradleContent.includes('minifyEnabled'),
        hasGoogleServices: buildGradleContent.includes('google-services')
      };

      // Validate package name consistency
      const expectedPackage = process.env.ANDROID_PACKAGE_NAME;
      if (expectedPackage && validation.config.buildGradle.namespace !== expectedPackage) {
        validation.errors.push(
          `Package name mismatch in build.gradle: found "${validation.config.buildGradle.namespace}", expected "${expectedPackage}"`
        );
        validation.valid = false;
      }
    } catch (error) {
      validation.errors.push(`Could not read android/app/build.gradle: ${error.message}`);
      validation.valid = false;
    }

    // Check google-services.json exists and is valid
    const googleServicesPath = process.env.GOOGLE_SERVICES_JSON || './app/google-services.json';
    try {
      await fs.access(googleServicesPath);
      validation.config.googleServices = { exists: true, path: googleServicesPath };
    } catch (error) {
      validation.errors.push(`google-services.json not found at ${googleServicesPath}`);
      validation.valid = false;
    }

    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate Android configuration: ${error.message}`],
      warnings: [],
      config: null
    };
  }
}

// Fix Android configuration issues
async function fixAndroidConfig() {
  try {
    const fixes = [];
    const errors = [];
    
    // Fix package name in build.gradle if needed
    const buildGradlePath = './android/app/build.gradle';
    const expectedPackage = process.env.ANDROID_PACKAGE_NAME;
    
    if (expectedPackage) {
      try {
        let buildGradleContent = await fs.readFile(buildGradlePath, 'utf8');
        
        // Fix namespace
        if (buildGradleContent.includes('namespace "com.barbersbar"')) {
          buildGradleContent = buildGradleContent.replace(
            /namespace "com\.barbersbar"/g,
            `namespace "${expectedPackage}"`
          );
          fixes.push(`Updated namespace to ${expectedPackage}`);
        }
        
        // Fix applicationId
        if (buildGradleContent.includes('applicationId "com.barbersbar"')) {
          buildGradleContent = buildGradleContent.replace(
            /applicationId "com\.barbersbar"/g,
            `applicationId "${expectedPackage}"`
          );
          fixes.push(`Updated applicationId to ${expectedPackage}`);
        }
        
        // Update version code
        const versionCode = process.env.ANDROID_VERSION_CODE;
        if (versionCode && buildGradleContent.includes('versionCode 1')) {
          buildGradleContent = buildGradleContent.replace(
            /versionCode \d+/g,
            `versionCode ${versionCode}`
          );
          fixes.push(`Updated versionCode to ${versionCode}`);
        }
        
        await fs.writeFile(buildGradlePath, buildGradleContent);
        fixes.push('Updated android/app/build.gradle');
      } catch (error) {
        errors.push(`Failed to fix build.gradle: ${error.message}`);
      }
    }
    
    return {
      success: errors.length === 0,
      fixes,
      errors,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      fixes: [],
      errors: [`Failed to fix Android configuration: ${error.message}`],
      timestamp: new Date().toISOString()
    };
  }
}

// Build Android APK/AAB
async function buildAndroid(buildType = 'app-bundle') {
  try {
    const command = buildType === 'apk' 
      ? 'eas build --platform android --profile preview'
      : 'eas build --platform android --profile production';
    
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: process.cwd(),
      timeout: 1800000 // 30 minutes
    });
    
    return {
      success: true,
      buildType,
      output: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      buildType,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    };
  }
}

// Check EAS CLI and authentication
async function checkEASCLI() {
  try {
    const version = execSync('eas --version', { encoding: 'utf8' }).trim();
    
    let authStatus;
    try {
      const whoami = execSync('eas whoami', { encoding: 'utf8' });
      authStatus = { authenticated: true, user: whoami.trim() };
    } catch {
      authStatus = { authenticated: false, user: null };
    }
    
    return {
      installed: true,
      version,
      authStatus
    };
  } catch (error) {
    return {
      installed: false,
      version: null,
      authStatus: { authenticated: false, user: null },
      error: error.message
    };
  }
}

// Generate keystore for signing
async function generateKeystore() {
  try {
    const keystorePath = './android/app/release.keystore';
    const command = `keytool -genkeypair -v -keystore ${keystorePath} -name barbersbar-key -keyalg RSA -keysize 2048 -validity 10000 -storepass barbersbar123 -keypass barbersbar123 -dname "CN=Barbers Bar, OU=Mobile, O=Barbers Bar, L=Tel Aviv, ST=Israel, C=IL"`;
    
    const result = execSync(command, {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    return {
      success: true,
      keystorePath,
      output: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || '',
      timestamp: new Date().toISOString()
    };
  }
}

// List Android tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_android_config',
        description: 'Validate Android build configuration and dependencies',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'fix_android_config',
        description: 'Fix common Android configuration issues',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_eas_cli',
        description: 'Check EAS CLI installation and authentication status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'build_android',
        description: 'Build Android APK or AAB using EAS Build',
        inputSchema: {
          type: 'object',
          properties: {
            buildType: {
              type: 'string',
              enum: ['apk', 'app-bundle'],
              default: 'app-bundle',
              description: 'Type of build to create',
            },
          },
        },
      },
      {
        name: 'generate_keystore',
        description: 'Generate a release keystore for Android signing',
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
      case 'validate_android_config':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await validateAndroidConfig(), null, 2),
            },
          ],
        };

      case 'fix_android_config':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await fixAndroidConfig(), null, 2),
            },
          ],
        };

      case 'check_eas_cli':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await checkEASCLI(), null, 2),
            },
          ],
        };

      case 'build_android':
        const buildType = args?.buildType || 'app-bundle';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await buildAndroid(buildType), null, 2),
            },
          ],
        };

      case 'generate_keystore':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await generateKeystore(), null, 2),
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
  console.error('Android MCP server running on stdio');
}

main().catch(console.error);