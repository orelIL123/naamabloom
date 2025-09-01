import { Platform } from 'react-native';

// Font configuration with proper fallbacks
export const FontConfig = {
  regular: Platform.select({
    ios: 'Heebo-Regular',
    android: 'Heebo_400Regular',
    default: 'Heebo_400Regular',
  }),
  medium: Platform.select({
    ios: 'Heebo-Medium',
    android: 'Heebo_500Medium',
    default: 'Heebo_500Medium',
  }),
  bold: Platform.select({
    ios: 'Heebo-Bold',
    android: 'Heebo_700Bold',
    default: 'Heebo_700Bold',
  }),
  light: Platform.select({
    ios: 'Heebo-Light',
    android: 'Heebo_300Light',
    default: 'Heebo_300Light',
  }),
};

// Helper function to get font with fallback
export const getFont = (weight: 'regular' | 'medium' | 'bold' | 'light' = 'regular') => {
  return FontConfig[weight] || FontConfig.regular;
};

// Common font styles
export const FontStyles = {
  // Headers
  h1: {
    fontFamily: getFont('bold'),
    fontSize: 24,
    lineHeight: 32,
  },
  h2: {
    fontFamily: getFont('bold'),
    fontSize: 20,
    lineHeight: 28,
  },
  h3: {
    fontFamily: getFont('medium'),
    fontSize: 18,
    lineHeight: 24,
  },
  
  // Body text
  body: {
    fontFamily: getFont('regular'),
    fontSize: 16,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: getFont('medium'),
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Small text
  caption: {
    fontFamily: getFont('regular'),
    fontSize: 14,
    lineHeight: 20,
  },
  captionMedium: {
    fontFamily: getFont('medium'),
    fontSize: 14,
    lineHeight: 20,
  },
  
  // Buttons
  button: {
    fontFamily: getFont('medium'),
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Navigation
  tabBar: {
    fontFamily: getFont('medium'),
    fontSize: 12,
    lineHeight: 16,
  },
};

export default FontStyles;