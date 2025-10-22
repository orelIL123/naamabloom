#!/bin/bash

# Barbers Bar - Google Play Store Upload Script
# This script automates the complete process of building and uploading the app to Google Play Store

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Barbers Bar"
PACKAGE_NAME="com.barbersbar.app"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TRACK="${1:-internal}"  # Default to internal track

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check for required tools
    if ! command_exists "node"; then
        missing_tools+=("node")
    fi
    
    if ! command_exists "npm"; then
        missing_tools+=("npm")
    fi
    
    if ! command_exists "eas"; then
        missing_tools+=("eas-cli")
    fi
    
    if ! command_exists "git"; then
        missing_tools+=("git")
    fi
    
    # Check for required files
    if [ ! -f "$PROJECT_ROOT/google-play-credentials.json" ]; then
        print_error "Google Play credentials file not found!"
        print_info "Run: npm run setup-playstore"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/app.json" ]; then
        print_error "app.json not found!"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/eas.json" ]; then
        print_error "eas.json not found!"
        exit 1
    fi
    
    # Report missing tools
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_info "Please install the missing tools and try again"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Function to setup environment
setup_environment() {
    print_header "Setting up Environment"
    
    cd "$PROJECT_ROOT"
    
    # Check if logged into EAS
    if ! eas whoami >/dev/null 2>&1; then
        print_warning "Not logged into EAS. Please log in:"
        eas login
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
    
    # Install Google Play automation dependencies
    print_info "Installing Google Play automation dependencies..."
    npm install googleapis google-auth-library axios form-data sharp --save-dev
    
    print_success "Environment setup complete"
}

# Function to validate app configuration
validate_app_config() {
    print_header "Validating App Configuration"
    
    # Check version numbers
    local version=$(node -e "console.log(require('./app.json').expo.version)")
    local version_code=$(node -e "console.log(require('./app.json').expo.android.versionCode)")
    
    print_info "App Version: $version"
    print_info "Version Code: $version_code"
    print_info "Package Name: $PACKAGE_NAME"
    print_info "Release Track: $TRACK"
    
    # Validate Firebase configuration
    if [ ! -f "app/google-services.json" ]; then
        print_warning "google-services.json not found in app directory"
    fi
    
    print_success "App configuration validated"
}

# Function to prepare for build
prepare_build() {
    print_header "Preparing for Build"
    
    # Clean previous builds
    print_info "Cleaning previous builds..."
    rm -rf build/
    mkdir -p build/
    
    # Clear Expo cache
    print_info "Clearing Expo cache..."
    npx expo install --fix
    
    print_success "Build preparation complete"
}

# Function to run pre-upload checks
run_pre_upload_checks() {
    print_header "Running Pre-Upload Checks"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes. Consider committing them before upload."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Upload cancelled by user"
            exit 0
        fi
    fi
    
    # Validate privacy policy and terms
    if [ -f "privacy-policy.html" ] && [ -f "terms-of-service.html" ]; then
        print_success "Privacy policy and terms of service files found"
    else
        print_warning "Privacy policy or terms of service files not found"
    fi
    
    # Check for required assets
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
    
    print_success "Pre-upload checks complete"
}

# Function to show upload summary
show_upload_summary() {
    print_header "Upload Summary"
    
    echo -e "${BLUE}App Name:${NC} $APP_NAME"
    echo -e "${BLUE}Package:${NC} $PACKAGE_NAME"
    echo -e "${BLUE}Track:${NC} $TRACK"
    echo -e "${BLUE}Version:${NC} $(node -e "console.log(require('./app.json').expo.version)")"
    echo -e "${BLUE}Version Code:${NC} $(node -e "console.log(require('./app.json').expo.android.versionCode)")"
    echo ""
    echo -e "${BLUE}What will be uploaded:${NC}"
    echo "  ✓ Android App Bundle (AAB)"
    echo "  ✓ Store listing (Hebrew & English)"
    echo "  ✓ App descriptions and metadata"
    echo "  ✓ Screenshots (auto-generated)"
    echo "  ✓ App icon and feature graphic"
    echo "  ✓ Privacy policy and terms of service"
    echo ""
    
    read -p "Proceed with upload? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Upload cancelled by user"
        exit 0
    fi
}

# Function to run the automated upload
run_automated_upload() {
    print_header "Starting Automated Upload"
    
    print_info "Executing Google Play automation server..."
    
    # Run the automation server
    if node mcp/google-play-automation-server.js upload "$TRACK"; then
        print_success "Upload completed successfully!"
        return 0
    else
        print_error "Upload failed!"
        return 1
    fi
}

# Function to show post-upload instructions
show_post_upload_instructions() {
    print_header "Upload Complete!"
    
    echo -e "${GREEN}🎉 Your app has been successfully uploaded to Google Play Store!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. 🌐 Go to Google Play Console: https://play.google.com/console/"
    echo "2. 📱 Navigate to your app: $APP_NAME"
    echo "3. 🔍 Review the uploaded content:"
    echo "   - App bundle and metadata"
    echo "   - Store listing in Hebrew and English"
    echo "   - Screenshots and graphics"
    echo "   - Privacy policy and terms"
    echo "4. 🚀 Submit for review when ready"
    echo "5. 📈 Monitor the review process"
    echo ""
    echo -e "${BLUE}Track promotion:${NC}"
    echo "- Current track: $TRACK"
    echo "- To promote to production: Update track in Google Play Console"
    echo ""
    echo -e "${BLUE}App details:${NC}"
    echo "- Package: $PACKAGE_NAME"
    echo "- Version: $(node -e "console.log(require('./app.json').expo.version)")"
    echo "- Version Code: $(node -e "console.log(require('./app.json').expo.android.versionCode)")"
    echo ""
    print_success "Happy publishing! 🚀"
}

# Function to handle errors
handle_error() {
    print_error "An error occurred during the upload process"
    echo ""
    echo -e "${BLUE}Common solutions:${NC}"
    echo "1. Check your Google Play Console permissions"
    echo "2. Verify your service account credentials"
    echo "3. Ensure your app is properly configured in Google Play Console"
    echo "4. Check the error logs above for specific issues"
    echo ""
    echo -e "${BLUE}For help:${NC}"
    echo "- Review the setup documentation"
    echo "- Check Google Play Console for any issues"
    echo "- Verify your credentials with: npm run setup-playstore"
    echo ""
    exit 1
}

# Main execution
main() {
    print_header "Barbers Bar - Google Play Store Upload"
    echo -e "${BLUE}Automating the complete upload process...${NC}"
    echo ""
    
    # Set error handler
    trap 'handle_error' ERR
    
    # Run all steps
    check_prerequisites
    setup_environment
    validate_app_config
    prepare_build
    run_pre_upload_checks
    show_upload_summary
    
    # Run the upload
    if run_automated_upload; then
        show_post_upload_instructions
    else
        handle_error
    fi
}

# Help function
show_help() {
    echo "Barbers Bar - Google Play Store Upload Script"
    echo ""
    echo "Usage: $0 [TRACK]"
    echo ""
    echo "TRACK options:"
    echo "  internal  - Internal testing (default)"
    echo "  alpha     - Alpha testing"
    echo "  beta      - Beta testing"  
    echo "  production - Production release"
    echo ""
    echo "Examples:"
    echo "  $0                 # Upload to internal track"
    echo "  $0 internal        # Upload to internal track"
    echo "  $0 alpha           # Upload to alpha track"
    echo "  $0 beta            # Upload to beta track"
    echo "  $0 production      # Upload to production track"
    echo ""
    echo "Prerequisites:"
    echo "- Run 'npm run setup-playstore' first"
    echo "- Ensure you're logged into EAS CLI"
    echo "- Have Google Play Console access configured"
}

# Check for help flag
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Validate track parameter
case "$TRACK" in
    internal|alpha|beta|production)
        # Valid track
        ;;
    *)
        print_error "Invalid track: $TRACK"
        echo ""
        show_help
        exit 1
        ;;
esac

# Run main function
main