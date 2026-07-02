import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Flag } from './Flag';
import { useThemedStyles, type ThemeTokens } from '../lib/theme-context';

/**
 * Foto real do jogador via ESPN — usa SÓ o próprio id do atleta (nunca um id
 * "parecido" ou de outra fonte): testamos que páginas da ESPN às vezes embutem o
 * id de OUTRO jogador num widget de "relacionados", então nunca fazemos scraping —
 * só esta URL determinística com o id que a própria ESPN atribui ao gol.
 */
function espnHeadshotUrl(athleteId?: string): string | null {
  return athleteId ? `https://a.espncdn.com/i/headshots/soccer/players/full/${athleteId}.png` : null;
}

/**
 * Avatar de jogador — cadeia de fallback: foto do TheSportsDB (melhor cobertura,
 * já resolvida com confirmação de nacionalidade no servidor) → foto da ESPN (id
 * direto do gol) → bandeira da seleção → emoji. Qualquer falha de carregamento
 * (404, rede) avança pro próximo da cadeia; nunca mostra foto errada.
 */
export function PlayerAvatar({
  athleteId,
  photoUrl,
  teamId,
  flag,
  size = 34,
  radius,
}: {
  athleteId?: string;
  photoUrl?: string;
  teamId?: string;
  flag?: string;
  size?: number;
  radius?: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const [idx, setIdx] = useState(0);
  const r = radius ?? Math.round(size * 0.3);
  const candidates = [photoUrl, espnHeadshotUrl(athleteId)].filter((u): u is string => !!u);
  const url = candidates[idx] ?? null;

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.img, { width: size, height: size, borderRadius: r }]}
        onError={() => setIdx((i) => i + 1)}
      />
    );
  }
  if (teamId) return <Flag teamId={teamId} size={size} radius={r} />;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: r }]}>
      <Text style={{ fontSize: Math.round(size * 0.66) }} allowFontScaling={false}>
        {flag ?? '⚽'}
      </Text>
    </View>
  );
}

const makeStyles = ({ c }: ThemeTokens) => StyleSheet.create({
  img: { backgroundColor: c.surface2, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  wrap: {
    backgroundColor: c.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
