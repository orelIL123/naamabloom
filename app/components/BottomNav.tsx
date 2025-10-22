import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { Animated, Dimensions, Image, Linking, StyleSheet, TouchableOpacity, View } from "react-native";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width: screenWidth } = Dimensions.get('window');

export default function BottomNav({ onOrderPress, onTabPress, activeTab }: {
  onOrderPress?: () => void;
  onTabPress?: (tab: string) => void;
  activeTab?: string;
}) {
  const spinValue = useRef(new Animated.Value(0)).current;

  const handleOrderPress = () => {
    // Start rotation animation and navigate in parallel for seamless UX
    spinValue.setValue(0);
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => spinValue.setValue(0));
    onOrderPress?.();
  };

  const handleCallPress = () => {
    const phoneNumber = '+972542280222';
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrapper}>
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 24,
        zIndex: 101,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        backgroundColor: 'rgba(0,0,0,0.91)',
      }} pointerEvents="none">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.91)',
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          overflow: 'hidden',
        }}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.91)',
            opacity: 1,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }} />
        </View>
      </View>
      <View style={styles.navBar}>
        {/* Left side - Home and Call (RTL: Home should be leftmost) */}
        <View style={styles.leftSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('home')}>
            <Ionicons name="home" size={26} color={activeTab === 'home' ? "#3b82f6" : "#9ca3af"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleCallPress}>
            <Ionicons name="call" size={26} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Center FAB (Order) - properly centered */}
        <View style={styles.centerFab}>
          <LinearGradient
            colors={['#3b82f6', '#60a5fa', '#3b82f6']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity style={styles.fab} onPress={handleOrderPress} activeOpacity={0.85}>
              <AnimatedImage
                source={require("../../assets/images/icon.booking.png")}
                style={[styles.fabIcon, { transform: [{ rotate: spin }] }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Right side - Team and Profile (RTL: Profile should be rightmost) */}
        <View style={styles.rightSide}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('team')}>
            <Ionicons name="people" size={26} color={activeTab === 'team' ? "#3b82f6" : "#9ca3af"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => onTabPress && onTabPress('profile')}>
            <Ionicons name="person" size={26} color={activeTab === 'profile' ? "#3b82f6" : "#9ca3af"} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Home indicator */}
      <View style={styles.homeIndicatorWrapper}>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    backgroundColor: "transparent",
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  navBar: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.91)",
    paddingTop: 0, // ultra thin
    paddingBottom: 0, // ultra thin
    paddingHorizontal: 20,
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30, // מרווח קבוע בין האייקונים
    flex: 2, // תופס 2 יחידות (לשני אייקונים)
    justifyContent: "center",
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 30, // מרווח קבוע בין האייקונים
    flex: 2, // תופס 2 יחידות (לשני אייקונים)
    justifyContent: "center",
  },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 0, // ensure icons are at the top
  },
  fabWrapper: {
    position: "absolute",
    left: "50%",
    top: -36, // half of FAB height (72/2)
    transform: [{ translateX: -36 }],
    zIndex: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    pointerEvents: "box-none",
    alignItems: "center",
    justifyContent: "center",
  },
  fabGradient: {
    width: screenWidth < 380 ? 68 : 76,
    height: screenWidth < 380 ? 68 : 76,
    borderRadius: screenWidth < 380 ? 34 : 38,
    padding: 2,
    transform: [{ translateY: -12 }],
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    width: '100%',
    height: '100%',
    borderRadius: screenWidth < 380 ? 32 : 36,
    backgroundColor: "#0b0518",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#181828",
  },
  fabIcon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicatorWrapper: {
    alignItems: "center",
    width: "100%",
    paddingVertical: 2,
    backgroundColor: "transparent",
    marginTop: 0, // remove extra margin
  },
  homeIndicator: {
    width: 152,
    height: 3, // was 5
    backgroundColor: "#fff",
    borderRadius: 999,
    opacity: 0.5, // lighter
  },
  centerFab: {
    flex: 1, // תופס 1 יחידה (לכפתור האמצע)
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 0,
    position: 'relative',
    top: 0,
  },
});