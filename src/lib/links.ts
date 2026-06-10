import { Linking } from 'react-native';

/** Links do projeto 7a0. Trocar aqui se mudar canal de contato/apoio. */
export const LINKS = {
  kofi: 'https://ko-fi.com/acompanhadordacopa',
  site: 'https://7a0.com.br',
  // ⚠️ Confirmar este e-mail com o Daniel — é o destino das sugestões.
  contactEmail: 'contato@7a0.com.br',
};

const APP_NAME = 'Acompanhador da Copa';

export async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Sem app para abrir o link — silenciosamente ignora.
  }
}

export function openKofi() {
  return openUrl(LINKS.kofi);
}

export function openSite() {
  return openUrl(LINKS.site);
}

/** Abre o app de e-mail com assunto/corpo pré-preenchidos para sugestões. */
export function openSuggestion() {
  const subject = encodeURIComponent(`Sugestão — ${APP_NAME}`);
  const body = encodeURIComponent('Minha sugestão / feedback:\n\n');
  return openUrl(`mailto:${LINKS.contactEmail}?subject=${subject}&body=${body}`);
}
