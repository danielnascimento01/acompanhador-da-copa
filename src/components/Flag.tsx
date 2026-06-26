import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { teamFlag } from '../data/teams';
import { FLAG_IMG } from '../data/flags';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

/**
 * Avatar de bandeira REAL — imagem (flagcdn) cobrindo um quadrado arredondado
 * (ou círculo, via `radius`). Cai no emoji se a seleção não tiver imagem (raro).
 * API estável: as telas só passam teamId/size/radius. Ver docs/design-system-2026.md.
 */
export function Flag({ teamId, size = 40, radius }: { teamId: string; size?: number; radius?: number }) {
  const styles = useThemedStyles(makeStyles);
  const r = radius ?? Math.round(size * 0.3);
  const img = FLAG_IMG[teamId];
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }]}>
      {img ? (
        <Image source={img} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.66) }} allowFontScaling={false}>
          {teamFlag(teamId)}
        </Text>
      )}
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  wrap: {
    backgroundColor: c.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
