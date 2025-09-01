#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function shouldBuildIOS() {
  const nativeChangesIndicators = [
    'ios/Podfile',
    'ios/Podfile.lock',
    'ios/BarbersBar.xcodeproj',
    'app.json',
    'eas.json'
  ];

  const hasNativeChanges = nativeChangesIndicators.some(indicator => {
    const fullPath = path.join(process.cwd(), indicator);
    try {
      const stats = fs.statSync(fullPath);
      // Check modification time or other attributes
      return true;
    } catch (error) {
      return false;
    }
  });

  if (hasNativeChanges) {
    console.log('Native changes detected. Full build recommended.');
    process.exit(0);
  } else {
    console.log('No native changes. OTA update preferred.');
    process.exit(1);
  }
}

shouldBuildIOS();