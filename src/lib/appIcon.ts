/**
 * Wrapper seguro em volta do expo-dynamic-app-icon.
 *
 * ⚠️ A lib chama `requireNativeModule('ExpoDynamicAppIcon')` no topo do módulo, o que
 * LANÇA já no import quando não existe build nativo (Expo Go, web, preview). Por isso
 * NÃO importamos a lib no topo — fazemos `require` preguiçoso dentro de try/catch, pra
 * a tela nunca quebrar. No app instalado da loja, o módulo nativo existe e tudo funciona.
 */
import { Platform } from 'react-native';

import { DEFAULT_ICON_KEY } from '../data/appIcons';

type IconModule = {
  setAppIcon: (name: string) => string | false;
  getAppIcon: () => string;
};

function loadModule(): IconModule | null {
  try {
    // require dentro de try/catch: absorve o throw do requireNativeModule no preview.
    return require('expo-dynamic-app-icon') as IconModule;
  } catch {
    return null;
  }
}

/** Lê o ícone ativo. "DEFAULT" (instalação nova) é normalizado para o ícone padrão (Brasil). */
export function getCurrentIconKey(): string {
  try {
    const mod = loadModule();
    const name = mod?.getAppIcon();
    return !name || name === 'DEFAULT' ? DEFAULT_ICON_KEY : name;
  } catch {
    return DEFAULT_ICON_KEY;
  }
}

/** Troca o ícone do app. Retorna true se aplicou, false em erro (ou preview/Expo Go). */
export function changeAppIcon(key: string): boolean {
  try {
    const mod = loadModule();
    if (!mod) return false;
    const res = mod.setAppIcon(key);
    return res !== false;
  } catch {
    return false;
  }
}

/**
 * No Android a troca só aparece depois que o app é fechado e reaberto (activity-alias).
 * No iOS a troca é imediata. Usado pra mostrar o aviso certo na UI.
 */
export const ICON_CHANGE_NEEDS_RESTART = Platform.OS === 'android';
