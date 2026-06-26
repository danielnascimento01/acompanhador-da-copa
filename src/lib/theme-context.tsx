/**
 * Motor de TEMA (claro/escuro). Mantém a preferência ('system' | 'light' | 'dark'),
 * persiste, e resolve a paleta ativa. Os componentes usam `useThemedStyles` (estilos
 * que reagem ao tema) e `useTheme` (cores inline em JSX).
 *
 * Por que existe: StyleSheet.create de módulo fixa as cores no momento do import.
 * Para trocar em tempo real, os estilos precisam ser criados DENTRO do componente,
 * a partir da paleta atual — é isso que `useThemedStyles` faz.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palettes, type Gradients, type Palette, type StateTokens } from './theme';

export type ThemePref = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

/** Tokens visuais do tema ativo (cores, gradientes, estados). */
export type ThemeTokens = { c: Palette; g: Gradients; st: StateTokens };

type ThemeValue = ThemeTokens & {
  pref: ThemePref;
  scheme: Scheme;
  setPref: (p: ThemePref) => void;
};

const KEY = 'copa2026:themePref';

function systemScheme(): Scheme {
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

const ThemeCtx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default 'dark' (mantém o app atual; quem quiser troca).
  const [pref, setPrefState] = useState<ThemePref>('dark');
  const [sys, setSys] = useState<Scheme>(systemScheme());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'system' || v === 'light' || v === 'dark') setPrefState(v); })
      .catch(() => {});
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSys(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => sub.remove();
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  };

  const scheme: Scheme = pref === 'system' ? sys : pref;

  const value = useMemo<ThemeValue>(() => {
    const p = palettes[scheme];
    return { pref, scheme, setPref, c: p.colors, g: p.gradients, st: p.state };
    // setPref é estável o suficiente; recalcula quando muda pref/scheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, scheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** Acesso ao tema ativo (cores inline, preferência, troca). */
export function useTheme(): ThemeValue {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return v;
}

/** Cria estilos que reagem ao tema. Passe uma fábrica `(t) => StyleSheet.create({...})`. */
export function useThemedStyles<T>(factory: (t: ThemeTokens) => T): T {
  const { c, g, st, scheme } = useTheme();
  // Memoiza por esquema (claro/escuro) — só recria quando o tema realmente muda.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory({ c, g, st }), [scheme]);
}
