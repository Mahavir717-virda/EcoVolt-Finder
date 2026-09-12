import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
  StyleProp,
} from 'react-native';
import { typography, colors } from '../../theme/tokens';

export type TextVariant =
  // Reference-matched scale
  | 'screenTitle'
  | 'sectionLabel'
  | 'cardTitle'
  | 'body'
  | 'caption'
  | 'micro'
  | 'bigNumeral'
  | 'price'
  // Backward-compat aliases (existing screens)
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'bodyMedium';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  tabularNums?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = colors.ink,
  tabularNums = false,
  align = 'left',
  style,
  children,
  ...rest
}) => {
  const variantStyle = typography[variant] ?? typography.body;

  return (
    <RNText
      style={[
        variantStyle,
        { color, textAlign: align },
        tabularNums && styles.tabularNums,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
});
