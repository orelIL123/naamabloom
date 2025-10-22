#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Generate update.json file from app.json
 * Extracts version from app.json and creates update.json with version info
 */

function generateUpdateJson() {
  try {
    // Read app.json
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonContent);
    
    // Extract version from expo.version
    const versionName = appJson.expo.version;
    if (!versionName) {
      throw new Error('Version not found in app.json expo.version');
    }
    
    // Convert version to versionCode (take last number from version string)
    // Example: "1.0.7" -> 7, "1.2.3" -> 3, "2.0.1" -> 1
    const versionParts = versionName.split('.');
    const versionCode = parseInt(versionParts[versionParts.length - 1], 10);
    
    if (isNaN(versionCode)) {
      throw new Error(`Invalid version format: ${versionName}`);
    }
    
    // Create update.json structure
    const updateJson = {
      versionName: versionName,
      versionCode: versionCode,
      url: `https://mydomain.com/myapp-${versionName}.apk`,
      releaseNotes: "🚀 Auto-generated from app.json"
    };
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log('✅ Created public directory');
    }
    
    // Write update.json
    const updateJsonPath = path.join(publicDir, 'update.json');
    fs.writeFileSync(updateJsonPath, JSON.stringify(updateJson, null, 2));
    
    console.log('✅ Generated update.json successfully!');
    console.log(`📱 Version: ${versionName}`);
    console.log(`🔢 Version Code: ${versionCode}`);
    console.log(`📄 File: ${updateJsonPath}`);
    console.log('\n📋 Generated content:');
    console.log(JSON.stringify(updateJson, null, 2));
    
  } catch (error) {
    console.error('❌ Error generating update.json:', error.message);
    process.exit(1);
  }
}

// Run the script
generateUpdateJson();

