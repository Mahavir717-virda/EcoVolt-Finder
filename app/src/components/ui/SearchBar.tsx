import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Called when the dark filter icon button is pressed */
  onFilterPress?: () => void;
  /** True if any non-default filters are active */
  hasActiveFilters?: boolean;
  style?: ViewStyle;
}

/**
 * SearchBar — pill input (surface bg, border, leading search icon ink3),
 * trailing dark square icon-button (ink bg, white icon) for map toggle.
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search charging stations…',
  onFilterPress,
  hasActiveFilters = false,
  style,
}) => {
  return (
    <View style={[styles.row, style]}>
      {/* Pill search input */}
      <View style={styles.inputPill}>
        {/* Leading search icon */}
        <Ionicons name="search" size={18} color={colors.ink3} style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink3}
          style={styles.input}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.ink3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter toggle icon-button — dark square with white icon */}
      {onFilterPress != null && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onFilterPress}
          style={styles.filterBtn}
        >
          <Ionicons name="options" size={20} color="#FFFFFF" />
          {hasActiveFilters && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    color: colors.ink3,
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    padding: 0,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.iconButton, // 12 — dark square, not pill
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
});
