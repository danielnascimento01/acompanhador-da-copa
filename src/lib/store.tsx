import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  loadLastAnnounce,
  saveLastAnnounce,
  CURRENT_ANNOUNCE_ID,
} from './storage';
import { rescheduleAll, getExpoPushToken } from './notifications';
import { registerPushToken, type PushPrefs } from './liveScorers';
import { initBilling, restoreApoio, endBilling } from './billing';
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
  /** Marca o usuário como apoiador (IAP confirmado/restaurado) e persiste. */
  grantSupporter: () => void;
  /** Segue/deixa de seguir um jogo específico para push de gol. */
  toggleFollowMatch: (matchId: string) => void;
  isFollowingMatch: (matchId: string) => boolean;
  /** Registra/atualiza o token de push de gol AGORA (chamar após conceder permissão). */
  registerForGoalPush: () => void;
  /** Popup de novidade deve aparecer? (uma vez, só p/ quem já usava o app). */
  announceVisible: boolean;
  dismissAnnounce: () => void;
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
  const [announceVisible, setAnnounceVisible] = useState(false);

  // Evita reagendar/persistir antes do carregamento inicial.
  const loaded = useRef(false);

  // Concede o status de apoiador e PERSISTE na hora (não depende do efeito de
  // persistência, que pula a 1ª escrita pós-load). Idempotente.
  const grantSupporter = useCallback(() => {
    setSettings((prev) => {
      if (prev.supporter) return prev;
      const next = { ...prev, supporter: true };
      saveSettings(next);
      return next;
    });
  }, []);

  // Fecha o popup de novidade e marca como visto (não volta a aparecer).
  const dismissAnnounce = useCallback(() => {
    setAnnounceVisible(false);
    saveLastAnnounce(CURRENT_ANNOUNCE_ID);
  }, []);

  useEffect(() => {
    (async () => {
      const [teams, s, cached, ob, preds, lastAnnounce] = await Promise.all([
        loadSelectedTeams(),
        loadSettings(),
        loadCachedMatches(),
        loadOnboarded(),
        loadPredictions(),
        loadLastAnnounce(),
      ]);
      setSelectedState(new Set(teams));
      setSettings(s);
      setOnboarded(ob);
      // Popup de novidade: só para quem JÁ usava o app (onboarded numa sessão
      // anterior) e ainda não viu este aviso. Usuário novo nunca vê (a novidade
      // já faz parte do app para ele).
      if (ob && lastAnnounce !== CURRENT_ANNOUNCE_ID) setAnnounceVisible(true);
      // null = falha de leitura: começa vazio em memória, mas NÃO regrava o
      // disco até o usuário mexer (protege os palpites salvos).
      setPredictions(preds ?? {});
      if (cached?.matches?.length) {
        setMatches(cached.matches);
        setUpdatedAt(cached.updatedAt);
      }
      loaded.current = true;
      setReady(true);

      // Registra push token + preferências de gol no servidor (fire-and-forget).
      registerExpoPushToken(buildPushPrefs(s, teams));

      // IAP de apoio: liga listeners e reconcilia a posse com a loja (fonte da
      // verdade — sobrevive a reinstalação). Fire-and-forget, no-op em Expo Go.
      initApoioBilling();
    })();
  }, []);

  async function initApoioBilling() {
    await initBilling(grantSupporter); // compra confirmada → vira apoiador
    if (await restoreApoio()) grantSupporter(); // já comprou antes → reconcilia
  }

  // Encerra a conexão com a loja ao desmontar o provider.
  useEffect(() => () => { endBilling(); }, []);

  // Reenvia as preferências de push de gol quando mudam (modo, seleções
  // marcadas ou jogos seguidos). Debounce evita um POST por toque.
  const pushPrefsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded.current) return;
    if (pushPrefsTimer.current) clearTimeout(pushPrefsTimer.current);
    pushPrefsTimer.current = setTimeout(async () => {
      const token = await loadPushToken();
      if (!token) return; // sem permissão ainda — registra quando ativar
      await registerPushToken(token, buildPushPrefs(settings, [...selected]));
    }, 800);
    return () => {
      if (pushPrefsTimer.current) clearTimeout(pushPrefsTimer.current);
    };
  }, [settings.goalPush, settings.followedMatches, settings.primaryTeam, selected]);

  // Monta as preferências de push de gol a partir das seleções + jogos seguidos.
  // Jogos seguidos viram PARES de times (o servidor casa por nome, evitando o
  // conflito de ids ESPN↔TheSportsDB).
  function buildPushPrefs(s: Settings, teamIds: string[]): PushPrefs {
    // A seleção FAVORITA sempre recebe push de gol — mesmo que tenha sido
    // desmarcada de `selected` (eleger favorita marca, mas desmarcar não desfaz).
    const teams =
      s.primaryTeam && !teamIds.includes(s.primaryTeam) ? [...teamIds, s.primaryTeam] : teamIds;
    const matches = s.followedMatches
      .map((id) => ALL_MATCHES.find((m) => m.id === id))
      .filter((m): m is Match => !!m)
      .map((m): [string, string] => [m.home, m.away]);
    return { mode: s.goalPush, teams, matches };
  }

  async function registerExpoPushToken(prefs: PushPrefs) {
    const token = await getExpoPushToken();
    if (!token) return; // sem permissão/dispositivo — nada a registrar
    await savePushToken(token);
    await registerPushToken(token, prefs);
  }

  // Refs com o estado atual para o re-registro disparado por eventos (foreground).
  const settingsRef = useRef(settings);
  const selectedRef = useRef(selected);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /** Registra o token+prefs com o estado ATUAL. Idempotente; no-op sem permissão. */
  const registerForGoalPush = useCallback(() => {
    registerExpoPushToken(buildPushPrefs(settingsRef.current, [...selectedRef.current]));
  }, []);

  // Re-registra ao voltar ao primeiro plano: cobre RETRY de POST que falhou,
  // permissão concedida fora do app, e token rotacionado pela Expo. No-op se
  // não houver permissão/token.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && loaded.current) registerForGoalPush();
    });
    return () => sub.remove();
  }, [registerForGoalPush]);

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
      grantSupporter,
      toggleFollowMatch: (matchId) =>
        setSettings((prev) => {
          const set = new Set(prev.followedMatches);
          if (set.has(matchId)) set.delete(matchId);
          else set.add(matchId);
          return { ...prev, followedMatches: [...set] };
        }),
      isFollowingMatch: (matchId) => settings.followedMatches.includes(matchId),
      registerForGoalPush,
      announceVisible,
      dismissAnnounce,
      completeOnboarding: () => {
        setOnboarded(true);
        saveOnboarded(true);
        // Usuário novo já entra com a novidade "vista" — não recebe o popup depois.
        saveLastAnnounce(CURRENT_ANNOUNCE_ID);
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
    [ready, selected, settings, onboarded, matches, refreshing, updatedAt, online, predictions, refresh, grantSupporter, registerForGoalPush, announceVisible, dismissAnnounce],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de <StoreProvider>');
  return ctx;
}
