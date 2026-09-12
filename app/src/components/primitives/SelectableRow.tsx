import React from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';
import { RadioCircle } from './RadioCircle';
import { ScalePressable } from './Pressable';

export interface SelectableRowProps {
  title: string;
  subtitle?: string;
  /** 48dp thumbnail image or icon element on the left */
  thumbnail?: ImageSourcePropType | React.ReactNode;
  selected: boolean;
  onSelect: () => void;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

/**
 * SelectableRow — reference-matched row for vehicle/payment selection.
 * Left icon/thumb (48dp rounded-12), title + subtitle (with "·" separator style),
 * right RadioCircle. Wraps ScalePressable.
 */
export const SelectableRow: React.FC<SelectableRowProps> = ({
  title,
  subtitle,
  thumbnail,
  selected,
  onSelect,
  reduceMotion = false,
  style,
}) => {
  const isImageSource =
    thumbnail != null &&
    (typeof thumbnail === 'number' || (typeof thumbnail === 'object' && 'uri' in (thumbnail as object)));

  return (
    <ScalePressable
      onPress={onSelect}
      reduceMotion={reduceMotion}
      style={[styles.container, selected ? styles.selectedContainer : {}, style ?? {}] as any}
    >
      {/* Thumbnail */}
      {thumbnail != null && (
        <View style={styles.thumbWrapper}>
          {isImageSource ? (
            <Image
              source={thumbnail as ImageSourcePropType}
              style={styles.thumbImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbIcon}>
              {thumbnail as React.ReactNode}
            </View>
          )}
        </View>
      )}

      {/* Text */}
      <View style={styles.textBlock}>
        <Text variant="cardTitle" numberOfLines={1}>
          {title}
        </Text>
        {subtitle != null && (
          <Text variant="caption" color={colors.ink2} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Radio */}
      <RadioCircle selected={selected} reduceMotion={reduceMotion} />
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.md,
  },
  selectedContainer: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
  },
  thumbWrapper: {
    width: 48,
    height: 48,
    borderRadius: radii.thumbnail,
    overflow: 'hidden',
  },
  thumbImage: {
    width: 48,
    height: 48,
    borderRadius: radii.thumbnail,
  },
  thumbIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.thumbnail,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});
