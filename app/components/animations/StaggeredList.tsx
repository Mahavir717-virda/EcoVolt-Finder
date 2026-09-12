/**
 * StaggeredList Component
 * Animates children items with staggered entrance animations
 */

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { FadeIn } from './FadeIn';

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  style?: ViewStyle;
}

export function StaggeredList({
  children,
  staggerDelay = 100,
  initialDelay = 0,
  style,
}: StaggeredListProps) {
  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <FadeIn 
          key={index} 
          delay={initialDelay + (index * staggerDelay)}
          duration={400}
        >
          {child}
        </FadeIn>
      ))}
    </View>
  );
}
