# naama bloom - Barber Shop App

## App Configuration

### Business Details
- **Business**: naama bloom
- **Owner**: naama bloom
- **Email**: naama@bloom.com
- **Phone**: 0536202292
- **Address**: holon 1

### App Info
- **App Name**: Naama Bloom
- **Bundle ID**: com.naama.bloom
- **Firebase Project**: 47c3dde7
- **Language**: he
- **Workers**: 1

### Services
- עיצוב גבות

### Messaging Setup
- **SMS4Free**: ✅ Enabled
- **WhatsApp**: ❌ Disabled

## Quick Setup

1. **Firebase Setup**
   ```bash
   # Create Firebase project: 47c3dde7
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
naama bloom - naama@bloom.com
