#!/usr/bin/env python3
import os
import re
import json
import shutil
import subprocess
import uuid
import sys
import argparse
from typing import Dict, Any

class BarberAppDuplicationWizard:
    def __init__(self, dry_run=False):
        self.template_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.dry_run = dry_run
        
    def validate_input(self, prompt: str, validator=None, default=None) -> str:
        while True:
            value = input(prompt).strip()
            if not value and default is not None:
                return default
            if validator is None or validator(value):
                return value
            print("Invalid input. Please try again.")

    def validate_email(self, email: str) -> bool:
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_regex, email) is not None

    def validate_phone(self, phone: str) -> bool:
        # Basic phone number validation (adjust regex as needed)
        phone_regex = r'^\+?1?\d{9,15}$'
        return re.match(phone_regex, phone) is not None

    def validate_bundle_id(self, bundle_id: str) -> bool:
        # Validate iOS/Android bundle ID format
        bundle_id_regex = r'^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$'
        return re.match(bundle_id_regex, bundle_id) is not None

    def validate_hex_color(self, color: str) -> bool:
        color_regex = r'^#(?:[0-9a-fA-F]{3}){1,2}$'
        return re.match(color_regex, color) is not None

    def collect_business_info(self) -> Dict[str, Any]:
        print("\n--- Barber App Customization Wizard 3.0 ---")
        print("Simple App Configuration\n")

        # Validate number of workers/barbers
        def validate_workers(value: str) -> bool:
            try:
                num_workers = int(value)
                return 1 <= num_workers <= 50
            except ValueError:
                return False

        business_info = {
            "businessName": self.validate_input("Enter Business Name: "),
            "ownerName": self.validate_input("Enter Owner's Full Name: "),
            "ownerEmail": self.validate_input(
                "Enter Owner's Email: ", 
                validator=self.validate_email
            ),
            "ownerPhone": self.validate_input(
                "Enter Owner's Phone Number (with country code): ", 
                validator=self.validate_phone
            ),
            "businessAddress": self.validate_input("Business Address (for Waze/Maps): "),
            "numberOfWorkers": int(self.validate_input(
                "Number of Barbers/Workers (1-50): ", 
                validator=validate_workers
            )),
            "serviceTypes": self.validate_input("List Services (comma-separated): ").split(','),
            "primaryColor": self.validate_input(
                "Primary Brand Color (hex, e.g., #000000): ", 
                validator=self.validate_hex_color
            ),
            "language": self.validate_input("Primary Language (en/he): ", default='he'),
            "appName": self.validate_input("App Display Name: "),
            "bundleId": self.validate_input(
                "Unique Bundle ID (e.g., com.yourcompany.barbershop): ", 
                validator=self.validate_bundle_id
            ),
            
            # SMS Configuration
            "messaging": {
                "sms4free": {
                    "enabled": self.validate_input("Enable SMS4Free notifications? (yes/no): ").lower() == 'yes',
                    "user": "",
                    "pass": "",
                    "apiKey": "",
                    "sender": ""
                },
                "whatsapp": {
                    "enabled": self.validate_input("Enable WhatsApp notifications? (yes/no): ").lower() == 'yes',
                    "phoneNumberId": "",
                    "accessToken": ""
                }
            },
            
            "firebaseProjectId": str(uuid.uuid4()).replace('-', '')[:8]  # Shorter project ID
        }

        # Collect SMS credentials if enabled
        if business_info["messaging"]["sms4free"]["enabled"]:
            print("\n--- SMS4Free Configuration ---")
            business_info["messaging"]["sms4free"]["user"] = self.validate_input("SMS4Free Username: ")
            business_info["messaging"]["sms4free"]["pass"] = self.validate_input("SMS4Free Password: ")
            business_info["messaging"]["sms4free"]["apiKey"] = self.validate_input("SMS4Free API Key: ")
            business_info["messaging"]["sms4free"]["sender"] = self.validate_input("SMS Sender Name: ")

        # Collect WhatsApp credentials if enabled
        if business_info["messaging"]["whatsapp"]["enabled"]:
            print("\n--- WhatsApp Configuration ---")
            business_info["messaging"]["whatsapp"]["phoneNumberId"] = self.validate_input("WhatsApp Phone Number ID: ")
            business_info["messaging"]["whatsapp"]["accessToken"] = self.validate_input("WhatsApp Access Token: ")

        return business_info

    def update_configuration_files(self, business_info: Dict[str, Any]):
        """Update all configuration files with business-specific information"""
        
        # Update app.json
        self.update_app_json(business_info)
        
        # Update package.json
        self.update_package_json(business_info)
        
        # Update Firebase configuration
        self.update_firebase_config(business_info)
        
        # Update colors and theming
        self.update_theme_colors(business_info)
        
        # Update messaging configuration
        self.update_messaging_config(business_info)
        
        # Replace all hardcoded content throughout the app
        self.replace_hardcoded_content(business_info)
        
        # Replace demo images with neutral ones
        self.replace_demo_images(business_info)
        
        # Update environment variables
        self.update_env_files(business_info)
        
        # Update EAS configuration
        self.update_eas_config(business_info)

    def update_app_json(self, business_info: Dict[str, Any]):
        """Update app.json with business-specific configuration"""
        app_json_path = 'app.json'
        
        if os.path.exists(app_json_path):
            with open(app_json_path, 'r') as f:
                app_config = json.load(f)
            
            # Update expo configuration
            app_config['expo']['name'] = business_info['appName']
            app_config['expo']['slug'] = business_info['bundleId'].split('.')[-1]
            
            # iOS configuration
            if 'ios' not in app_config['expo']:
                app_config['expo']['ios'] = {}
            app_config['expo']['ios']['bundleIdentifier'] = business_info['bundleId']
            
            # Android configuration  
            if 'android' not in app_config['expo']:
                app_config['expo']['android'] = {}
            app_config['expo']['android']['package'] = business_info['bundleId']
            
            # Update colors
            if 'splash' not in app_config['expo']:
                app_config['expo']['splash'] = {}
            app_config['expo']['splash']['backgroundColor'] = business_info['primaryColor']
            
            with open(app_json_path, 'w') as f:
                json.dump(app_config, f, indent=2)
            
            print(f"✓ Updated app.json with {business_info['appName']}")

    def update_package_json(self, business_info: Dict[str, Any]):
        """Update package.json with business information"""
        package_json_path = 'package.json'
        
        if os.path.exists(package_json_path):
            with open(package_json_path, 'r') as f:
                package_config = json.load(f)
            
            package_config['name'] = business_info['bundleId'].split('.')[-1]
            package_config['description'] = f"{business_info['businessName']} - Barber Shop Booking App"
            
            with open(package_json_path, 'w') as f:
                json.dump(package_config, f, indent=2)
            
            print(f"✓ Updated package.json")

    def update_firebase_config(self, business_info: Dict[str, Any]):
        """Update Firebase configuration with demo/placeholder values"""
        config_files = ['app/config/firebase.ts', 'config/firebase.ts']
        
        # Create demo Firebase configuration
        demo_config = {
            'apiKey': 'demo-api-key-replace-with-real',
            'authDomain': f'{business_info["firebaseProjectId"]}.firebaseapp.com',
            'projectId': business_info['firebaseProjectId'],
            'storageBucket': f'{business_info["firebaseProjectId"]}.appspot.com',
            'messagingSenderId': '123456789',
            'appId': 'demo-app-id-replace-with-real'
        }
        
        for config_file in config_files:
            if os.path.exists(config_file):
                with open(config_file, 'r') as f:
                    content = f.read()
                
                # Replace Firebase config values with demo ones
                content = re.sub(r'apiKey:\s*["\'][^"\']*["\']', f'apiKey: "{demo_config["apiKey"]}"', content)
                content = re.sub(r'authDomain:\s*["\'][^"\']*["\']', f'authDomain: "{demo_config["authDomain"]}"', content)
                content = re.sub(r'projectId:\s*["\'][^"\']*["\']', f'projectId: "{demo_config["projectId"]}"', content)
                content = re.sub(r'storageBucket:\s*["\'][^"\']*["\']', f'storageBucket: "{demo_config["storageBucket"]}"', content)
                content = re.sub(r'messagingSenderId:\s*["\'][^"\']*["\']', f'messagingSenderId: "{demo_config["messagingSenderId"]}"', content)
                content = re.sub(r'appId:\s*["\'][^"\']*["\']', f'appId: "{demo_config["appId"]}"', content)
                
                with open(config_file, 'w') as f:
                    f.write(content)
                
                print(f"✓ Updated {config_file} with demo Firebase config")

    def update_theme_colors(self, business_info: Dict[str, Any]):
        """Update theme colors in configuration files"""
        tailwind_config_path = 'tailwind.config.js'
        
        if os.path.exists(tailwind_config_path):
            with open(tailwind_config_path, 'r') as f:
                content = f.read()
            
            # Update primary color only
            content = re.sub(
                r"primary:\s*['\"]#[0-9a-fA-F]{6}['\"]",
                f"primary: '{business_info['primaryColor']}'",
                content
            )
            
            with open(tailwind_config_path, 'w') as f:
                f.write(content)
            
            print(f"✓ Updated theme colors")

    def update_env_files(self, business_info: Dict[str, Any]):
        """Create environment configuration file"""
        env_content = f"""# {business_info['businessName']} Configuration
FIREBASE_PROJECT_ID={business_info['firebaseProjectId']}
BUSINESS_NAME={business_info['businessName']}
OWNER_EMAIL={business_info['ownerEmail']}
OWNER_PHONE={business_info['ownerPhone']}
BUSINESS_ADDRESS={business_info['businessAddress']}
PRIMARY_LANGUAGE={business_info['language']}
NUMBER_OF_WORKERS={business_info['numberOfWorkers']}

# SMS4Free Configuration
SMS4FREE_ENABLED={str(business_info['messaging']['sms4free']['enabled']).lower()}
SMS4FREE_USER={business_info['messaging']['sms4free']['user']}
SMS4FREE_PASS={business_info['messaging']['sms4free']['pass']}
SMS4FREE_API_KEY={business_info['messaging']['sms4free']['apiKey']}
SMS4FREE_SENDER={business_info['messaging']['sms4free']['sender']}

# WhatsApp Configuration  
WHATSAPP_ENABLED={str(business_info['messaging']['whatsapp']['enabled']).lower()}
WHATSAPP_PHONE_NUMBER_ID={business_info['messaging']['whatsapp']['phoneNumberId']}
WHATSAPP_ACCESS_TOKEN={business_info['messaging']['whatsapp']['accessToken']}
"""
        
        with open('.env.example', 'w') as f:
            f.write(env_content)
        
        print(f"✓ Created .env.example file")

    def update_messaging_config(self, business_info: Dict[str, Any]):
        """Update messaging configuration"""
        config_path = 'config/messaging.ts'
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                content = f.read()
            
            # Update default provider based on what's enabled
            if business_info["messaging"]["sms4free"]["enabled"]:
                content = re.sub(
                    r"defaultProvider:\s*['\"][^'\"]*['\"]",
                    "defaultProvider: 'sms4free'",
                    content
                )
            elif business_info["messaging"]["whatsapp"]["enabled"]:
                content = re.sub(
                    r"defaultProvider:\s*['\"][^'\"]*['\"]",
                    "defaultProvider: 'whatsapp'",
                    content
                )
            
            with open(config_path, 'w') as f:
                f.write(content)
            
            print(f"✓ Updated messaging configuration")

    def update_eas_config(self, business_info: Dict[str, Any]):
        """Update EAS build configuration"""
        eas_json_path = 'eas.json'
        
        if os.path.exists(eas_json_path):
            with open(eas_json_path, 'r') as f:
                eas_config = json.load(f)
            
            # Update bundle identifiers in build profiles
            for profile_name, profile in eas_config.get('build', {}).items():
                if 'ios' in profile and 'bundleIdentifier' in profile['ios']:
                    profile['ios']['bundleIdentifier'] = business_info['bundleId']
                if 'android' in profile and 'package' in profile['android']:
                    profile['android']['package'] = business_info['bundleId']
            
            with open(eas_json_path, 'w') as f:
                json.dump(eas_config, f, indent=2)
            
            print(f"✓ Updated EAS configuration")

    def replace_hardcoded_content(self, business_info: Dict[str, Any]):
        """Replace all hardcoded content throughout the app"""
        
        # Generate business-specific values
        business_email = f"info@{business_info['bundleId'].split('.')[-1]}.com"
        support_email = f"support@{business_info['bundleId'].split('.')[-1]}.com"
        
        # Files to update with content replacement
        files_to_update = [
            'constants/contactInfo.ts',
            'app/screens/HomeScreen.tsx', 
            'app/screens/SettingsScreen.tsx',
            'app/i18n/locales/he.json',
            'app/i18n/locales/en.json',
            'app/(tabs)/explore-client.tsx',
            'services/firebase.ts'
        ]
        
        for file_path in files_to_update:
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace phone numbers
                content = re.sub(r'\+9720548353232', business_info['ownerPhone'], content)
                content = re.sub(r'\+972523985505', business_info['ownerPhone'], content)
                
                # Replace addresses
                content = re.sub(r'רפיח ים 13[^"\']*', business_info['businessAddress'], content)
                content = re.sub(r'נתיבות נווה שרון 1', business_info['businessAddress'], content)
                content = re.sub(r'Netivot rafiah yam 1', business_info['businessAddress'], content)
                
                # Replace emails
                content = re.sub(r'info@barbersbar\.co(?:m|\.il)', business_email, content)
                content = re.sub(r'support@barbersbar\.co(?:m|\.il)', support_email, content)
                
                # Replace business names
                content = re.sub(r'Barbersbar', business_info['businessName'], content)
                content = re.sub(r'ברבר בר', business_info['businessName'], content)
                content = re.sub(r'Barber Shop', business_info['businessName'], content)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
        
        print(f"✓ Replaced all hardcoded content with {business_info['businessName']} info")

    def replace_demo_images(self, business_info: Dict[str, Any]):
        """Replace demo images with neutral placeholder images"""
        
        # Create placeholder images info file
        placeholder_info = f"""# Demo Images - Replace with Real Business Images

This app was created with placeholder images. 

## Images to Replace:

### Gallery Images
- assets/images/ATMOSPHERE.jpg - Replace with your barbershop interior
- assets/images/ATMOSPHERE2.jpg - Replace with your barbershop exterior  

### Icons and Branding
- assets/images/icon.png - Replace with your business logo
- assets/images/adaptive-icon.png - Replace with your business logo
- assets/images/splash.png - Replace with your splash screen

### Google Play Store Assets  
- assets/google-play/app-icon-512x512.png - Your app icon for store
- assets/google-play/feature-graphic-1024x500-v2.jpg - Your store banner

## Instructions:
1. Replace these files with your business images
2. Keep the same file names and dimensions
3. Update your Firebase project with new images if needed

Business: {business_info['businessName']}
Created: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        with open('assets/REPLACE_DEMO_IMAGES.md', 'w') as f:
            f.write(placeholder_info)
        
        print(f"✓ Created demo images replacement guide")

    def create_new_app_instance(self, business_info: Dict[str, Any]):
        # Generate a unique project name
        project_name = re.sub(r'\W+', '-', business_info['businessName'].lower())
        desktop_path = os.path.expanduser('~/Desktop')
        new_app_path = os.path.join(desktop_path, f'{project_name}-barbershop')

        # Copy template to new location
        shutil.copytree(self.template_path, new_app_path, symlinks=False, ignore=None)

        # Update configuration files in the new instance
        os.chdir(new_app_path)
        self.update_configuration_files(business_info)

        # Simple README with essential information
        readme_content = f"""# {business_info['businessName']} - Barber Shop App

## App Configuration

### Business Details
- **Business**: {business_info['businessName']}
- **Owner**: {business_info['ownerName']}
- **Email**: {business_info['ownerEmail']}
- **Phone**: {business_info['ownerPhone']}
- **Address**: {business_info['businessAddress']}

### App Info
- **App Name**: {business_info['appName']}
- **Bundle ID**: {business_info['bundleId']}
- **Firebase Project**: {business_info['firebaseProjectId']}
- **Language**: {business_info['language']}
- **Workers**: {business_info['numberOfWorkers']}

### Services
{chr(10).join([f"- {service.strip()}" for service in business_info['serviceTypes']])}

### Messaging Setup
- **SMS4Free**: {'✅ Enabled' if business_info['messaging']['sms4free']['enabled'] else '❌ Disabled'}
- **WhatsApp**: {'✅ Enabled' if business_info['messaging']['whatsapp']['enabled'] else '❌ Disabled'}

## Quick Setup

1. **Firebase Setup**
   ```bash
   # Create Firebase project: {business_info['firebaseProjectId']}
   # Add your google-services.json and GoogleService-Info.plist
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Build & Deploy**
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

## Environment Variables
Check `.env.example` for all required environment variables including:
- Firebase configuration
- SMS4Free credentials (if enabled)  
- WhatsApp API credentials (if enabled)

## Contact
{business_info['ownerName']} - {business_info['ownerEmail']}
"""
        
        readme_path = os.path.join(new_app_path, 'README.md')
        with open(readme_path, 'w') as f:
            f.write(readme_content)

        print(f"\n🎉 {business_info['businessName']} App Created!")
        print(f"📁 Location: {new_app_path}")
        print(f"📱 Bundle ID: {business_info['bundleId']}")
        print(f"🔥 Firebase: {business_info['firebaseProjectId']} (demo config)")
        
        print(f"\n✅ Personalized Content:")
        print(f"  📱 Business Name: {business_info['businessName']} (replaced everywhere)")
        print(f"  📞 Phone: {business_info['ownerPhone']} (replaced in all screens)")
        print(f"  📍 Address: {business_info['businessAddress']} (updated throughout)")
        print(f"  ✉️  Email: info@{business_info['bundleId'].split('.')[-1]}.com (auto-generated)")
        
        if business_info['messaging']['sms4free']['enabled'] or business_info['messaging']['whatsapp']['enabled']:
            print(f"\n📲 Messaging Configured:")
            if business_info['messaging']['sms4free']['enabled']:
                print(f"  ✅ SMS4Free ({business_info['messaging']['sms4free']['sender']})")
            if business_info['messaging']['whatsapp']['enabled']:
                print("  ✅ WhatsApp Business API")
        
        print(f"\n📸 Images: Check assets/REPLACE_DEMO_IMAGES.md for image replacement guide")
        print(f"📖 Next: Check README.md in the new app folder")
        print(f"🚀 Ready to: npm install && eas build")
        print(f"🔥 Firebase: Replace demo config with your real Firebase project")

    def run(self):
        try:
            if self.dry_run:
                print("🔍 DRY RUN MODE - No files will be created or modified\n")
            
            business_info = self.collect_business_info()
            
            if self.dry_run:
                print("\n--- DRY RUN SUMMARY ---")
                print(f"Would create app for: {business_info['businessName']}")
                print(f"Bundle ID: {business_info['bundleId']}")
                print(f"Firebase Project: {business_info['firebaseProjectId']}")
                desktop_path = os.path.expanduser('~/Desktop')
                print(f"Target directory: {os.path.join(desktop_path, re.sub(r'\\W+', '-', business_info['businessName'].lower()) + '-barbershop')}")
                return
                
            self.create_new_app_instance(business_info)
            
        except KeyboardInterrupt:
            print("\n\n❌ Setup cancelled by user")
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Error during setup: {str(e)}")
            sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Barber App Duplication Wizard 3.0 - Simple & Fast')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Preview the configuration without creating files')
    parser.add_argument('--version', action='version', version='Barber App Wizard 3.0')
    
    args = parser.parse_args()
    
    wizard = BarberAppDuplicationWizard(dry_run=args.dry_run)
    wizard.run()

if __name__ == '__main__':
    main()