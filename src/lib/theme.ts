/**
 * Sistema de design "transmissão esportiva premium".
 * Base preto-azulada profunda, acento verde-elétrico → teal, âmbar para AO VIVO.
 */
export const colors = {
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

export const gradients = {
  hero: ['#0BA968', '#0E8FB0'] as const, // emerald → teal
  accent: ['#14E08A', '#15C2D6'] as const,
  dark: ['#0E131A', '#080B10'] as const,
  amber: ['#FFD15C', '#FF8A3D'] as const,
  live: ['#FF4D5E', '#FF7A3D'] as const,
};

/** Famílias carregadas via useFonts em App.tsx. */
export const fonts = {
  display: 'Anton_400Regular', // condensado, caixa alta, impacto
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  extrabold: 'HankenGrotesk_800ExtraBold',
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
