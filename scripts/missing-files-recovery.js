#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_PROJECT_PATH = path.resolve(__dirname, '..', '..');
const TEMPLATE_PATH = path.resolve(__dirname, '..');

const RECOVERY_MAP = {
  'app': ['app'],
  'assets': ['assets'],
  'components': ['components'],
  'config': ['config'],
  'constants': ['constants'],
  'hooks': ['hooks'],
  'services': ['services'],
  'config_files': [
    'app.json', 
    'eas.json', 
    'babel.config.js', 
    'tailwind.config.js', 
    'metro.config.js', 
    'tsconfig.json'
  ]
};

function recoverMissingFiles() {
  console.log('Starting Template File Recovery...');

  Object.entries(RECOVERY_MAP).forEach(([key, items]) => {
    items.forEach(item => {
      const sourcePath = path.join(SOURCE_PROJECT_PATH, item);
      const destPath = path.join(TEMPLATE_PATH, item);

      try {
        if (fs.existsSync(sourcePath)) {
          if (key === 'config_files') {
            // For individual files
            fs.copyFileSync(sourcePath, destPath);
            console.log(`Recovered config file: ${item}`);
          } else {
            // For directories
            execSync(`cp -R "${sourcePath}" "${destPath}"`);
            console.log(`Recovered directory: ${item}`);
          }
        } else {
          console.warn(`Source not found for: ${item}`);
        }
      } catch (error) {
        console.error(`Error recovering ${item}: ${error.message}`);
      }
    });
  });

  console.log('Template File Recovery Completed.');
}

recoverMissingFiles();