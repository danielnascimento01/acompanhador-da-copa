import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ADS_ENABLED, bannerComponent, bannerUnitId, requestNonPersonalizedAdsOnly } from '../lib/ads';
import { spacing } from '../lib/theme';

/**
 * Banner leve (adaptativo, ancorado). Só aparece se os anúncios estiverem ligados,
 * houver unidade E o módulo nativo existir (build nativo) — senão renderiza nada
 * (em OTA no binário antigo, simplesmente não mostra). Falhas são silenciosas.
 */
export function AdBanner() {
  if (!ADS_ENABLED) return null; // antes de tocar no módulo nativo (OTA-safe)
  const unitId = bannerUnitId();
  const cmp = bannerComponent();
  if (!unitId || !cmp) return null;
  const { BannerAd, BannerAdSize } = cmp;
  // LARGE_ANCHORED_* é o recomendado na v16; ANCHORED_* (deprecado) e BANNER como fallback.
  const size = BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER ?? BannerAdSize.ANCHORED_ADAPTIVE_BANNER ?? BannerAdSize.BANNER;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId}
        size={size}
        requestOptions={{ requestNonPersonalizedAdsOnly: requestNonPersonalizedAdsOnly() }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: spacing(3) },
});
