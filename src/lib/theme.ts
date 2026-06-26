/**
 * Sistema de design "transmissão esportiva premium" — agora com TEMA CLARO e ESCURO.
 *
 * Os componentes não devem importar `colors`/`gradients`/`state` diretamente em
 * StyleSheet de módulo (isso fixa o tema escuro). Use o hook `useThemedStyles` /
 * `useTheme` (theme-context.tsx). Os exports `colors`/`gradients`/`state` abaixo
 * são apenas o tema ESCURO como default (compatibilidade durante a migração e
 * cores "neutras" que não dependem de tema).
 */
const darkColors = {
  bg: '#080B10',
  bgElev: '#0E131A',
  surface: '#11161D',
  surface2: '#171E29',
  border: '#222B38',
  borderBright: '#30404F',
  text: '#F4F7FB',
  textDim: '#8A97A8',
  textFaint: '#56616F',
  accent: '#14E08A', // verde elétrico
  accentDeep: '#0BA968',
  teal: '#15C2D6',
  amber: '#FFC233',
  live: '#FF4D5E',
  ink: '#04070A',
  white: '#FFFFFF',
};

// Tema CLARO — fundo branco-suave, texto escuro, verde acento mais profundo (pra
// contraste em fundo claro), âmbar/vermelho/teal mais escuros. Mantém a marca.
const lightColors: typeof darkColors = {
  bg: '#F3F5F9',
  bgElev: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#EAEEF4',
  border: '#DCE2EB',
  borderBright: '#C3CCD8',
  text: '#0E1722',
  textDim: '#566372',
  textFaint: '#8A96A4',
  accent: '#0BA968', // verde mais profundo, legível em branco
  accentDeep: '#0A8F57',
  teal: '#0E96A8',
  amber: '#C97A00',
  live: '#E0263A',
  ink: '#04070A', // texto escuro sobre o verde acento (botões)
  white: '#FFFFFF',
};

export type Palette = typeof darkColors;

export type Gradients = {
  hero: readonly [string, string];
  accent: readonly [string, string];
  dark: readonly [string, string];
  amber: readonly [string, string];
  live: readonly [string, string, string];
};
const darkGradients: Gradients = {
  hero: ['#0BA968', '#0E8FB0'], // emerald → teal
  accent: ['#14E08A', '#15C2D6'],
  dark: ['#0E131A', '#080B10'], // fundo do app
  amber: ['#FFD15C', '#FF8A3D'],
  live: ['#FF4D5E', '#FF6A52', '#FF7A3D'], // "acontecendo agora" (3 stops)
};
const lightGradients: Gradients = {
  hero: ['#0BA968', '#0E8FB0'],
  accent: ['#10B981', '#0E96A8'],
  dark: ['#FFFFFF', '#F3F5F9'], // "fundo do app" claro
  amber: ['#F0A030', '#E07A20'],
  live: ['#E0263A', '#E84A3A', '#F06A2D'],
};

/**
 * Tokens de ESTADO do redesign "Elevação 2026" (ver docs/design-system-2026.md).
 */
const darkState = {
  favoriteBg: 'rgba(20,224,138,0.07)',
  favoriteBorder: 'rgba(20,224,138,0.55)',
  liveBorder: 'rgba(255,77,94,0.55)',
  liveTint: 'rgba(255,77,94,0.16)',
  amberTint: 'rgba(255,194,51,0.14)',
  amberBorder: 'rgba(255,194,51,0.35)',
};
const lightState: typeof darkState = {
  favoriteBg: 'rgba(11,169,104,0.10)',
  favoriteBorder: 'rgba(11,169,104,0.55)',
  liveBorder: 'rgba(224,38,58,0.50)',
  liveTint: 'rgba(224,38,58,0.10)',
  amberTint: 'rgba(201,122,0,0.12)',
  amberBorder: 'rgba(201,122,0,0.40)',
};
export type StateTokens = typeof darkState;

/** As duas paletas completas, indexadas por esquema. */
export const palettes = {
  dark: { colors: darkColors, gradients: darkGradients, state: darkState },
  light: { colors: lightColors, gradients: lightGradients, state: lightState },
};

// Defaults (tema escuro) — compatibilidade durante a migração.
export const colors = darkColors;
export const gradients = darkGradients;
export const state = darkState;

/**
 * Famílias carregadas via useFonts em App.tsx.
 * Superfamília Saira (técnica, "painel de placar"): Condensed p/ impacto/números,
 * Semi Condensed p/ corpo — coesa e legível. (Antes: Anton + Hanken Grotesk.)
 */
export const fonts = {
  display: 'SairaCondensed_800ExtraBold', // condensada pesada — títulos e placar
  regular: 'SairaSemiCondensed_400Regular',
  medium: 'SairaSemiCondensed_500Medium',
  semibold: 'SairaSemiCondensed_600SemiBold',
  bold: 'SairaSemiCondensed_700Bold',
  extrabold: 'SairaSemiCondensed_800ExtraBold',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const spacing = (n: number) => n * 4;

/** Sombra elevada para cards de destaque (iOS + Android). */
export const elevation = (level: 1 | 2 | 3) => {
  const map = {
    1: { shadowOpacity: 0.18, shadowRadius: 8, elevation: 3, shadowOffset: { width: 0, height: 3 } },
    2: { shadowOpacity: 0.28, shadowRadius: 16, elevation: 7, shadowOffset: { width: 0, height: 8 } },
    3: { shadowOpacity: 0.4, shadowRadius: 28, elevation: 14, shadowOffset: { width: 0, height: 14 } },
  } as const;
  return { shadowColor: '#000', ...map[level] };
};
