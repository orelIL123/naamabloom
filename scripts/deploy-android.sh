#!/bin/bash

# Barbers Bar - Android Deployment Script
# Automates the Android build and deployment process

set -e  # Exit on any error

echo "🚀 Starting Barbers Bar Android deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "app.json" ]]; then
    print_error "app.json not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Validate setup
print_status "Step 1: Validating setup..."
if [[ -f "mcp/validate-setup.js" ]]; then
    node mcp/validate-setup.js
    if [[ $? -ne 0 ]]; then
        print_error "Validation failed. Please fix the issues and try again."
        exit 1
    fi
    print_success "Setup validation passed!"
else
    print_warning "Validation script not found, skipping validation..."
fi

# Step 2: Check CLI tools
print_status "Step 2: Checking required CLI tools..."

command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed."; exit 1; }

print_success "Node.js and npm are installed"

# Check if EAS CLI is available
if ! command -v eas >/dev/null 2>&1; then
    print_status "Installing EAS CLI..."
    npm install -g @expo/eas-cli
fi

# Check if user is logged in to EAS
print_status "Checking EAS authentication..."
if ! eas whoami >/dev/null 2>&1; then
    print_error "Please log in to EAS first: eas login"
    exit 1
fi
print_success "EAS authentication verified"

# Step 3: Install dependencies
print_status "Step 3: Installing dependencies..."
npm install
print_success "Dependencies installed"

# Step 4: Clear cache
print_status "Step 4: Clearing cache..."
npx expo r -c
print_success "Cache cleared"

# Step 5: Check Firebase configuration
print_status "Step 5: Validating Firebase configuration..."
if [[ ! -f "app/google-services.json" ]]; then
    print_error "google-services.json not found in app/ directory"
    exit 1
fi

if [[ ! -f "firebase.json" ]]; then
    print_error "firebase.json not found"
    exit 1
fi
print_success "Firebase configuration validated"

# Step 6: Pre-build checks
print_status "Step 6: Running pre-build checks..."

# Check if package name is correct in app.json
PACKAGE_NAME=$(node -p "JSON.parse(require('fs').readFileSync('app.json', 'utf8')).expo.android.package")
if [[ "$PACKAGE_NAME" != "com.barbersbar.app" ]]; then
    print_error "Package name in app.json is incorrect: $PACKAGE_NAME"
    exit 1
fi
print_success "Package name verified: $PACKAGE_NAME"

# Check version code
VERSION_CODE=$(node -p "JSON.parse(require('fs').readFileSync('app.json', 'utf8')).expo.android.versionCode")
print_status "Building version code: $VERSION_CODE"

# Step 7: Build the app
print_status "Step 7: Building Android app bundle..."

BUILD_TYPE=${1:-"app-bundle"}  # Default to app-bundle, allow override
PROFILE=${2:-"production"}     # Default to production profile

if [[ "$BUILD_TYPE" == "apk" ]]; then
    print_status "Building APK for testing..."
    eas build --platform android --profile preview --non-interactive
else
    print_status "Building app bundle for Google Play..."
    eas build --platform android --profile production --non-interactive
fi

if [[ $? -eq 0 ]]; then
    print_success "Build completed successfully!"
    
    # Get build URL
    print_status "Getting build information..."
    BUILD_INFO=$(eas build:list --platform android --limit 1 --json)
    BUILD_URL=$(echo "$BUILD_INFO" | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'))[0].artifacts.buildUrl || 'N/A'")
    
    if [[ "$BUILD_URL" != "N/A" ]]; then
        print_success "Build URL: $BUILD_URL"
        echo "$BUILD_URL" > last-build-url.txt
        print_status "Build URL saved to last-build-url.txt"
    fi
    
    # Step 8: Post-build instructions
    echo ""
    echo "🎉 Build completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Download the build from: $BUILD_URL"
    if [[ "$BUILD_TYPE" == "app-bundle" ]]; then
        echo "2. Upload the .aab file to Google Play Console"
        echo "3. Complete the store listing information"
        echo "4. Submit for review"
    else
        echo "2. Install the .apk file on test devices"
        echo "3. Test thoroughly before building for production"
    fi
    echo ""
    echo "For more information, see: google-play/deployment-checklist.md"
    
else
    print_error "Build failed. Please check the logs above."
    exit 1
fi

print_success "Android deployment script completed!"