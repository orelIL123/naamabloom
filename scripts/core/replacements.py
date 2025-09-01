#!/usr/bin/env python3
"""
Generic template content replacement system.
Handles systematic replacement of hardcoded content throughout the app.
"""

import os
import re
import glob
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass
import difflib

@dataclass
class ReplacementResult:
    """Result of a content replacement operation"""
    files_touched: int = 0
    total_replacements: int = 0
    files_with_changes: List[str] = None
    
    def __post_init__(self):
        if self.files_with_changes is None:
            self.files_with_changes = []

def normalize_to_e164(phone: str, default_country: str = "IL") -> str:
    """Normalize phone number to E.164 format"""
    # Remove all non-digits
    digits = re.sub(r'\D', '', phone)
    
    # Handle Israeli numbers
    if default_country == "IL":
        if digits.startswith("972"):
            return f"+{digits}"
        elif digits.startswith("0"):
            return f"+972{digits[1:]}"
        else:
            return f"+972{digits}"
    
    # For other countries, assume it's already formatted or add +
    if not digits.startswith('+'):
        return f"+{digits}"
    return digits

def iter_files(root: str, extensions: Set[str] = None) -> List[str]:
    """
    Recursively find files with specified extensions, excluding build directories.
    """
    if extensions is None:
        extensions = {'.ts', '.tsx', '.js', '.jsx', '.json', '.md'}
    
    exclude_dirs = {
        'node_modules', '.git', '.expo', 'android', 'ios', 
        'build', 'dist', '.next', 'coverage', '__pycache__'
    }
    
    found_files = []
    
    for root_dir, dirs, files in os.walk(root):
        # Remove excluded directories from dirs list to prevent walking into them
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        for file in files:
            file_path = os.path.join(root_dir, file)
            _, ext = os.path.splitext(file)
            
            if ext.lower() in extensions:
                # Convert to relative path
                rel_path = os.path.relpath(file_path, root)
                found_files.append(rel_path)
    
    return sorted(found_files)

def generate_replacements(business_info: Dict) -> Dict[str, str]:
    """
    Generate comprehensive replacement mappings based on business info.
    Returns dict of {pattern: replacement_value}
    """
    
    # Extract domain from bundleId for email generation
    bundle_parts = business_info.get('bundleId', 'com.example.app').split('.')
    domain = business_info.get('domain', f"{bundle_parts[-1]}.com")
    
    # Normalize phone to E.164
    owner_phone_e164 = normalize_to_e164(business_info.get('ownerPhone', ''))
    
    # Business addresses (Hebrew and English fallbacks)
    business_address_he = business_info.get('businessAddressHe', business_info.get('businessAddress', 'כתובת העסק'))
    business_address_en = business_info.get('businessAddressEn', business_info.get('businessAddress', 'Business Address'))
    
    replacements = {
        # Business names - comprehensive patterns
        r'\bBarbersbar\b': business_info.get('businessName', 'Business Name'),
        r'\bברבר בר\b': business_info.get('businessName', 'Business Name'),
        r'\bBarber Shop\b': business_info.get('businessName', 'Business Name'),
        r'\bBARBER SHOP\b': business_info.get('businessName', 'Business Name').upper(),
        r'\bbarber shop\b': business_info.get('businessName', 'Business Name').lower(),
        
        # Email patterns
        r'\binfo@barbersbar\.com?\b': f"info@{domain}",
        r'\binfo@barbersbar\.co\.il\b': f"info@{domain}",
        r'\bsupport@barbersbar\.com?\b': f"support@{domain}",
        r'\bsupport@barbersbar\.co\.il\b': f"support@{domain}",
        
        # Phone number patterns - Israeli format variations
        r'\+972[-\s]?54[-\s]?835[-\s]?3232': owner_phone_e164,
        r'\+972[-\s]?52[-\s]?398[-\s]?5505': owner_phone_e164,
        r'054[-\s]?835[-\s]?3232': owner_phone_e164,
        r'052[-\s]?398[-\s]?5505': owner_phone_e164,
        
        # Address patterns
        r'רפיח ים \d+[^"\'\\n]*': business_address_he,
        r'נתיבות נווה שרון \d+': business_address_he,
        r'Netivot rafiah yam \d+': business_address_en,
        r'HAGEFEN \d+, NETIVOT[^"\'\\n]*': business_address_en,
        
        # Package/Bundle ID patterns
        r'com\.barbersbar\.app': business_info.get('bundleId', 'com.example.app'),
        r'"scheme":\s*"barbersbar"': f'"scheme": "{business_info.get("bundleId", "com.example.app").split(".")[-1]}"',
        
        # WhatsApp URLs with phone numbers
        r'https://wa\.me/972548353232': f"https://wa.me/{owner_phone_e164.replace('+', '')}",
        r'https://wa\.me/972523985505': f"https://wa.me/{owner_phone_e164.replace('+', '')}",
    }
    
    return replacements

def apply_replacements_to_content(content: str, replacements: Dict[str, str]) -> Tuple[str, int]:
    """
    Apply all replacements to content and return modified content + replacement count.
    """
    modified_content = content
    replacement_count = 0
    
    for pattern, replacement in replacements.items():
        if replacement:  # Only replace if replacement value exists
            matches = re.findall(pattern, modified_content, re.IGNORECASE | re.MULTILINE)
            if matches:
                replacement_count += len(matches)
                modified_content = re.sub(pattern, replacement, modified_content, flags=re.IGNORECASE | re.MULTILINE)
    
    return modified_content, replacement_count

def replace_hardcoded_content_safe(root: str, business_info: Dict, dry_run: bool = False) -> ReplacementResult:
    """
    Safely replace hardcoded content throughout the project.
    
    Args:
        root: Project root directory
        business_info: Business information dictionary
        dry_run: If True, don't write files, just report what would change
        
    Returns:
        ReplacementResult with statistics
    """
    
    result = ReplacementResult()
    replacements = generate_replacements(business_info)
    
    # Get all files to process
    files_to_process = iter_files(root)
    
    print(f"🔍 Scanning {len(files_to_process)} files for hardcoded content...")
    if dry_run:
        print("📋 DRY RUN MODE - No files will be modified")
    
    for rel_file_path in files_to_process:
        full_path = os.path.join(root, rel_file_path)
        
        try:
            # Read file with proper encoding
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                original_content = f.read()
            
            # Apply replacements
            modified_content, file_replacements = apply_replacements_to_content(original_content, replacements)
            
            if file_replacements > 0:
                result.files_touched += 1
                result.total_replacements += file_replacements
                result.files_with_changes.append(rel_file_path)
                
                print(f"  ✏️  {rel_file_path}: {file_replacements} replacements")
                
                # Show diff in dry run mode
                if dry_run:
                    diff_lines = list(difflib.unified_diff(
                        original_content.splitlines(keepends=True),
                        modified_content.splitlines(keepends=True),
                        fromfile=f"a/{rel_file_path}",
                        tofile=f"b/{rel_file_path}",
                        n=2
                    ))
                    if diff_lines and len(result.files_with_changes) <= 3:  # Show first 3 files
                        print("".join(diff_lines[:20]))  # Limit diff output
                
                # Write modified content if not dry run
                if not dry_run:
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(modified_content)
                        
        except Exception as e:
            print(f"  ⚠️  Error processing {rel_file_path}: {e}")
            continue
    
    return result

def main():
    """Test the replacement system"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Test content replacement system')
    parser.add_argument('--root', default='.', help='Project root directory')
    parser.add_argument('--dry-run', action='store_true', help='Show what would change without writing')
    
    args = parser.parse_args()
    
    # Test business info
    test_business_info = {
        'businessName': 'Test Salon',
        'ownerPhone': '+972523456789',
        'bundleId': 'com.testsalon.app',
        'businessAddress': 'Test Street 123, Test City',
        'businessAddressHe': 'רחוב בדיקה 123, עיר בדיקה',
        'businessAddressEn': 'Test Street 123, Test City'
    }
    
    result = replace_hardcoded_content_safe(args.root, test_business_info, args.dry_run)
    
    print(f"\n📊 Summary:")
    print(f"  Files touched: {result.files_touched}")
    print(f"  Total replacements: {result.total_replacements}")
    print(f"  Files with changes: {len(result.files_with_changes)}")

if __name__ == "__main__":
    main()