/**
 * Catálogo dos ícones de app selecionáveis (feature "Ícone do app", v1.1).
 * As `key` aqui DEVEM bater com as chaves do plugin expo-dynamic-app-icon no app.json.
 * O Brasil é registrado como alternate explícito (e não como "DEFAULT") porque a lib
 * não consegue resetar para o ícone principal — então tratamos Brasil como um ícone normal.
 */
export type AppIconGroup = 'selecoes' | 'especiais';

export interface AppIconDef {
  key: string;
  label: string;
  group: AppIconGroup;
  thumb: number; // require() do PNG (thumb 256px — só pra UI; o plugin nativo usa o 1024 do app.json)
}

/** Ícone mostrado como selecionado quando a lib ainda devolve "DEFAULT" (instalação nova). */
export const DEFAULT_ICON_KEY = 'brasil';

export const APP_ICONS: AppIconDef[] = [
  { key: 'brasil', label: 'Brasil', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/brasil.png') },
  { key: 'argentina', label: 'Argentina', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/argentina.png') },
  { key: 'franca', label: 'França', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/franca.png') },
  { key: 'portugal', label: 'Portugal', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/portugal.png') },
  { key: 'espanha', label: 'Espanha', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/espanha.png') },
  { key: 'alemanha', label: 'Alemanha', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/alemanha.png') },
  { key: 'eua', label: 'EUA', group: 'selecoes', thumb: require('../../assets/app-icons/thumbs/eua.png') },
  { key: 'holografico', label: 'Holográfico', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/holografico.png') },
  { key: 'neon', label: 'Neon Nights', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/neon.png') },
  { key: 'ruby', label: 'Ruby', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/ruby.png') },
  { key: 'hiperespaco', label: 'Hiperespaço', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/hiperespaco.png') },
  { key: 'midnight', label: 'Midnight Matte', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/midnight.png') },
  { key: 'nostalgia', label: 'Nostalgia', group: 'especiais', thumb: require('../../assets/app-icons/thumbs/nostalgia.png') },
];

export const APP_ICON_GROUPS: { key: AppIconGroup; title: string }[] = [
  { key: 'selecoes', title: 'Seleções' },
  { key: 'especiais', title: 'Especiais' },
];
