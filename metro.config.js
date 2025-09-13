const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure these extensions are resolved properly
config.resolver.sourceExts.push('cjs');

// Add asset extensions
const defaultAssetExts = require('metro-config/src/defaults/defaults').assetExts;
config.resolver.assetExts = [
  ...defaultAssetExts,
  'png',
  'jpg',
  'jpeg',
  'gif',
  'JPG',
  'PNG'
];


// Enable symlinks for better development
config.resolver.symlinks = true;

// Optimize for production builds
config.resolver.platforms = ['ios', 'android', 'web'];

// Simplified Node.js polyfills for Android compatibility
config.resolver.alias = {
  'node:util/types': 'util',
  'node:assert': 'assert',
  'node:buffer': 'buffer',
  'node:crypto': 'crypto-browserify',
  'node:events': 'events',
  'node:http': 'http-browserify',
  'node:https': 'https-browserify',
  'node:net': 'net',
  'node:os': 'os-browserify',
  'node:path': 'path-browserify',
  'node:querystring': 'querystring-es3',
  'node:stream': 'stream-browserify',
  'node:string_decoder': 'string_decoder',
  'node:url': 'url',
  'node:util': 'util',
  'node:zlib': 'browserify-zlib'
};

module.exports = config;