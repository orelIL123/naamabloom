import { PlayfairDisplay_700Bold, useFonts } from '@expo-google-fonts/playfair-display';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/colors';
import { MirroredIcon } from './MirroredIcon';

interface TopNavProps {
  title: string;
  onBellPress?: () => void;
  onMenuPress?: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showCloseButton?: boolean;
  onClosePress?: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ 
  title, 
  onBellPress, 
  onMenuPress, 
  showBackButton = false, 
  onBackPress, 
  showCloseButton = false, 
  onClosePress 
}) => {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
  });
  if (!fontsLoaded) return null;
  return (
    <View style={[styles.container, styles.containerRTL]}>
      {/* White gradient overlay on top */}
      <LinearGradient
        colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.whiteOverlay}
        pointerEvents="none"
      />
      
      {/* Diagonal red gradient accent */}
      <LinearGradient
        colors={[colors.neonBlue, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientAccent, styles.gradientAccentRTL]}
        pointerEvents="none"
      />
      {/* Right edge red accent */}
      <LinearGradient
        colors={[colors.neonBlue, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.rightAccent, styles.rightAccentRTL]}
        pointerEvents="none"
      />
      
      {/* Left icon - shows back button, menu, or empty space */}
      <TouchableOpacity style={[styles.iconLeft, styles.iconLeftRTL]} onPress={showBackButton ? onBackPress : onMenuPress}>
        {showBackButton ? (
          <MirroredIcon name="arrow-back" size={28} color="#fff" type="ionicons" />
        ) : (
          <Feather name="menu" size={28} color="#fff" />
        )}
      </TouchableOpacity>
      
      <Text style={[styles.title, { fontFamily: 'PlayfairDisplay_700Bold', textTransform: 'uppercase' }, styles.titleRTL]}>{title}</Text>
      
      {/* Right icon - shows close button, notification, or empty space */}
      <TouchableOpacity style={[styles.iconRight, styles.iconRightRTL]} onPress={showCloseButton ? onClosePress : onBellPress}>
        {showCloseButton ? (
          <Ionicons name="close" size={28} color="#fff" />
        ) : (
          <Ionicons name="notifications-outline" size={28} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 90,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 200,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  iconLeft: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  iconRight: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientAccent: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 100,
    height: 50,
    borderRadius: 25,
    opacity: 0.3,
    zIndex: 1,
  },
  rightAccent: {
    position: 'absolute',
    top: 20,
    right: -20,
    width: 100,
    height: 50,
    borderRadius: 25,
    opacity: 0.3,
    zIndex: 1,
  },
  whiteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    zIndex: 2,
  },
  // RTL styles
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  gradientAccentRTL: {
    left: 'auto',
    right: -20,
  },
  rightAccentRTL: {
    right: 'auto',
    left: -20,
  },
  iconLeftRTL: {
    // In RTL, left icon becomes right icon
  },
  iconRightRTL: {
    // In RTL, right icon becomes left icon
  },
  titleRTL: {
    textAlign: 'center',
  },
});

export default TopNav; 