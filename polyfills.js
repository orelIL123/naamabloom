// Critical polyfills for React Native/Hermes environment
// Must be loaded FIRST before any other modules

import { Buffer } from 'buffer';

// Set up Buffer globally (required by Firebase and crypto operations)
if (typeof global !== 'undefined') {
  global.Buffer = Buffer;
  
  // Also set on globalThis for better compatibility
  if (typeof globalThis !== 'undefined') {
    globalThis.Buffer = Buffer;
  }
}

// Basic ReadableStream polyfill for Android/Hermes compatibility
if (typeof global !== 'undefined' && typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() {}
    static from() {
      return new ReadableStream();
    }
  };
}

// TextEncoder/TextDecoder polyfills for Hermes
if (typeof global !== 'undefined') {
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
      encode(str) {
        const buf = Buffer.from(str, 'utf-8');
        return new Uint8Array(buf);
      }
    };
  }
  
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
      decode(arr) {
        const buf = Buffer.from(arr);
        return buf.toString('utf-8');
      }
    };
  }
}

// Process polyfill for Node.js-like environments
if (typeof global !== 'undefined' && typeof global.process === 'undefined') {
  global.process = {
    env: {},
    version: '',
    versions: {},
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

// __DEV__ global variable (should be set by bundler, but ensure it exists)
if (typeof global !== 'undefined' && typeof global.__DEV__ === 'undefined') {
  global.__DEV__ = false; // Default to production mode if not set
}

console.log('✅ Polyfills loaded successfully');