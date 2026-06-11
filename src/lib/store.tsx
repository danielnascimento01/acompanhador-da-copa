import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  DEFAULT_SETTINGS,
  Settings,
  Prediction,
  PredictionMap,
  loadSelectedTeams,
  loadSettings,
  saveSelectedTeams,
  saveSettings,
  loadCachedMatches,
  saveCachedMatches,
  loadOnboarded,
  saveOnboarded,
  loadPredictions,
  savePredictions,
  loadAlbum,
  saveAlbum,
} from './storage';
import { rescheduleAll } from './notifications';
import { fetchLatestMatches } from './liveData';
import { ALL_MATCHES, Match } from '../data/fixtures';
import { MAX_STICKER_QTY, type AlbumCollection } from '../data/stickers';

type Store = {
  ready: boolean;
  selected: Set<string>;
  settings: Settings;
  onboarded: boolean;
  matches: Match[];
  refreshing: boolean;
  updatedAt: number | null;
  predictions: PredictionMap;
  album: AlbumCollection;
  isSelected: (teamId: string) => boolean;
  toggleTeam: (teamId: string) => void;
  setSelected: (ids: string[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: () => void;
  refresh: () => Promise<void>;
  setPrediction: (matchId: string, p: Prediction) => void;
  clearPrediction: (matchId: string) => void;
  clearAllPredictions: () => void;
  /** Define a quantidade exata de uma figurinha (0 remove). */
  setStickerQty: (code: string, qty: number) => void;
  /** +1 na figurinha (até MAX). */
  incSticker: (code: string) => void;
  /** −1 na figurinha (não passa de 0). */
  decSticker: (code: string) => void;
  /** Substitui a coleção inteira (restaurar backup). */
  replaceAlbum: (col: AlbumCollection) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [selected, setSelectedState] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [onboarded, setOnboarded] = useState(false);
  const [matches, setMatches] = useState<Match[]>(ALL_MATCHES);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [album, setAlbum] = useState<AlbumCollection>({});

  // Evita reagendar/persistir antes do carregamento inicial.
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const [teams, s, cached, ob, preds, alb] = await Promise.all([
        loadSelectedTeams(),
        loadSettings(),
        loadCachedMatches(),
        loadOnboarded(),
        loadPredictions(),
        loadAlbum(),
      ]);
      setSelectedState(new Set(teams));
      setSettings(s);
      setOnboarded(ob);
      // null = falha de leitura: começa vazio em memória, mas NÃO regrava o
      // disco até o usuário mexer (protege os palpites/coleção salvos).
      setPredictions(preds ?? {});
      setAlbum(alb ?? {});
      if (cached?.matches?.length) {
        setMatches(cached.matches);
        setUpdatedAt(cached.updatedAt);
      }
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // Persiste seleção/preferências assim que mudam — pulando a primeira
  // execução pós-load (se a leitura falhou, regravar aqui apagaria o disco).
  const firstPersist = useRef(true);
  useEffect(() => {
    if (!loaded.current) return;
    if (firstPersist.current) {
      firstPersist.current = false;
      return;
    }
    saveSelectedTeams([...selected]);
    saveSettings(settings);
  }, [selected, settings]);

  // Reagenda as notificações (com debounce) quando muda seleção, preferências
  // OU os jogos ao vivo (horários corrigidos). Debounce evita rerodar a cada
  // tap no stepper/chip.
  const rescheduleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded.current) return;
    if (rescheduleTimer.current) clearTimeout(rescheduleTimer.current);
    rescheduleTimer.current = setTimeout(() => {
      rescheduleAll(matches, [...selected], settings).catch(() => {
        // Sem permissão ainda — reagenda quando o usuário ativar em Avisos.
      });
    }, 400);
    return () => {
      if (rescheduleTimer.current) clearTimeout(rescheduleTimer.current);
    };
  }, [selected, settings, matches]);

  // Reagenda toda vez que o app volta pro primeiro plano: "rola" a janela de
  // 60 avisos para incluir os próximos jogos (corrige o corte silencioso).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && loaded.current) {
        rescheduleAll(matches, [...selected], settings).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [matches, selected, settings]);

  const refresh = useMemo(
    () => async () => {
      setRefreshing(true);
      try {
        const latest = await fetchLatestMatches();
        setMatches(latest);
        const now = Date.now();
        setUpdatedAt(now);
        await saveCachedMatches(latest, now);
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  // Palpites são salvos apenas em MUTAÇÕES do usuário (nunca no load),
  // com debounce — toques rápidos no stepper não geram uma escrita por toque.
  // `latestPredictionsRef` guarda o último valor a salvar, p/ o flush no background.
  const predictionsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPredictionsRef = useRef<PredictionMap | null>(null);
  const mutatePredictions = (updater: (prev: PredictionMap) => PredictionMap) => {
    setPredictions((prev) => {
      const next = updater(prev);
      latestPredictionsRef.current = next;
      if (predictionsSaveTimer.current) clearTimeout(predictionsSaveTimer.current);
      predictionsSaveTimer.current = setTimeout(() => savePredictions(next), 400);
      return next;
    });
  };

  // Coleção do álbum: salva só em mutações do usuário (nunca no load), com
  // debounce — toques rápidos no +/- não geram uma escrita por toque.
  const albumSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestAlbumRef = useRef<AlbumCollection | null>(null);
  const mutateAlbum = (updater: (prev: AlbumCollection) => AlbumCollection) => {
    setAlbum((prev) => {
      const next = updater(prev);
      latestAlbumRef.current = next;
      if (albumSaveTimer.current) clearTimeout(albumSaveTimer.current);
      albumSaveTimer.current = setTimeout(() => saveAlbum(next), 400);
      return next;
    });
  };

  // 🛡️ PROTEÇÃO CONTRA PERDA DE DADOS: faz flush imediato dos saves pendentes
  // (álbum + palpites) quando o app sai de cena (background/inativo). Elimina a
  // janela de 400ms do debounce em que uma marcação se perderia se o usuário
  // fechasse/matasse o app logo após marcar uma figurinha.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      if (albumSaveTimer.current) {
        clearTimeout(albumSaveTimer.current);
        albumSaveTimer.current = null;
      }
      if (predictionsSaveTimer.current) {
        clearTimeout(predictionsSaveTimer.current);
        predictionsSaveTimer.current = null;
      }
      if (latestAlbumRef.current) saveAlbum(latestAlbumRef.current);
      if (latestPredictionsRef.current) savePredictions(latestPredictionsRef.current);
    });
    return () => sub.remove();
  }, []);

  // Normaliza para inteiro 0..MAX; 0 remove a chave (mantém o mapa enxuto).
  const setStickerQty = (code: string, qty: number) =>
    mutateAlbum((prev) => {
      const clamped = Math.max(0, Math.min(Math.round(qty), MAX_STICKER_QTY));
      const next = { ...prev };
      if (clamped <= 0) delete next[code];
      else next[code] = clamped;
      return next;
    });

  const value = useMemo<Store>(
    () => ({
      ready,
      selected,
      settings,
      onboarded,
      matches,
      refreshing,
      updatedAt,
      predictions,
      album,
      isSelected: (id) => selected.has(id),
      toggleTeam: (id) =>
        setSelectedState((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setSelected: (ids) => setSelectedState(new Set(ids)),
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      completeOnboarding: () => {
        setOnboarded(true);
        saveOnboarded(true);
      },
      refresh,
      setPrediction: (matchId, p) =>
        mutatePredictions((prev) => ({ ...prev, [matchId]: { ...p, at: Date.now() } })),
      clearPrediction: (matchId) =>
        mutatePredictions((prev) => {
          const next = { ...prev };
          delete next[matchId];
          return next;
        }),
      clearAllPredictions: () => mutatePredictions(() => ({})),
      setStickerQty,
      // inc/dec usam o `prev` do setState (não o closure) — toques rápidos não
      // perdem incrementos por leitura defasada do estado.
      incSticker: (code) =>
        mutateAlbum((prev) => ({
          ...prev,
          [code]: Math.min((prev[code] ?? 0) + 1, MAX_STICKER_QTY),
        })),
      decSticker: (code) =>
        mutateAlbum((prev) => {
          const q = (prev[code] ?? 0) - 1;
          const next = { ...prev };
          if (q <= 0) delete next[code];
          else next[code] = q;
          return next;
        }),
      replaceAlbum: (col) => mutateAlbum(() => ({ ...col })),
    }),
    [ready, selected, settings, onboarded, matches, refreshing, updatedAt, predictions, album, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>');
  return ctx;
}
