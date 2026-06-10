import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  /** Atraso em ms para escalonar (stagger) várias entradas. */
  delay?: number;
  /** Deslocamento vertical inicial (px). */
  offset?: number;
  style?: ViewStyle | ViewStyle[];
};

/** Entrada suave: fade + slide de baixo pra cima. */
export function FadeInUp({ children, delay = 0, offset = 14, style }: Props) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    }).start();
  }, [t, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
