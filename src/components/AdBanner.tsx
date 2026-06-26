import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { ADS_ENABLED, bannerUnitId, requestNonPersonalizedAdsOnly } from '../lib/ads';
import { spacing } from '../lib/theme';

/**
 * Banner leve (adaptativo, ancorado). Aparece só se os anúncios estiverem ligados
 * e houver unidade configurada — senão renderiza nada (sem buraco na tela).
 * Falhas de carregamento são silenciosas: anúncio nunca atrapalha o conteúdo.
 */
export function AdBanner() {
  const unitId = bannerUnitId();
  if (!ADS_ENABLED || !unitId) return null;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: requestNonPersonalizedAdsOnly() }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: spacing(3) },
});
