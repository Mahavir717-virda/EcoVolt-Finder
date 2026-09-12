import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface TabItem {
  key: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onTabPress: (key: string) => void;
  style?: ViewStyle;
}

/**
 * BottomTabBar — 4 items (Home/Booking/Charging/Profile).
 * icon+label stacked, active = brand icon+text, inactive = ink3.
 * White bg, top hairline border (colors.border), NO shadow.
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeKey,
  onTabPress,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onTabPress(tab.key)}
            style={styles.tab}
          >
            {/* Icon */}
            <View style={styles.iconSlot}>
              {tab.icon(isActive)}
            </View>
            {/* Label */}
            <Text
              variant="micro"
              color={isActive ? colors.brand : colors.ink3}
              align="center"
              style={isActive ? styles.activeLabelText : undefined}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    // No shadow — per spec
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabelText: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
});
