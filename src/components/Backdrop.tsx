import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../lib/theme';

/**
 * Fundo atmosférico: base escura com dois brilhos de gradiente (verde no topo,
 * teal embaixo) bem sutis, dando profundidade sem competir com o conteúdo.
 */
export function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(20,224,138,0.10)', 'rgba(8,11,16,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(8,11,16,0)', 'rgba(21,194,214,0.08)']}
        start={{ x: 0.2, y: 0.6 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
