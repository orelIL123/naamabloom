#!/bin/bash

echo "🧹 Cleaning iOS Pods for Xcode 26.0 compatibility..."

# Remove existing Pods and lock file
rm -rf ios/Pods
rm -rf ios/Podfile.lock
rm -rf ios/build

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Clear pod cache
pod cache clean --all

echo "✅ Pods cleaned successfully!"
echo "📦 Next step: Run 'pod install' in ios/ directory"
