# App Store & Google Play Upload Checklist

## Preparation Checklist

### General
- [ ] Update app version number in `package.json`
- [ ] Ensure all tests pass
- [ ] Run final linting checks
- [ ] Verify all features work as expected

### iOS App Store
- [ ] Generate App Store screenshots (all device sizes)
- [ ] Update app description and keywords
- [ ] Prepare privacy policy URL
- [ ] Check code signing and provisioning profiles
- [ ] Validate app metadata
- [ ] Verify minimum iOS version compatibility

### Google Play Store
- [ ] Generate Google Play screenshots
- [ ] Update app description and short description
- [ ] Prepare privacy policy
- [ ] Check app bundle (AAB) generation
- [ ] Verify minimum Android version compatibility

### Pre-Upload Checks
- [ ] Clear any sensitive tokens/keys
- [ ] Remove debug logging
- [ ] Optimize app bundle size
- [ ] Verify OTA update configuration

### Deployment Commands
```bash
# iOS Build
eas build -p ios --profile production

# Android Build
eas build -p android --profile production

# OTA Update to Production
eas update --branch production
```

## Post-Upload Verification
- [ ] Verify app appears in App Store/Play Store
- [ ] Test installed app functionality
- [ ] Monitor initial user feedback

## Troubleshooting
- If build fails, check `eas.json` configuration
- Verify code signing certificates
- Check for any platform-specific compatibility issues