# Pull Request Instructions

## Summary
This PR implements the **Generic Template Sweep + Wizard 3.0** enhancement system, transforming the barbershop template into a truly generic, reusable system with comprehensive content replacement.

## Changes Made

### 🔧 Core Replacement System
- **New:** `scripts/core/replacements.py` - Generic content replacement engine
- **Features:** E.164 phone normalization, regex-based content replacement, dry-run mode
- **Coverage:** 60+ patterns across 17+ file types (TS, TSX, JS, JSON, MD)

### 🔗 Unified Link System  
- **New:** `app/utils/links.ts` - HTTPS deep-link utilities
- **Functions:** `waze()`, `whatsapp()`, `phone()`, `sms()`, `email()`
- **Security:** All links use HTTPS for better compatibility

### 🧪 Quality Assurance
- **New:** `scripts/postgen_check.py` - Post-generation sanity checker
- **Validation:** Detects legacy brand strings, validates file structure
- **Reporting:** Detailed issue tracking with file/line references

### 📋 Environment Management
- **New:** `.env.example` - Secure environment template
- **New:** `.gitignore` - Prevents secret commits
- **Security:** Demo Firebase config, no real secrets in repo

### 🖼️ Asset Management
- **New:** `assets/REPLACE_DEMO_IMAGES.md` - Image replacement guide
- **Details:** Exact dimensions, file formats, usage instructions

### 🎯 Enhanced Wizard
- **Upgraded:** `scripts/app_duplication_wizard.py` uses new replacement system
- **Features:** E.164 phone validation, comprehensive content replacement
- **UI:** Professional generation summary with detailed statistics

## Testing Results

### Dry-Run Output
```
🔍 Scanning 122 files for hardcoded content...
📋 DRY RUN MODE - No files will be modified
Files touched: 17
Total replacements: 56
Files with changes: 17
```

### Post-Generation Check
```
🧪 Post-Generation Checks
Files checked: 123
Missing required files: 0
Legacy content issues: 8 (reduced from 70)
✅ All required files exist
```

### Content Replacement Examples
- Business names: `Barbersbar` → `{businessName}`
- Phones: `+972548353232` → `{ownerPhoneE164}`
- Emails: `info@barbersbar.com` → `info@{domain}`
- Addresses: `רפיח ים 13` → `{businessAddress}`

## How to Open PR

### Step 1: Review Changes
```bash
git log --oneline feat/generic-sweep-wizard3
git diff main..feat/generic-sweep-wizard3
```

### Step 2: Create Pull Request
```bash
# Push the feature branch
git push origin feat/generic-sweep-wizard3

# Create PR using GitHub CLI (if available)
gh pr create \
  --title "Generic Template Sweep + Wizard 3.0 Content Replacement" \
  --body-file PULL_REQUEST_INSTRUCTIONS.md \
  --base main \
  --head feat/generic-sweep-wizard3
```

### Step 3: Manual PR Creation (if no GitHub CLI)
1. Go to GitHub repository
2. Click "Compare & pull request" 
3. Title: `Generic Template Sweep + Wizard 3.0 Content Replacement`
4. Copy this file content as PR description
5. Set base branch: `main`
6. Set compare branch: `feat/generic-sweep-wizard3`

## Acceptance Criteria ✅

- [x] **Comprehensive replacement system** - 60+ patterns, 17+ files
- [x] **E.164 phone normalization** - All phones in international format  
- [x] **Dry-run functionality** - Test without modifications
- [x] **Post-generation validation** - Automated quality checks
- [x] **Secure environment handling** - No secrets in repo
- [x] **Professional wizard output** - Detailed generation summary
- [x] **HTTPS deep-links** - Better compatibility and security
- [x] **Legacy content reduction** - From 70 to 8 issues

## Breaking Changes
None. The wizard maintains backward compatibility while adding new features.

## Future Improvements
- Add more messaging providers (Twilio, Vonage)
- Implement template versioning system  
- Add automated testing for replacement patterns
- Create web-based wizard interface

---
**Ready for Review** ✅