/**
 * Infos de versão pra um rótulo discreto (e diagnóstico de OTA) na tela de Avisos.
 * Mostra a versão do app + se a build em execução é a EMBUTIDA (instalada da loja)
 * ou uma ATUALIZAÇÃO OTA — útil pra confirmar, durante a Copa, se um update chegou.
 */
import Constants from 'expo-constants';

export function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.1.0';
}

/** "instalado" (bundle embutido) | "OTA dd/mm hh:mm" | "dev" (Expo Go / sem módulo). */
export function otaStatus(): string {
  try {
    // require preguiçoso: expo-updates pode não existir no Expo Go.
    const Updates = require('expo-updates');
    if (Updates.isEmbeddedLaunch) return 'instalado';
    const created: Date | null = Updates.createdAt ?? null;
    if (created) {
      const d = new Date(created);
      const p = (n: number) => String(n).padStart(2, '0');
      return `OTA ${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    return 'OTA';
  } catch {
    return 'dev';
  }
}
