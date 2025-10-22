#!/bin/bash

# Barbers Bar - Quick Setup Script for Google Play Store Upload
# This script sets up everything needed for automated Google Play Store uploads

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_header "Barbers Bar - Google Play Store Setup"
echo -e "${BLUE}Setting up automated Google Play Store uploads...${NC}"
echo ""

# Check Node.js
print_info "Checking Node.js..."
if command_exists "node"; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js not found!"
    print_info "Please install Node.js 14+ from https://nodejs.org/"
    exit 1
fi

# Check npm
print_info "Checking npm..."
if command_exists "npm"; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed: $NPM_VERSION"
else
    print_error "npm not found!"
    exit 1
fi

# Check/Install EAS CLI
print_info "Checking EAS CLI..."
if command_exists "eas"; then
    EAS_VERSION=$(eas --version)
    print_success "EAS CLI installed: $EAS_VERSION"
else
    print_warning "EAS CLI not found. Installing..."
    npm install -g eas-cli
    print_success "EAS CLI installed"
fi

# Install project dependencies
print_info "Installing project dependencies..."
npm install

# Install Google Play automation dependencies
print_info "Installing Google Play automation dependencies..."
npm install googleapis google-auth-library axios form-data sharp --save-dev

print_success "Dependencies installed"

# Make scripts executable
print_info "Setting up scripts..."
chmod +x scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.js 2>/dev/null || true

# Create necessary directories
print_info "Creating directories..."
mkdir -p screenshots/phone
mkdir -p screenshots/tablet
mkdir -p screenshots/feature-graphics
mkdir -p upload-logs
mkdir -p build

print_success "Directories created"

# Check EAS authentication
print_info "Checking EAS authentication..."
if eas whoami >/dev/null 2>&1; then
    CURRENT_USER=$(eas whoami)
    print_success "EAS authenticated as: $CURRENT_USER"
else
    print_warning "Not authenticated with EAS"
    print_info "Please run: eas login"
fi

# Generate default environment file
if [ ! -f ".env" ]; then
    print_info "Creating .env file from template..."
    cp .env.example .env
    print_success ".env file created"
    print_info "Please edit .env file with your actual values"
else
    print_warning ".env file already exists"
fi

# Check for existing credentials
if [ -f "google-play-credentials.json" ]; then
    print_success "Google Play credentials found"
else
    print_warning "Google Play credentials not found"
    print_info "You'll need to run: npm run setup-playstore"
fi

# Check Firebase configuration
if [ -f "app/google-services.json" ]; then
    print_success "Firebase configuration found"
else
    print_warning "Firebase configuration not found at app/google-services.json"
fi

# Validate app configuration
print_info "Validating app configuration..."
if [ -f "app.json" ] && [ -f "eas.json" ]; then
    print_success "App configuration files found"
    
    # Extract app info
    APP_NAME=$(node -e "console.log(require('./app.json').expo.name)" 2>/dev/null || echo "Unknown")
    APP_VERSION=$(node -e "console.log(require('./app.json').expo.version)" 2>/dev/null || echo "Unknown")
    PACKAGE_NAME=$(node -e "console.log(require('./app.json').expo.android.package)" 2>/dev/null || echo "Unknown")
    
    print_info "App Name: $APP_NAME"
    print_info "Version: $APP_VERSION"
    print_info "Package: $PACKAGE_NAME"
else
    print_error "Missing app.json or eas.json"
fi

# Check for assets
print_info "Checking assets..."
if [ -f "assets/google-play/app-icon-512x512.png" ]; then
    print_success "App icon found"
else
    print_warning "App icon not found at assets/google-play/app-icon-512x512.png"
fi

if [ -f "assets/google-play/feature-graphic-1024x500-v2.jpg" ]; then
    print_success "Feature graphic found"
else
    print_warning "Feature graphic not found"
fi

# Generate initial metadata
print_info "Generating initial metadata..."
node scripts/store-listing-metadata.js generate >/dev/null 2>&1 || print_warning "Could not generate metadata"

# Show next steps
echo ""
print_header "Setup Complete!"
echo ""
print_success "Quick setup finished successfully!"
echo ""
print_info "Next steps:"
echo "1. 🔐 Setup Google Play credentials:"
echo "   npm run setup-playstore"
echo ""
echo "2. 🚀 Upload to Google Play Store:"
echo "   npm run upload-to-playstore"
echo ""
echo "3. 📱 Or upload to specific tracks:"
echo "   npm run upload-to-playstore-internal"
echo "   npm run upload-to-playstore-alpha"
echo "   npm run upload-to-playstore-beta"
echo "   npm run upload-to-playstore-production"
echo ""
print_info "Available commands:"
echo "   npm run setup-playstore          - Setup Google Play credentials"
echo "   npm run upload-to-playstore      - Full automated upload"
echo "   npm run generate-screenshots     - Generate screenshots only"
echo "   npm run generate-metadata        - Generate metadata only"
echo "   npm run validate-playstore-setup - Validate configuration"
echo ""
print_success "Happy publishing! 🚀"