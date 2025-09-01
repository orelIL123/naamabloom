#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REQUIRED_DIRECTORIES = [
  'app', 'assets', 'components', 'config', 
  'constants', 'hooks', 'services'
];

const REQUIRED_CONFIG_FILES = [
  'app.json', 'eas.json', 'babel.config.js', 
  'tailwind.config.js', 'metro.config.js', 'tsconfig.json'
];

function checkTemplateIntegrity() {
  const templatePath = path.resolve(__dirname, '..');
  let missingItems = [];

  // Check directories
  REQUIRED_DIRECTORIES.forEach(dir => {
    const dirPath = path.join(templatePath, dir);
    if (!fs.existsSync(dirPath)) {
      missingItems.push(`Directory: ${dir}`);
    }
  });

  // Check configuration files
  REQUIRED_CONFIG_FILES.forEach(file => {
    const filePath = path.join(templatePath, file);
    if (!fs.existsSync(filePath)) {
      missingItems.push(`Config File: ${file}`);
    }
  });

  // Check package.json for expo-device version
  const packageJsonPath = path.join(templatePath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const expoDeviceVersion = packageJson.dependencies['expo-device'];
    if (expoDeviceVersion !== '^7.1.4') {
      missingItems.push(`Incorrect expo-device version: ${expoDeviceVersion}`);
    }
  }

  if (missingItems.length > 0) {
    console.error('Template Integrity Check Failed:');
    missingItems.forEach(item => console.error(`- ${item}`));
    process.exit(1);
  } else {
    console.log('Template Integrity Check Passed Successfully!');
  }
}

checkTemplateIntegrity();