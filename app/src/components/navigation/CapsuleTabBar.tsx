import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors as defaultTokens, radii, shadows, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

// 5 Main Navigation Items with matched icons and labels
const TAB_CONFIG: Record<
  string,
  {
    label: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
    isHome?: boolean;
  }
> = {
  reservations: {
    label: 'Bookings',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  Reservations: {
    label: 'Bookings',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
  },
  vehicles: {
    label: 'Vehicle',
    iconActive: 'car-sport',
    iconInactive: 'car-sport-outline',
  },
  Vehicle: {
    label: 'Vehicle',
    iconActive: 'car-sport',
    iconInactive: 'car-sport-outline',
  },
  index: {
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
    isHome: true,
  },
  Home: {
    label: 'Home',
    iconActive: 'home',
    iconInactive: 'home-outline',
    isHome: true,
  },
  favorites: {
    label: 'Saved',
    iconActive: 'bookmark',
    iconInactive: 'bookmark-outline',
  },
  Saved: {
    label: 'Saved',
    iconActive: 'bookmark',
    iconInactive: 'bookmark-outline',
  },
  profile: {
    label: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
  Profile: {
    label: 'Profile',
    iconActive: 'person',
    iconInactive: 'person-outline',
  },
};

interface CapsuleTabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  tabWidth: number;
}

const CapsuleTabItem: React.FC<CapsuleTabItemProps> = ({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  tabWidth,
}) => {
  const config = TAB_CONFIG[routeName] || {
    label: routeName,
    iconActive: 'ellipse' as const,
    iconInactive: 'ellipse-outline' as const,
  };

  const scale = useSharedValue(1);
  const iconScale = useSharedValue(isFocused ? 1.05 : 0.95);

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.05 : 0.95, {
      damping: 18,
      stiffness: 220,
    });
  }, [isFocused]);

  const handlePressIn = () => {
    scale.value = withTiming(0.94, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 250 });
  };

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const isCenterHome = !!config.isHome;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={`${config.label} Tab`}
      style={[styles.tabButton, { width: tabWidth }]}
    >
      <Animated.View style={[styles.tabContent, animatedContainerStyle]}>
        {/* Icon with Subtle Spring Pop */}
        <Animated.View
          style={[
            styles.iconWrapper,
            isCenterHome && isFocused && styles.homeActiveIconWrapper,
            animatedIconStyle,
          ]}
        >
          <Ionicons
            name={isFocused ? config.iconActive : config.iconInactive}
            size={isCenterHome ? 22 : 21}
            color={isFocused ? defaultTokens.brand : defaultTokens.ink3}
          />
        </Animated.View>

        {/* Dynamic Label */}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? defaultTokens.brand : defaultTokens.ink3,
              fontFamily: isFocused
                ? 'Manrope_700Bold'
                : 'Manrope_600SemiBold',
            },
          ]}
          numberOfLines={1}
        >
          {config.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export const CapsuleTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);

  // Filter out hidden routes (e.g. href: null in Expo Router or explore)
  const visibleRoutes = useMemo(() => {
    return state.routes.filter((route) => {
      if (route.name.toLowerCase() === 'explore') return false;
      const { options } = descriptors[route.key] || {};
      return (options as any)?.href !== null;
    });
  }, [state.routes, descriptors]);

  const numTabs = visibleRoutes.length || 5;
  // Outer margin & inner container padding
  const CONTAINER_PADDING = 4;
  const PILL_INSET = 2; // subtle padding inside each slot so pill fits perfectly

  const usableWidth = Math.max(0, containerWidth - CONTAINER_PADDING * 2);
  const tabWidth = numTabs > 0 ? usableWidth / numTabs : 0;
  const pillWidth = Math.max(0, tabWidth - PILL_INSET * 2);

  // Find index among visible routes
  const currentRoute = state.routes[state.index];
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((r) => r.key === currentRoute?.key)
  );

  // Single continuous gliding capsule indicator
  const indicatorTranslateX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      const targetX = CONTAINER_PADDING + activeVisibleIndex * tabWidth + PILL_INSET;
      indicatorTranslateX.value = withSpring(targetX, {
        damping: 22,
        stiffness: 240,
        mass: 0.85,
      });
    }
  }, [activeVisibleIndex, tabWidth]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorTranslateX.value }],
    width: pillWidth,
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setContainerWidth(width);
    if (width > 0) {
      const uWidth = Math.max(0, width - CONTAINER_PADDING * 2);
      const tWidth = uWidth / numTabs;
      indicatorTranslateX.value = CONTAINER_PADDING + activeVisibleIndex * tWidth + PILL_INSET;
    }
  };

  // Check if current route is Home (center item)
  const isHomeActive = currentRoute?.name === 'Home' || currentRoute?.name === 'index';

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        {
          bottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 12),
        },
      ]}
    >
      <View
        style={styles.capsuleContainer}
        onLayout={handleLayout}
      >
        {/* Continuous Gliding Active Background (Clean modern reduced roundness) */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.activePillIndicator,
              isHomeActive && styles.homePillIndicator,
              animatedIndicatorStyle,
            ]}
          />
        )}

        {/* Tab Items Row */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route) => {
            const isFocused = currentRoute?.key === route.key;

            const onPress = () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }

              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <CapsuleTabItem
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                tabWidth={tabWidth || 60}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  capsuleContainer: {
    width: '100%',
    maxWidth: 440,
    height: 62,
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // Clean modern capsule radius
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ECEEEC',
    // Soft Elevation Shadow
    shadowColor: '#14181A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 8,
  },
  activePillIndicator: {
    position: 'absolute',
    left: 0,
    top: 4,
    bottom: 4,
    backgroundColor: defaultTokens.brandTint, // #E7F7EC
    borderRadius: 14, // Reduced round shape to frame the tab cleanly
    borderWidth: 1,
    borderColor: defaultTokens.brand + '30',
  },
  homePillIndicator: {
    backgroundColor: defaultTokens.brandTint,
    borderColor: defaultTokens.brand + '50',
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  tabButton: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  iconWrapper: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActiveIconWrapper: {
    transform: [{ scale: 1.04 }],
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
});
