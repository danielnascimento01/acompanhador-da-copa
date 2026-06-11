/**
 * Wrapper seguro do AdMob (react-native-google-mobile-ads).
 *
 * Filosofia (alinhada à estratégia anti-DGSM): ads LEVES, nunca em feature essencial.
 * Tudo passa por aqui pra:
 *  - não quebrar no Expo Go (o módulo nativo lança/ausenta → require preguiçoso + try/catch);
 *  - ter um KILL-SWITCH (`ADS_ENABLED`) pra lançar o v1.1 ainda sem ads e ligar depois;
 *  - usar IDs de TESTE por padrão (troca pra produção = só preencher os reais).
 *
 * ⚠️ PRODUÇÃO: trocar os app IDs no app.json (test IDs do Google) e os unit IDs abaixo
 * pelos reais do painel AdMob. Test IDs em produção violam a política e não geram receita.
 */
import { Platform } from 'react-native';

/** Liga/desliga TODOS os ads no build (independente da compra).
 * LANÇAMENTO v1.1 = `false` de propósito: mantém o trunfo "sem anúncios" vs DGSM/Scanini
 * pra captar quem odeia ads. Ligar (`true`) num update quando já houver base de usuários. */
export const ADS_ENABLED = false;

/** Em dev usamos sempre unidade de TESTE. Em produção, troque pelos IDs reais do AdMob. */
const PROD_BANNER_UNIT = {
  ios: 'ca-app-pub-3940256099942544/2934735716', // TODO: trocar pelo unit real (iOS)
  android: 'ca-app-pub-3940256099942544/6300978111', // TODO: trocar pelo unit real (Android)
};

let mod: typeof import('react-native-google-mobile-ads') | null | undefined;

function load() {
  if (mod !== undefined) return mod;
  try {
    mod = require('react-native-google-mobile-ads');
  } catch {
    mod = null;
  }
  return mod;
}

/** O módulo nativo está disponível? (false no Expo Go / web) */
export function adsAvailable(): boolean {
  return ADS_ENABLED && !!load();
}

/** ID da unidade de banner: TESTE em __DEV__, real em produção. */
export function bannerUnitId(): string {
  const m = load();
  if (__DEV__ && m) return m.TestIds.BANNER;
  return Platform.OS === 'ios' ? PROD_BANNER_UNIT.ios : PROD_BANNER_UNIT.android;
}

/** Inicializa o SDK e pede ATT no iOS. Idempotente; seguro chamar sempre. Sem-op se indisponível. */
export async function initAds(): Promise<void> {
  if (!adsAvailable()) return;
  try {
    if (Platform.OS === 'ios') {
      const tt = require('expo-tracking-transparency');
      const { status } = await tt.getTrackingPermissionsAsync();
      if (status === 'undetermined') await tt.requestTrackingPermissionsAsync();
    }
    const m = load();
    await m!.default().initialize();
  } catch {
    // Falha de init não pode derrubar o app — simplesmente não mostra ads.
  }
}
