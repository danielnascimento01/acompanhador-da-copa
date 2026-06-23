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
  loadPushToken,
  savePushToken,
} from './storage';
import { rescheduleAll, getExpoPushToken } from './notifications';
import { registerPushToken } from './liveScorers';
import { fetchLatestMatches } from './liveData';
import { isStale } from './freshness';
import { ALL_MATCHES, Match, hasMatchInPlayWindow } from '../data/fixtures';

type Store = {
  ready: boolean;
  selected: Set<string>;
  settings: Settings;
  onboarded: boolean;
  matches: Match[];
  refreshing: boolean;
  updatedAt: number | null;
  /** Última tentativa de atualização alcançou a internet? (false = offline). */
  online: boolean;
  predictions: PredictionMap;
  isSelected: (teamId: string) => boolean;
  toggleTeam: (teamId: string) => void;
  setSelected: (ids: string[]) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: () => void;
  refresh: () => Promise<void>;
  setPrediction: (matchId: string, p: Prediction) => void;
  clearPrediction: (matchId: string) => void;
  clearAllPredictions: () => void;
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
  const [online, setOnline] = useState(true);
  const [predictions, setPredictions] = useState<PredictionMap>({});

  // Evita reagendar/persistir antes do carregamento inicial.
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const [teams, s, cached, ob, preds] = await Promise.all([
        loadSelectedTeams(),
        loadSettings(),
        loadCachedMatches(),
        loadOnboarded(),
        loadPredictions(),
      ]);
      setSelectedState(new Set(teams));
      setSettings(s);
      setOnboarded(ob);
      // null = falha de leitura: começa vazio em memória, mas NÃO regrava o
      // disco até o usuário mexer (protege os palpites salvos).
      setPredictions(preds ?? {});
      if (cached?.matches?.length) {
        setMatches(cached.matches);
        setUpdatedAt(cached.updatedAt);
      }
      loaded.current = true;
      setReady(true);

      // Registra push token no servidor (fire-and-forget, não bloqueia o boot).
      // Só refaz se o token mudou (raro, mas acontece quando o app é reinstalado).
      registerExpoPushToken();
    })();
  }, []);

  async function registerExpoPushToken() {
    const token = await getExpoPushToken();
    if (!token) return;
    const stored = await loadPushToken();
    if (stored === token) return; // Token não mudou — não bate no servidor
    await registerPushToken(token);
    await savePushToken(token);
  }

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
        const { matches: latest, ok } = await fetchLatestMatches();
        setOnline(ok);
        // Offline: preserva os jogos em cache (não sobrescreve com a grade vazia).
        if (ok) {
          setMatches(latest);
          const now = Date.now();
          setUpdatedAt(now);
          await saveCachedMatches(latest, now);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [],
  );

  // 🔄 FRESCURA: dispara refresh por IDADE do cache — no load e a cada retorno ao
  // primeiro plano. Quebra o "cache velho eterno" (bug das 39h) e, por estar no
  // provider (sempre montado), vale em TODAS as abas, não só na de Jogos. A decisão
  // é por idade + janela de relógio (freshness.ts), nunca por isLive() do cache.
  // Refs evitam closure velha nos handlers de AppState (refresh é estável).
  const updatedAtRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const matchesRef = useRef<Match[]>(matches);
  const dataSaverRef = useRef(settings.dataSaver);
  useEffect(() => { updatedAtRef.current = updatedAt; }, [updatedAt]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { dataSaverRef.current = settings.dataSaver; }, [settings.dataSaver]);

  const refreshIfStale = useMemo(
    () => () => {
      if (refreshingRef.current) return; // evita fetch concorrente
      const now = Date.now();
      const inWindow = hasMatchInPlayWindow(matchesRef.current, new Date(now));
      if (isStale(updatedAtRef.current, now, inWindow, dataSaverRef.current)) refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (ready) refreshIfStale();
  }, [ready, refreshIfStale]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && loaded.current) refreshIfStale();
    });
    return () => sub.remove();
  }, [refreshIfStale]);

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

  // 🛡️ PROTEÇÃO CONTRA PERDA DE DADOS: faz flush imediato do save pendente de
  // palpites quando o app sai de cena (background/inativo). Elimina a janela de
  // 400ms do debounce em que um palpite se perderia se o usuário fechasse/matasse
  // o app logo após palpitar.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      if (predictionsSaveTimer.current) {
        clearTimeout(predictionsSaveTimer.current);
        predictionsSaveTimer.current = null;
      }
      if (latestPredictionsRef.current) savePredictions(latestPredictionsRef.current);
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      selected,
      settings,
      onboarded,
      matches,
      refreshing,
      updatedAt,
      online,
      predictions,
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
    }),
    [ready, selected, settings, onboarded, matches, refreshing, updatedAt, online, predictions, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>');
  return ctx;
}
