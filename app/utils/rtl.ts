
/**
 * RTL Utilities for consistent RTL layout handling
 * Hebrew is RTL, English is LTR
 */

export const isRTL = () => {
  // Since we're handling RTL manually in styles, we'll return true for Hebrew
  return true; // App is primarily Hebrew-based with RTL layout
};

/**
 * Get the appropriate flexDirection for RTL/LTL layouts
 */
export const getFlexDirection = (direction: 'row' | 'column' = 'row') => {
  if (direction === 'column') return 'column';
  return isRTL() ? 'row-reverse' : 'row';
};

/**
 * Get margin/padding styles that adjust for RTL
 */
export const getMarginStyle = (side: 'left' | 'right', value: number) => {
  if (isRTL()) {
    return side === 'left' ? { marginRight: value } : { marginLeft: value };
  }
  return side === 'left' ? { marginLeft: value } : { marginRight: value };
};

export const getPaddingStyle = (side: 'left' | 'right', value: number) => {
  if (isRTL()) {
    return side === 'left' ? { paddingRight: value } : { paddingLeft: value };
  }
  return side === 'left' ? { paddingLeft: value } : { paddingRight: value };
};

/**
 * Get position styles that adjust for RTL
 */
export const getPositionStyle = (side: 'left' | 'right', value: number) => {
  if (isRTL()) {
    return side === 'left' ? { right: value } : { left: value };
  }
  return side === 'left' ? { left: value } : { right: value };
};

/**
 * Get text alignment for RTL
 */
export const getTextAlign = (align: 'left' | 'right' | 'center' = 'right') => {
  if (align === 'center') return 'center';
  if (isRTL()) {
    return align === 'left' ? 'right' : 'left';
  }
  return align;
};

/**
 * RTL-aware style object
 */
export const rtlStyle = {
  flexRow: { flexDirection: getFlexDirection('row') as 'row' | 'row-reverse' },
  textAlign: getTextAlign('right') as 'left' | 'right' | 'center',
  marginLeft: (value: number) => getMarginStyle('left', value),
  marginRight: (value: number) => getMarginStyle('right', value),
  paddingLeft: (value: number) => getPaddingStyle('left', value),
  paddingRight: (value: number) => getPaddingStyle('right', value),
  left: (value: number) => getPositionStyle('left', value),
  right: (value: number) => getPositionStyle('right', value),
};
