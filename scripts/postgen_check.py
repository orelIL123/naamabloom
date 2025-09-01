#!/usr/bin/env python3
"""
Post-generation sanity checker for barbershop template.
Verifies that no legacy brand strings or hardcoded content remains.
"""

import os
import re
import sys
from typing import List, Dict, Tuple

# Add core directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))
from replacements import iter_files

def check_legacy_patterns(root: str) -> Dict[str, List[Tuple[str, int, str]]]:
    """
    Check for legacy brand strings and hardcoded content.
    
    Returns:
        Dict mapping pattern names to list of (file, line_number, line_content) matches
    """
    
    legacy_patterns = {
        'barbersbar_brand': r'\b[Bb]arbersbar\b',
        'barber_shop_generic': r'\bBarber Shop\b',
        'hebrew_brand': r'ברבר בר',
        'old_emails': r'barbersbar\.co(?:\.il|m)',
        'israeli_phone_054': r'054[-\s]?835[-\s]?3232',
        'israeli_phone_052': r'052[-\s]?398[-\s]?5505',
        'non_e164_phones': r'(?<!\+972)\b0[5-9]\d{8}\b',  # Israeli phones not in E.164
        'old_addresses': r'רפיח ים \d+|נתיבות נווה שרון',
        'old_bundle_id': r'com\.barbersbar\.app'
    }
    
    found_issues = {}
    files_to_check = iter_files(root)
    
    print(f"🔍 Checking {len(files_to_check)} files for legacy content...")
    
    for rel_file_path in files_to_check:
        full_path = os.path.join(root, rel_file_path)
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                for pattern_name, pattern in legacy_patterns.items():
                    matches = re.finditer(pattern, line)
                    for match in matches:
                        if pattern_name not in found_issues:
                            found_issues[pattern_name] = []
                        
                        found_issues[pattern_name].append((
                            rel_file_path,
                            line_num,
                            line.strip()
                        ))
        
        except Exception as e:
            print(f"  ⚠️  Error checking {rel_file_path}: {e}")
            continue
    
    return found_issues

def check_file_structure(root: str) -> Dict[str, str]:
    """Check that required files exist and have proper structure"""
    
    required_files = {
        'app/utils/links.ts': 'Link utilities',
        'scripts/core/replacements.py': 'Replacement engine',
        'assets/REPLACE_DEMO_IMAGES.md': 'Image replacement guide',
        '.env.example': 'Environment template',
        'app/i18n/locales/he.json': 'Hebrew localization',
        'app/i18n/locales/en.json': 'English localization'
    }
    
    status = {}
    
    for file_path, description in required_files.items():
        full_path = os.path.join(root, file_path)
        if os.path.exists(full_path):
            status[file_path] = "✅ EXISTS"
        else:
            status[file_path] = "❌ MISSING"
    
    return status

def main():
    """Run post-generation checks"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Post-generation sanity checker')
    parser.add_argument('--root', default='.', help='Project root directory')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed output')
    
    args = parser.parse_args()
    
    print("🧪 Post-Generation Checks")
    print("=" * 50)
    
    # Check for legacy patterns
    legacy_issues = check_legacy_patterns(args.root)
    
    # Check file structure
    file_status = check_file_structure(args.root)
    
    # Report results
    print("\n📁 File Structure:")
    for file_path, status in file_status.items():
        print(f"  {status} {file_path}")
    
    print("\n🔍 Legacy Content Scan:")
    if not legacy_issues:
        print("  ✅ No legacy brand strings found!")
    else:
        total_issues = sum(len(matches) for matches in legacy_issues.values())
        print(f"  ❌ Found {total_issues} legacy content issues:")
        
        for pattern_name, matches in legacy_issues.items():
            print(f"\n  📍 {pattern_name.replace('_', ' ').title()} ({len(matches)} matches):")
            
            for file_path, line_num, line_content in matches[:5]:  # Show first 5 matches
                print(f"    {file_path}:{line_num} → {line_content[:100]}")
            
            if len(matches) > 5:
                print(f"    ... and {len(matches) - 5} more")
    
    # Summary
    missing_files = [f for f, status in file_status.items() if "MISSING" in status]
    total_legacy_issues = sum(len(matches) for matches in legacy_issues.values())
    
    print(f"\n📊 Summary:")
    print(f"  Files checked: {len(iter_files(args.root))}")
    print(f"  Missing required files: {len(missing_files)}")
    print(f"  Legacy content issues: {total_legacy_issues}")
    
    if missing_files or total_legacy_issues > 0:
        print(f"\n❌ Checks failed - please fix issues above")
        return 1
    else:
        print(f"\n✅ All checks passed - template is clean!")
        return 0

if __name__ == "__main__":
    sys.exit(main())