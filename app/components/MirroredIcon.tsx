import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { View } from 'react-native';

const DIR_NAMES = /chevron-|arrow-|navigate-|back|forward|left|right|up|down/;

interface MirroredIconProps {
  name: any;
  size?: number;
  color?: string;
  type?: 'material' | 'ionicons';
}

export function MirroredIcon({ name, size=22, color, type = 'material' }: MirroredIconProps) {
  // Always flip directional icons for RTL (Hebrew)
  const flip = String(name).match(DIR_NAMES);
  
  if (type === 'ionicons') {
    return (
      <View style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}>
        <Ionicons name={name} size={size} color={color} />
      </View>
    );
  }
  
  return (
    <View style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <MaterialIcons name={name} size={size} color={color} />
    </View>
  );
}
