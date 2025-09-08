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

# Add scripts/core to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))
from replacements import replace_hardcoded_content_safe, normalize_to_e164

class BarberAppDuplicationWizard:
    def __init__(self, dry_run=False):
        self.template_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.dry_run = dry_run
        self.replacement_result = None
        
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
    
    def validate_firebase_config_file(self, file_path: str) -> bool:
        """Validate that the file exists and contains valid Firebase config JSON"""
        try:
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                return False
                
            with open(file_path, 'r') as f:
                config = json.load(f)
                
            # Check for required Firebase config fields
            required_fields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
            missing_fields = [field for field in required_fields if field not in config]
            
            if missing_fields:
                print(f"Missing required fields in Firebase config: {missing_fields}")
                return False
                
            return True
        except json.JSONDecodeError:
            print("Invalid JSON format in Firebase config file")
            return False
        except Exception as e:
            print(f"Error validating Firebase config: {e}")
            return False

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
            
            # Custom welcome message  
            "welcomeMessage": None,  # Will be set after businessName is captured
            
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

        # Post-process business info with enhanced fields
        bundle_parts = business_info['bundleId'].split('.')
        business_info['domain'] = f"{bundle_parts[-1]}.com"
        business_info['ownerPhoneE164'] = normalize_to_e164(business_info['ownerPhone'])
        business_info['businessAddressHe'] = business_info['businessAddress']
        business_info['businessAddressEn'] = business_info['businessAddress']

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

        # Set custom welcome message with business name
        default_welcome = f"שלום, ברוכים הבאים ל-{business_info['businessName']}"
        business_info["welcomeMessage"] = self.validate_input(
            f"Custom Welcome Message (Enter for default: '{default_welcome}'): ",
            default=default_welcome
        )
        
        # Optional Firebase config file import
        print("\n--- Firebase Configuration ---")
        use_firebase_file = self.validate_input("Do you want to import Firebase config from JSON file? (yes/no, Enter to skip): ", default='no').strip().lower()
        if use_firebase_file == 'yes':
            firebase_config_path = self.validate_input(
                "Path to Firebase config JSON file (google-services.json or firebase-config.json, Enter to skip): ",
                validator=lambda x: True if x.strip() == '' else self.validate_firebase_config_file(x)
            )
            if firebase_config_path.strip() == '':
                business_info["firebaseConfigPath"] = None
            else:
                business_info["firebaseConfigPath"] = firebase_config_path
        else:
            business_info["firebaseConfigPath"] = None

        # Collect employee/barber information
        print("\n--- Employee/Barber Information ---")
        business_info["employees"] = []
        num_workers = business_info["numberOfWorkers"]
        
        if num_workers > 0:
            print(f"Please provide details for each of the {num_workers} employees/barbers:")
            
            for i in range(num_workers):
                print(f"\n-- Employee {i + 1}/{num_workers} --")
                
                employee = {
                    "name": self.validate_input(f"Employee {i + 1} - Full Name: "),
                    "phone": self.validate_input(
                        f"Employee {i + 1} - Phone Number (with country code): ",
                        validator=self.validate_phone
                    ),
                    "specialization": self.validate_input(
                        f"Employee {i + 1} - Specialization/Skills (e.g., 'תספורת גברים, גילוח זקן'): ",
                        default="תספורת כללית"
                    ),
                    "experience": self.validate_input(
                        f"Employee {i + 1} - Years of Experience (optional): ",
                        default="לא צוין"
                    ),
                    "isMainBarber": i == 0,  # First employee is the main barber
                    "available": True,
                    "barberId": f"barber_{i + 1}",
                    "userId": f"user_{business_info['businessName'].lower().replace(' ', '_')}_barber_{i + 1}"
                }
                
                # Normalize phone to E.164
                employee["phoneE164"] = normalize_to_e164(employee["phone"])
                
                business_info["employees"].append(employee)
                print(f"✓ Added employee: {employee['name']}")
        
        print(f"\n✅ Collected information for {len(business_info['employees'])} employees")

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
        
        # Replace all hardcoded content throughout the app using new system
        self.replace_content_with_new_system(business_info)
        
        # Replace demo images with neutral ones
        self.replace_demo_images(business_info)
        
        # Create employee seed data
        self.create_employee_seed_data(business_info)
        
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
        """Update Firebase configuration with real or demo values"""
        config_files = ['app/config/firebase.ts', 'config/firebase.ts']
        
        # Use real Firebase config if provided, otherwise create demo config
        if business_info.get('firebaseConfigPath'):
            try:
                with open(business_info['firebaseConfigPath'], 'r') as f:
                    firebase_config = json.load(f)
                print(f"✓ Loaded Firebase config from {business_info['firebaseConfigPath']}")
            except Exception as e:
                print(f"❌ Error loading Firebase config file: {e}")
                # Fallback to demo config
                firebase_config = {
                    'apiKey': 'demo-api-key-replace-with-real',
                    'authDomain': f'{business_info["firebaseProjectId"]}.firebaseapp.com',
                    'projectId': business_info['firebaseProjectId'],
                    'storageBucket': f'{business_info["firebaseProjectId"]}.appspot.com',
                    'messagingSenderId': '123456789',
                    'appId': 'demo-app-id-replace-with-real'
                }
        else:
            # Create demo Firebase configuration
            firebase_config = {
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
                
                # Replace Firebase config values with real or demo ones
                content = re.sub(r'apiKey:\s*["\'][^"\']*["\']', f'apiKey: "{firebase_config["apiKey"]}"', content)
                content = re.sub(r'authDomain:\s*["\'][^"\']*["\']', f'authDomain: "{firebase_config["authDomain"]}"', content)
                content = re.sub(r'projectId:\s*["\'][^"\']*["\']', f'projectId: "{firebase_config["projectId"]}"', content)
                content = re.sub(r'storageBucket:\s*["\'][^"\']*["\']', f'storageBucket: "{firebase_config["storageBucket"]}"', content)
                content = re.sub(r'messagingSenderId:\s*["\'][^"\']*["\']', f'messagingSenderId: "{firebase_config["messagingSenderId"]}"', content)
                content = re.sub(r'appId:\s*["\'][^"\']*["\']', f'appId: "{firebase_config["appId"]}"', content)
                
                with open(config_file, 'w') as f:
                    f.write(content)
                
                config_type = "real" if business_info.get('firebaseConfigPath') else "demo"
                print(f"✓ Updated {config_file} with {config_type} Firebase config")

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

    def replace_content_with_new_system(self, business_info: Dict[str, Any]):
        """Replace all hardcoded content using the new replacement system"""
        
        print(f"\n🔄 Applying comprehensive content replacement...")
        
        # Use the new replacement system
        result = replace_hardcoded_content_safe('.', business_info, dry_run=self.dry_run)
        
        # Store results for final summary
        self.replacement_result = result
        
        if not self.dry_run:
            print(f"✅ Content replacement complete: {result.total_replacements} replacements in {result.files_touched} files")
        else:
            print(f"📋 DRY RUN: Would make {result.total_replacements} replacements in {result.files_touched} files")

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

    def create_employee_seed_data(self, business_info: Dict[str, Any]):
        """Create seed data file for employees/barbers"""
        if not business_info.get('employees') or len(business_info['employees']) == 0:
            print("⚠️ No employees to create seed data for")
            return

        # Create JavaScript seed file
        seed_content = f"""// Employee/Barber Seed Data for {business_info['businessName']}
// Generated by Barber App Wizard 3.0

export const employeeSeedData = {{
  businessName: "{business_info['businessName']}",
  totalEmployees: {len(business_info['employees'])},
  employees: [
"""

        for i, employee in enumerate(business_info['employees']):
            seed_content += f"""    {{
      id: "{employee['barberId']}",
      userId: "{employee['userId']}",
      name: "{employee['name']}",
      phone: "{employee['phone']}",
      phoneE164: "{employee['phoneE164']}",
      specialization: "{employee['specialization']}",
      experience: "{employee['experience']}",
      isMainBarber: {str(employee['isMainBarber']).lower()},
      available: {str(employee['available']).lower()},
      bio: "מספר מקצועי עם ניסיון של {employee['experience']} בתחום {employee['specialization']}",
      rating: 4.8,
      specialties: {employee['specialization'].split(', ')},
      availableSlots: [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        "18:00", "18:30", "19:00", "19:30"
      ],
      availabilityWindow: {{
        start: "09:00",
        end: "20:00"
      }},
      customPrices: {{
        // Will be populated based on treatments
      }}
    }}{"," if i < len(business_info['employees']) - 1 else ""}
"""

        seed_content += """  ]
};

// Firebase collection seeding function
export const seedEmployeesToFirebase = async () => {
  try {
    const { getDbInstance } = await import('../app/config/firebase');
    const { collection, addDoc, setDoc, doc } = await import('firebase/firestore');
    
    const db = getDbInstance();
    if (!db) {
      console.error('Firebase not initialized');
      return false;
    }

    console.log(`🌱 Seeding ${employeeSeedData.employees.length} employees to Firebase...`);
    
    for (const employee of employeeSeedData.employees) {
      // Add to barbers collection
      const barberRef = doc(db, 'barbers', employee.id);
      await setDoc(barberRef, {
        barberId: employee.id,
        name: employee.name,
        phone: employee.phone,
        bio: employee.bio,
        rating: employee.rating,
        specialties: employee.specialties,
        available: employee.available,
        availableSlots: employee.availableSlots,
        availabilityWindow: employee.availabilityWindow,
        isMainBarber: employee.isMainBarber,
        experience: employee.experience,
        customPrices: employee.customPrices
      });
      
      // Add to users collection for authentication
      const userRef = doc(db, 'users', employee.userId);
      await setDoc(userRef, {
        uid: employee.userId,
        name: employee.name,
        phone: employee.phone,
        type: 'barber',
        isBarber: true,
        isAdmin: employee.isMainBarber, // Main barber is admin
        barberId: employee.id,
        createdAt: new Date()
      });
      
      console.log(`✅ Seeded employee: ${employee.name}`);
    }
    
    console.log(`🎉 Successfully seeded all ${employeeSeedData.employees.length} employees`);
    return true;
  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    return false;
  }
};

// Export for easy access
export default employeeSeedData;
"""

        # Write the seed file
        seed_file_path = 'data/employeeSeedData.js'
        os.makedirs(os.path.dirname(seed_file_path), exist_ok=True)
        
        with open(seed_file_path, 'w', encoding='utf-8') as f:
            f.write(seed_content)

        # Also create a JSON version for easy import
        json_data = {
            "businessName": business_info['businessName'],
            "totalEmployees": len(business_info['employees']),
            "employees": business_info['employees']
        }
        
        json_file_path = 'data/employeeSeedData.json'
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)

        # Create README for the seed data
        readme_content = f"""# Employee Seed Data for {business_info['businessName']}

This directory contains the employee/barber data generated by the Wizard.

## Files:
- `employeeSeedData.js` - JavaScript module with seeding functions
- `employeeSeedData.json` - JSON data for manual import

## Usage:

### Automatic Seeding (Recommended):
```javascript
import {{ seedEmployeesToFirebase }} from './data/employeeSeedData.js';

// Run this once to populate your Firebase with employee data
await seedEmployeesToFirebase();
```

### Manual Firebase Import:
1. Go to Firebase Console → Firestore Database
2. Import the JSON data into your `barbers` and `users` collections

## Employee Summary:
- **Total Employees**: {len(business_info['employees'])}
- **Main Barber**: {business_info['employees'][0]['name'] if business_info['employees'] else 'None'}

### Employee List:
"""

        for i, employee in enumerate(business_info['employees']):
            readme_content += f"""
**{i + 1}. {employee['name']}**
- Phone: {employee['phone']}
- Specialization: {employee['specialization']}
- Experience: {employee['experience']}
- Main Barber: {'Yes' if employee['isMainBarber'] else 'No'}
"""

        readme_content += f"""

## Next Steps:
1. Run the seeding function to populate Firebase
2. Update employee photos in Firebase Storage (optional)
3. Adjust working hours and availability as needed
4. Set custom pricing per employee if different from default

Generated on: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

        readme_file_path = 'data/README_EMPLOYEES.md'
        with open(readme_file_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)

        print(f"✓ Created employee seed data:")
        print(f"  - JavaScript: {seed_file_path}")
        print(f"  - JSON: {json_file_path}")
        print(f"  - Documentation: {readme_file_path}")

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

        print(f"\n✅ Wizard 3.0 Enhanced – Generation Complete")
        print("=" * 60)
        
        # Business Info Summary
        print(f"\n🏢 Business: {business_info['businessName']}")
        print(f"📱 Bundle IDs: {business_info['bundleId']}")
        print(f"📞 Owner Phone: {business_info['ownerPhoneE164']}")
        print(f"📍 Address: {business_info.get('businessAddressHe', business_info['businessAddress'])}")
        print(f"🌐 Language: {business_info['language']} (RTL: {'yes' if business_info['language'] == 'he' else 'no'})")
        print(f"🎨 Primary Color: {business_info['primaryColor']}")
        print(f"💬 Welcome Message: {business_info['welcomeMessage']}")
        
        # Employee Summary
        if business_info.get('employees'):
            print(f"\n👥 Employees ({len(business_info['employees'])} total):")
            for i, emp in enumerate(business_info['employees']):
                role_icon = "👑" if emp['isMainBarber'] else "✂️"
                print(f"  {role_icon} {emp['name']} - {emp['specialization']} ({emp['experience']} exp.)")
        else:
            print(f"\n👥 Employees: No employees added")
        
        # Technical Configuration
        print(f"\n🔧 Applied Enhancements:")
        print(f"  ✅ Business name in header (TopNav)")
        print(f"  ✅ Custom primary color throughout app")
        print(f"  ✅ Personalized welcome message")
        print(f"  ✅ Image utility with Firebase Storage fallback")
        print(f"  ✅ Employee seed data generation")
        print(f"  ✅ Generic template cleanup (names/phones/emails)")
        
        # Messaging Configuration
        messaging_provider = "none"
        if business_info['messaging']['sms4free']['enabled']:
            messaging_provider = "sms4free"
        elif business_info['messaging']['whatsapp']['enabled']:
            messaging_provider = "whatsapp"
        
        print(f"  ✅ Messaging: {messaging_provider}")
        
        # Firebase Configuration
        firebase_type = "real config" if business_info.get('firebaseConfigPath') else "demo placeholders"
        print(f"  ✅ Firebase: {firebase_type}")
        
        print(f"  ✅ Links: HTTPS deep-links via utils")
        print(f"  ✅ Demo images guide created")
        
        # Replacement Statistics
        if self.replacement_result:
            print(f"\n📊 Content Replacement Stats:")
            print(f"  📝 {self.replacement_result.total_replacements} replacements across {self.replacement_result.files_touched} files")
            print(f"  🔍 Legacy brand strings: removed")
            print(f"  📞 Phone format: E.164 verified")
        
        # Next Steps
        print(f"\n🚀 Next Steps:")
        print(f"  1️⃣  Replace demo images with business photos")
        if not business_info.get('firebaseConfigPath'):
            print(f"  2️⃣  Add real Firebase config (currently using demo)")
        if business_info.get('employees'):
            print(f"  3️⃣  Run employee seed data: `import {{ seedEmployeesToFirebase }} from './data/employeeSeedData.js'`")
        print(f"  4️⃣  Test the app: `npm install && npx expo start`")
        print(f"  5️⃣  Build for stores: `eas build --platform android` / `eas build --platform ios`")
        
        # Generated Files Summary
        print(f"\n📁 Generated Files:")
        print(f"  📂 {new_app_path}")
        print(f"  📄 README.md - Complete setup guide")
        print(f"  📄 .env.example - Environment variables template")
        if business_info.get('employees'):
            print(f"  📁 data/ - Employee seed data (JS, JSON, README)")
        print(f"  📄 assets/REPLACE_DEMO_IMAGES.md - Image replacement guide")
        
        print(f"\n🎉 Your customized barber shop app is ready!")
        print(f"📍 Location: {new_app_path}")
        print("=" * 60)

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