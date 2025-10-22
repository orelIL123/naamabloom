#!/usr/bin/env node

/**
 * Firebase MCP Server
 * Handles Firebase integration, validation, and deployment for Barbers Bar app
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
    name: 'firebase-deploy-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Firebase configuration validation
async function validateFirebaseConfig() {
  try {
    const googleServicesPath = process.env.GOOGLE_SERVICES_JSON || './app/google-services.json';
    const googleServicesContent = await fs.readFile(googleServicesPath, 'utf8');
    const config = JSON.parse(googleServicesContent);
    
    const requiredFields = [
      'project_info.project_id',
      'project_info.project_number', 
      'project_info.storage_bucket',
      'client[0].client_info.mobilesdk_app_id',
      'client[0].client_info.android_client_info.package_name'
    ];
    
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      config: {
        projectId: config.project_info?.project_id,
        projectNumber: config.project_info?.project_number,
        storageBucket: config.project_info?.storage_bucket,
        packageName: config.client?.[0]?.client_info?.android_client_info?.package_name,
        appId: config.client?.[0]?.client_info?.mobilesdk_app_id
      }
    };
    
    // Validate required fields
    requiredFields.forEach(field => {
      const keys = field.split('.');
      let value = config;
      
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
        validation.valid = false;
        validation.errors.push(`Missing required field: ${field}`);
      }
    });
    
    // Validate project ID matches environment
    if (validation.config.projectId !== process.env.FIREBASE_PROJECT_ID) {
      validation.warnings.push(
        `Project ID mismatch: config has "${validation.config.projectId}", environment expects "${process.env.FIREBASE_PROJECT_ID}"`
      );
    }
    
    // Validate package name
    if (validation.config.packageName !== process.env.ANDROID_PACKAGE_NAME) {
      validation.warnings.push(
        `Package name mismatch: config has "${validation.config.packageName}", environment expects "${process.env.ANDROID_PACKAGE_NAME}"`
      );
    }
    
    return validation;
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to read/parse google-services.json: ${error.message}`],
      warnings: [],
      config: null
    };
  }
}

// Check Firebase CLI and authentication
async function checkFirebaseCLI() {
  try {
    const version = execSync('firebase --version', { encoding: 'utf8' }).trim();
    
    let authStatus;
    try {
      const whoami = execSync('firebase auth:list', { encoding: 'utf8' });
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

// Deploy Firebase functions
async function deployFirebaseFunctions() {
  try {
    const result = execSync('firebase deploy --only functions', { 
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    return {
      success: true,
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

// Deploy Firestore rules and indexes
async function deployFirestore() {
  try {
    const result = execSync('firebase deploy --only firestore', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    return {
      success: true,
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

// Deploy Storage rules
async function deployStorage() {
  try {
    const result = execSync('firebase deploy --only storage', {
      encoding: 'utf8', 
      cwd: process.cwd()
    });
    
    return {
      success: true,
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

// List Firebase tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_firebase_config',
        description: 'Validate Firebase configuration files and settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_firebase_cli',
        description: 'Check Firebase CLI installation and authentication status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'deploy_firebase_functions',
        description: 'Deploy Firebase Cloud Functions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'deploy_firestore',
        description: 'Deploy Firestore rules and indexes',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'deploy_storage',
        description: 'Deploy Firebase Storage rules',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'full_firebase_deploy',
        description: 'Deploy all Firebase services (functions, firestore, storage)',
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
      case 'validate_firebase_config':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await validateFirebaseConfig(), null, 2),
            },
          ],
        };

      case 'check_firebase_cli':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await checkFirebaseCLI(), null, 2),
            },
          ],
        };

      case 'deploy_firebase_functions':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await deployFirebaseFunctions(), null, 2),
            },
          ],
        };

      case 'deploy_firestore':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await deployFirestore(), null, 2),
            },
          ],
        };

      case 'deploy_storage':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await deployStorage(), null, 2),
            },
          ],
        };

      case 'full_firebase_deploy':
        const functionsResult = await deployFirebaseFunctions();
        const firestoreResult = await deployFirestore();
        const storageResult = await deployStorage();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                functions: functionsResult,
                firestore: firestoreResult,
                storage: storageResult,
                overall: {
                  success: functionsResult.success && firestoreResult.success && storageResult.success,
                  timestamp: new Date().toISOString()
                }
              }, null, 2),
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
  console.error('Firebase MCP server running on stdio');
}

main().catch(console.error);