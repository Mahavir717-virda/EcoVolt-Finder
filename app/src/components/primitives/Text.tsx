import React from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  TextStyle,
} from 'react-native';
import { typography, colors } from '../../theme/tokens';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'micro';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  tabularNums?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: TextStyle | TextStyle[];
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
  const variantStyle = typography[variant] || typography.body;

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
