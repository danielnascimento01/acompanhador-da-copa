import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, LayoutChangeEvent, Modal, PanResponder, Pressable, ScrollView, Share,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { showRewarded, rewardedAvailable } from '../lib/ads';
import { addGameScore, loadGameScores, loadNick, loadSkin, saveNick, saveSkin, type ScoreEntry } from '../lib/funStorage';
import { fetchGlobalLeaderboard, getDeviceId, submitGlobalScore, type GlobalEntry } from '../lib/leaderboard';
import { fonts, radius, spacing } from '../lib/theme';
import { useThemedStyles, useTheme, type ThemeTokens } from '../lib/theme-context';
import { DOWNLOAD_LINKS } from '../lib/share';

/** Vibração — carrega expo-haptics com proteção (no-op se o módulo não existir). */
type FB = 'Light' | 'Medium' | 'Heavy';
const buzz = (k: FB) => {
  try {
    const H = require('expo-haptics');
    H.impactAsync(H.ImpactFeedbackStyle[k]).catch(() => {});
  } catch { /* sem haptics neste binário */ }
};

// Links de download centralizados em DOWNLOAD_LINKS (../lib/share) — Android + iPhone.
const GAME = 'embaixadinhas';

// Tamanhos (px) e física do mini-game.
const CW = 100;  // largura do boneco (bem maior — o dedo não cobre o jogador)
const CH = 128;  // altura do boneco (bem maior)
const R = 32;    // raio da bola
// Gravidade CONSTANTE. A rampa de gravidade antiga deixava a bola "rente à cabeça"
// e o jogo ia ficando MAIS FÁCIL com o tempo. Agora a dificuldade vem do IMPULSO da
// cabeçada, que sobe a cada toque → a bola sobe e DESCE cada vez mais rápido.
const GRAVITY = 1000;
const BOUNCE_BASE = 600;   // impulso inicial (sobe alto e volta — boa sensação de início)
const BOUNCE_MAX = 880;    // impulso máximo (descida rápida no fim → exige reflexo)
const BOUNCE_STEP = 4.5;   // sobe a cada toque → a velocidade da bola aumenta aos poucos
const SWEET = 12; // tolerância (px) do "no alvo" — cabeçada bem no centro
const bounceAt = (touches: number) => Math.min(BOUNCE_MAX, BOUNCE_BASE + touches * BOUNCE_STEP);

// Velocidade progressiva: o mundo inteiro acelera a cada toque.
// Começa no 50º toque, +0.4% por toque, teto em 2.0×.
const WORLD_SPEED_MAX = 2.0;
const worldSpeedAt = (t: number) => Math.min(WORLD_SPEED_MAX, 1 + Math.max(0, t - 50) * 0.004);

// ── Novidades pra animar o jogo (tudo OTA-safe, placar = toques continua justo) ──
const WIND_MAX = 240;   // px/s² da rajada de vento lateral
const PERFECT = 14;     // cabeçada PERFEITA (centro da testa) → conta combo (janela mais generosa)
const PICK_R = 22;      // raio de coleta do item que cai
const PICK_VY = 250;    // velocidade de queda do item
const SPEED_F = 1.7;    // ⚡ acelera o tempo do jogo
const SLOW_F = 0.5;     // ⏱️ câmera lenta
const FX_SPEED_DUR = 4;   // segundos do ⚡
const FX_SLOW_DUR = 2.4;  // segundos do ⏱️
const COMBO_TARGET = 5;   // perfeitas seguidas p/ ativar o multiplicador 2x
const MAX_MULT = 2;       // multiplicador máximo
const MILESTONES = [10, 25, 50, 75, 100];
type Fx = 'speed' | 'slow';
type Pick = Fx | 'star'; // o que pode CAIR como item bom (⚡/⏱️/⭐)

// ── Desafio crescente a partir de 100 toques (ideia da Marina) ──
const HARD_FROM = 100;      // dificuldade extra começa aqui
const STAR_BONUS = 5;       // ⭐ bônus que cai → +5 toques (pega com a bola)
const CARD_PENALTY = 5;     // 🟨 cartão amarelo → -5 toques (pós-100)
const CARD_R = 18;          // hitbox do cartão MENOR que o item bom (PICK_R=22) → mais justo
const CARD_VY = 230;        // velocidade base de queda do cartão
const CARD_MIN_DX = 130;    // cartão NASCE a ≥ esta distância da bola → nunca um hit inevitável

type Phase = 'menu' | 'playing' | 'over';

/** Camisas (skins) — só cores, destravam por recorde. Nº sempre curto (≤2 dígitos). */
type Skin = { id: string; name: string; threshold: number; jersey: string; trim: string; shorts: string; num: string; numColor: string };
const SKINS: Skin[] = [
  { id: 'brasil', name: 'Canarinho', threshold: 0, jersey: '#FFD200', trim: '#0A7B3E', shorts: '#1B3FAE', num: '10', numColor: '#0A7B3E' },
  { id: 'celeste', name: 'Celeste', threshold: 50, jersey: '#6CACE4', trim: '#FFFFFF', shorts: '#0B1B33', num: '10', numColor: '#0B3A6B' },
  { id: 'tricolor', name: 'Azulão', threshold: 120, jersey: '#1B3FAE', trim: '#FFFFFF', shorts: '#FFFFFF', num: '7', numColor: '#FFFFFF' },
  { id: 'roxa', name: 'Fantasma', threshold: 200, jersey: '#7C3AED', trim: '#E9D5FF', shorts: '#2A1B5E', num: '9', numColor: '#FFFFFF' },
  { id: 'lenda', name: 'Lenda', threshold: 320, jersey: '#FFD700', trim: '#111111', shorts: '#111111', num: '7', numColor: '#111111' },
];
const skinById = (id: string): Skin => SKINS.find((s) => s.id === id) ?? SKINS[0];

function milestoneFor(t: number): string | null {
  if (t === 10) return 'UAU! 🔥';
  if (t === 25) return '25 toques!';
  if (t === 50) return 'Craque! 50!';
  if (t === 75) return 'Fenômeno! 75!';
  if (t === 100) return 'LENDA! 100! 👑';
  return null;
}

// ── Boneco montado com formas — leve, nítido e sem assets. Cores vêm da skin. ──
function Player({ skin }: { skin: Skin }) {
  return (
    <View style={pl.body} pointerEvents="none">
      <View style={pl.head}>
        <View style={pl.hair} />
      </View>
      <View style={[pl.jersey, { backgroundColor: skin.jersey, borderColor: skin.trim }]}>
        <View style={[pl.collar, { backgroundColor: skin.trim }]} />
        <View style={[pl.sleeve, pl.sleeveL, { backgroundColor: skin.trim }]} />
        <View style={[pl.sleeve, pl.sleeveR, { backgroundColor: skin.trim }]} />
        <Text style={[pl.num, { color: skin.numColor }]}>{skin.num}</Text>
      </View>
      <View style={[pl.shorts, { backgroundColor: skin.shorts }]} />
      <View style={pl.legsRow}>
        <View style={pl.leg} />
        <View style={pl.leg} />
      </View>
    </View>
  );
}

// ── Fundo do campo: torcida, gol, linhas e faixas (memo: render uma vez só) ──
// Verde mais CLARO (o boneco aparece mais) + torcida mais VIVA.
const STRIPES = ['#1f7d40', '#1b7038', '#1f7d40', '#1b7038', '#1f7d40', '#1b7038'];
const CROWD_COLORS = ['#34d36a', '#ffd60a', '#ffffff', '#3b6fff', '#ff5da2', '#ff5a4d', '#19e08a'];
const CROWD = Array.from({ length: 60 });
const FieldBg = React.memo(function FieldBg() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={StyleSheet.absoluteFill}>
        {STRIPES.map((c, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
      <View style={fbg.crowd}>
        {CROWD.map((_, i) => (
          <View key={i} style={[fbg.dot, { backgroundColor: CROWD_COLORS[i % CROWD_COLORS.length] }]} />
        ))}
      </View>
      <View style={fbg.goal} />
      <View style={fbg.circle} />
      <View style={fbg.outline} />
    </View>
  );
});

export function Embaixadinhas({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { c } = useTheme();
  const [phase, setPhase] = useState<Phase>('menu');
  const [nick, setNick] = useState('');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [touches, setTouches] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  // Mostra "toque pra começar" enquanto a bola fica flutuando, antes do 1º toque.
  const [waiting, setWaiting] = useState(false);
  // Ranking ÚNICO: o mundial (entre todos os usuários). Sua pontuação entra nele.
  const [globalScores, setGlobalScores] = useState<GlobalEntry[] | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [skinId, setSkinId] = useState('brasil');
  const [myId, setMyId] = useState(''); // state (não ref) p/ re-renderizar o destaque "(você)"

  // Dimensões da área de jogo.
  const dims = useRef({ w: 0, h: 0 });
  // Estado físico (refs — não disparam render no loop).
  const ball = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const charX = useRef(0);
  const touchesRef = useRef(0);
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  // "Quero começar" pendente até a área de jogo ser medida (onLayout). Evita o
  // bug de iniciar com tamanho 0 (a bola "cairia" na hora → fim instantâneo).
  const wantStart = useRef(false);
  // A gravidade só liga no 1º toque (bola flutua até lá → o jogador se posiciona).
  const startedRef = useRef(false);
  // Estamos numa partida ativa? (usado pelo PanResponder, que não enxerga o state)
  const playingRef = useRef(false);
  // Timer do "flash" de marco — guardado pra ser cancelado junto com o loop.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Posições animadas (atualizadas imperativamente, sem re-render do React).
  const ballTX = useRef(new Animated.Value(0)).current;
  const ballTY = useRef(new Animated.Value(0)).current;
  const charTX = useRef(new Animated.Value(0)).current;
  // Tremor do campo (juice) — anima só o CONTÊINER, nunca os 60 pontos da torcida.
  const shakeX = useRef(new Animated.Value(0)).current;

  // Relógio da partida em segundos (real, não escalado) — base p/ rajadas/itens/efeitos.
  const clockRef = useRef(0);
  // 🌬️ Vento: aceleração lateral que liga/desliga em rajadas.
  const windRef = useRef(0);
  const windClock = useRef(0);
  const [wind, setWind] = useState(0); // só p/ mostrar a seta (muda no liga/desliga)
  // ⚡/⏱️ Item caindo + efeito ativo (escala o "tempo" do jogo).
  const pickupRef = useRef<{ x: number; y: number; type: Pick } | null>(null);
  const pickClock = useRef(0);
  const pickTX = useRef(new Animated.Value(0)).current;
  const pickTY = useRef(new Animated.Value(0)).current;
  const [pickType, setPickType] = useState<Pick | null>(null);
  const fxRef = useRef<{ type: Fx; until: number } | null>(null);
  const [fx, setFx] = useState<Fx | null>(null);
  // 🟨 Cartão amarelo (pós-100): cai LONGE da bola (dá pra desviar) — encostar a bola = -5.
  const cardRef = useRef<{ x: number; y: number } | null>(null);
  const cardClock = useRef(0);
  const cardTX = useRef(new Animated.Value(0)).current;
  const cardTY = useRef(new Animated.Value(0)).current;
  const [cardOn, setCardOn] = useState(false);
  // 🎯 Combo de cabeçadas perfeitas (meta visual, não mexe no placar).
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const multiplierRef = useRef(1); // 1x normal; vira 2x após COMBO_TARGET perfeitas
  const [combo, setCombo] = useState(0);
  const comboScale = useRef(new Animated.Value(1)).current;
  const beatRef = useRef(false);   // recorde já batido nesta partida? (saltos de +2)
  // 🔥 Bola em chamas — aceso SÓ enquanto o multiplicador 2x está ativo.
  const [onFire, setOnFire] = useState(false);
  // 🚀 Velocidade progressiva — tier muda a cada ~50 toques, mostra no HUD.
  const speedTierRef = useRef(0);
  const [speedTier, setSpeedTier] = useState(0);
  // Offset subtrai dos toques no worldSpeedAt: na ressurreição recua para ~×1.2.
  const speedOffsetRef = useRef(0);
  // Estado do anúncio de ressurreição (1 por partida).
  const [revived, setRevived] = useState(false);
  const [reviving, setReviving] = useState(false);

  const record = scores.length ? scores[0].score : 0;
  const skin = skinById(skinId);

  const doShake = (amp: number) => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: amp, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -amp * 0.7, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: amp * 0.4, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const refreshGlobal = () => {
    setLoadingGlobal(true);
    fetchGlobalLeaderboard(GAME)
      .then((r) => setGlobalScores(r))
      .finally(() => setLoadingGlobal(false));
  };

  useEffect(() => {
    if (visible) {
      getDeviceId().then(setMyId);
      loadSkin().then(setSkinId);
      // Carrega apelido + recorde local e SINCRONIZA com o ranking mundial:
      // envia o melhor recorde local (pode ser anterior ao ranking). Como o
      // servidor mantém só o MAIOR por aparelho, sua entrada no mundial passa a
      // refletir seu recorde de verdade — fim do "recorde 102 mas no mundial 18".
      Promise.all([loadNick(), loadGameScores()]).then(([n, sc]) => {
        setNick(n);
        setScores(sc);
        const best = sc.length ? sc[0].score : 0;
        if (best > 0) {
          // Sincroniza recorde local → mundial. Marca "carregando" pra NÃO piscar
          // "sem internet" enquanto o POST está no ar (globalScores ainda é null).
          setLoadingGlobal(true);
          submitGlobalScore(GAME, n, best)
            .then((g) => { if (g) setGlobalScores(g); else return fetchGlobalLeaderboard(GAME).then(setGlobalScores); })
            .finally(() => setLoadingGlobal(false));
        } else {
          refreshGlobal();
        }
      });
    } else {
      stop();
      wantStart.current = false;
      startedRef.current = false;
      setWaiting(false);
      setPhase('menu');
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function stop() {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
      flashTimer.current = null;
    }
    playingRef.current = false;
  }

  const moveChar = (x: number) => {
    const { w } = dims.current;
    if (!w) return;
    const cx = Math.max(CW / 2, Math.min(w - CW / 2, x));
    charX.current = cx;
    charTX.setValue(cx - CW / 2);
  };

  // Liga a gravidade no 1º toque da partida (a bola estava flutuando até aqui).
  const armOnFirstTouch = () => {
    if (playingRef.current && !startedRef.current) {
      startedRef.current = true;
      setWaiting(false);
      last.current = 0; // zera o dt pra não dar um "salto" no 1º frame
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        moveChar(e.nativeEvent.locationX);
        armOnFirstTouch();
      },
      onPanResponderMove: (e) => moveChar(e.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    dims.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
    // Numa partida em andamento, re-encaixa o boneco na nova largura (rotação/split).
    if (playingRef.current) moveChar(charX.current);
    // Se o jogador pediu pra começar antes de termos o tamanho, começa agora.
    if (wantStart.current) beginPlay();
  };

  // Pedido de jogar: marca a intenção e entra na fase de jogo. A física só
  // arranca quando a área estiver medida (aqui, se já tiver; senão, no onLayout).
  const startGame = () => {
    saveNick(nick);
    touchesRef.current = 0;
    setTouches(0);
    setNewRecord(false);
    setFlash(null);
    setRevived(false);
    speedOffsetRef.current = 0;
    wantStart.current = true;
    setPhase('playing');
    if (dims.current.w > 0 && dims.current.h > 0) beginPlay();
  };

  // Arranca de fato a partida (tamanho já conhecido): centraliza boneco e bola.
  // A bola fica FLUTUANDO (gravidade desligada) até o jogador encostar na tela.
  const beginPlay = () => {
    const { w, h } = dims.current;
    if (!w || !h) return; // ainda não medido — onLayout chama de novo
    wantStart.current = false;
    startedRef.current = false;
    playingRef.current = true;
    setWaiting(true);
    // zera o estado das novidades (vento, item, efeito, combo, fogo)
    clockRef.current = 0;
    windRef.current = 0; windClock.current = 4 + Math.random() * 3; setWind(0);
    pickupRef.current = null; pickClock.current = 7 + Math.random() * 4; setPickType(null);
    fxRef.current = null; setFx(null);
    cardRef.current = null; cardClock.current = 6 + Math.random() * 4; setCardOn(false);
    comboRef.current = 0; maxComboRef.current = 0; multiplierRef.current = 1; setCombo(0);
    beatRef.current = false; setOnFire(false);
    speedTierRef.current = 0; setSpeedTier(0);
    charX.current = w / 2;
    charTX.setValue(w / 2 - CW / 2);
    ball.current = { x: w / 2, y: R + 8, vx: 0, vy: 0 };
    ballTX.setValue(w / 2 - R);
    ballTY.setValue(8);
    last.current = 0;
    stop();
    playingRef.current = true; // stop() zera; reativa após cancelar o frame antigo
    raf.current = requestAnimationFrame(loop);
  };

  const loop = (t: number) => {
    const { w, h } = dims.current;
    // Defesa: sem tamanho válido, não processa física (evita "queda" falsa).
    if (!w || !h) {
      last.current = 0;
      raf.current = requestAnimationFrame(loop);
      return;
    }
    // Antes do 1º toque: bola parada flutuando, sem gravidade nem fim de jogo.
    if (!startedRef.current) {
      last.current = 0;
      raf.current = requestAnimationFrame(loop);
      return;
    }
    if (!last.current) last.current = t;
    const dt = Math.min(0.032, (t - last.current) / 1000);
    last.current = t;

    clockRef.current += dt; // relógio REAL da partida (base de rajadas/itens/efeitos)

    // 🌬️ VENTO — rajada lateral por ~2s, descansa ~3-6s (afeta todos igual → justo).
    windClock.current -= dt;
    if (windClock.current <= 0) {
      if (windRef.current === 0) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        windRef.current = dir * WIND_MAX * (0.6 + Math.random() * 0.4);
        setWind(windRef.current);
        windClock.current = 1.6 + Math.random();
        buzz('Light');
      } else {
        windRef.current = 0; setWind(0);
        windClock.current = 3 + Math.random() * 3;
      }
    }

    // ⚡/⏱️ EFEITO ATIVO — escala o "tempo" do jogo (o placar = toques continua igual).
    let scale = 1;
    if (fxRef.current) {
      if (clockRef.current >= fxRef.current.until) { fxRef.current = null; setFx(null); }
      else scale = fxRef.current.type === 'speed' ? SPEED_F : SLOW_F;
    }
    // 🚀 Velocidade progressiva — mundo inteiro acelera com os toques.
    const ws = worldSpeedAt(Math.max(0, touchesRef.current - speedOffsetRef.current));
    const pdt = dt * scale * ws; // dt físico (acelera/desacelera o jogo inteiro)

    const b = ball.current;
    const prevY = b.y; // posição no início do frame (p/ colisão por cruzamento)
    b.vy += GRAVITY * pdt; // gravidade (tempo escalado pelo efeito)
    b.vx += windRef.current * pdt; // empurrão do vento
    b.y += b.vy * pdt;
    b.x += b.vx * pdt;
    b.vx *= 0.992; // fricção leve — o vento não acumula pra sempre

    // paredes e teto — bola nunca sai da área visível
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > w - R) { b.x = w - R; b.vx = -Math.abs(b.vx); }
    if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); } // teto superior

    // Dificuldade extra PÓS-100 (Marina): itens caem mais rápido e mais frequentes, aos
    // poucos e com teto. A física da cabeçada (= placar) NÃO muda — só a pressão de desvio.
    const hard = touchesRef.current > HARD_FROM
      ? 1 + Math.min(0.6, (touchesRef.current - HARD_FROM) / 250)
      : 1;

    // ⚡/⏱️/⭐ ITEM BOM QUE CAI — pega encostando a BOLA nele (não o boneco). ~20% é ⭐ (+5).
    pickClock.current -= dt;
    if (!pickupRef.current && pickClock.current <= 0 && touchesRef.current >= 4) {
      const r = Math.random();
      const type: Pick = r < 0.4 ? 'speed' : r < 0.8 ? 'slow' : 'star';
      const px = R + Math.random() * Math.max(1, w - 2 * R);
      pickupRef.current = { x: px, y: -PICK_R, type };
      setPickType(type);
      pickTX.setValue(px - PICK_R);
      pickTY.setValue(-PICK_R);
      pickClock.current = (9 + Math.random() * 5) / hard; // mais frequente pós-100
    }
    if (pickupRef.current) {
      const p = pickupRef.current;
      p.y += PICK_VY * hard * dt;
      pickTX.setValue(p.x - PICK_R);
      pickTY.setValue(p.y - PICK_R);
      const ddx = b.x - p.x, ddy = b.y - p.y;
      if (ddx * ddx + ddy * ddy < (R + PICK_R) * (R + PICK_R)) {
        if (p.type === 'star') {
          touchesRef.current += STAR_BONUS;
          setTouches(touchesRef.current);
          showFlash('⭐ +5!', 900); buzz('Heavy'); doShake(5);
        } else {
          const dur = p.type === 'speed' ? FX_SPEED_DUR : FX_SLOW_DUR;
          fxRef.current = { type: p.type, until: clockRef.current + dur };
          setFx(p.type);
          showFlash(p.type === 'speed' ? '⚡ RÁPIDO!' : '⏱️ CÂMERA LENTA', 1000);
          buzz('Heavy'); doShake(6);
        }
        pickupRef.current = null; setPickType(null);
      } else if (p.y - PICK_R > h) {
        pickupRef.current = null; setPickType(null); // saiu pela base
      }
    }

    // 🟨 CARTÃO AMARELO (só a partir de 100) — NASCE longe da bola, então sempre dá pra
    // desviar (nunca a "moeda jogada pro alto"). Encostar a BOLA nele tira 5 toques.
    if (touchesRef.current >= HARD_FROM) {
      cardClock.current -= dt;
      if (!cardRef.current && cardClock.current <= 0) {
        let cx = R + Math.random() * Math.max(1, w - 2 * R);
        if (Math.abs(cx - b.x) < CARD_MIN_DX) cx = b.x + (b.x > w / 2 ? -CARD_MIN_DX : CARD_MIN_DX);
        cx = Math.max(R, Math.min(w - R, cx));
        cardRef.current = { x: cx, y: -CARD_R };
        setCardOn(true);
        cardTX.setValue(cx - CARD_R); cardTY.setValue(-CARD_R);
        cardClock.current = (7 + Math.random() * 5) / hard; // mais frequente conforme sobe
      }
    }
    if (cardRef.current) {
      const cd = cardRef.current;
      cd.y += CARD_VY * hard * dt;
      cardTX.setValue(cd.x - CARD_R); cardTY.setValue(cd.y - CARD_R);
      const cdx = b.x - cd.x, cdy = b.y - cd.y;
      if (cdx * cdx + cdy * cdy < (R + CARD_R) * (R + CARD_R)) {
        touchesRef.current = Math.max(0, touchesRef.current - CARD_PENALTY);
        setTouches(touchesRef.current);
        showFlash('🟨 -5!', 1000); buzz('Heavy'); doShake(7);
        cardRef.current = null; setCardOn(false);
      } else if (cd.y - CARD_R > h) {
        cardRef.current = null; setCardOn(false); // saiu pela base
      }
    }

    // cabeça do boneco — colisão por CRUZAMENTO do plano headY (swept, anti-tunneling).
    const headY = h - CH + 16;
    if (b.vy > 0 && prevY + R < headY && b.y + R >= headY) {
      const cx = charX.current;
      const off = b.x - cx;
      if (Math.abs(off) < CW / 2 + R * 0.6) {
        b.y = headY - R;
        b.vy = -bounceAt(touchesRef.current) * ws; // impulso escala junto com o mundo
        b.vx += off * 4.5; // desvia conforme onde bate → habilidade
        b.vx = Math.max(-320, Math.min(320, b.vx));
        // 🎯 COMBO: COMBO_TARGET cabeçadas PERFEITAS seguidas (centro da testa) ativam o
        // multiplicador 2x — aí as PRÓXIMAS cabeçadas valem 2 toques (skill puro). Errar
        // uma perfeita zera o combo e volta pra 1x. O fogo na bola acende só nesse 2x.
        const perfect = Math.abs(off) < PERFECT;
        const inc = perfect ? multiplierRef.current : 1; // 2x só enquanto a sequência segue
        if (perfect) {
          comboRef.current += 1;
          if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
          if (comboRef.current >= COMBO_TARGET) { multiplierRef.current = MAX_MULT; if (!onFire) setOnFire(true); }
          setCombo(comboRef.current);
          comboScale.setValue(1.5);
          Animated.timing(comboScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();
        } else {
          if (comboRef.current >= 3) showFlash('Combo perdido!', 650);
          comboRef.current = 0;
          if (multiplierRef.current !== 1) multiplierRef.current = 1;
          if (onFire) setOnFire(false);
          if (combo !== 0) setCombo(0);
        }

        const prevT = touchesRef.current;
        touchesRef.current += inc; // +1, ou +2 com o multiplicador
        setTouches(touchesRef.current);

        // 🚀 Speed tier: avisa o jogador quando o mundo acelera (×1.5 / ×2.0 / ×2.5).
        const wsTier = ws >= 2.4 ? 3 : ws >= 1.9 ? 2 : ws >= 1.4 ? 1 : 0;
        if (wsTier !== speedTierRef.current) {
          speedTierRef.current = wsTier;
          setSpeedTier(wsTier);
          if (wsTier > 0) {
            const wMsg = wsTier === 1 ? '🏃 Acelerando!' : wsTier === 2 ? '💨 Turbinada!' : '🚀 MÁXIMO!';
            showFlash(wMsg, 1200);
          }
        }

        // Marcos/recorde por CRUZAMENTO (a pontuação pode pular de +2 com o 2x).
        const cm = MILESTONES.find((m) => prevT < m && touchesRef.current >= m);
        const ms = cm != null ? milestoneFor(cm) : null;
        const justRecord = !beatRef.current && record > 0 && touchesRef.current > record;
        if (justRecord) beatRef.current = true;
        if (justRecord && ms) { showFlash(`Novo recorde! ${ms}`, 1600); buzz('Heavy'); doShake(7); }
        else if (justRecord) { showFlash('Novo recorde! 🎉', 1600); buzz('Heavy'); doShake(7); }
        else if (ms) { showFlash(ms, touchesRef.current >= 100 ? 1600 : 900); buzz('Medium'); doShake(5); }
        else buzz(perfect ? 'Medium' : 'Light'); // centro vibra mais
      }
    }

    // caiu no chão → fim
    if (b.y - R > h) {
      end();
      return;
    }

    ballTX.setValue(b.x - R);
    ballTY.setValue(b.y - R);
    raf.current = requestAnimationFrame(loop);
  };

  const showFlash = (msg: string, ms: number = 900) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  };

  // Ressuscita após o anúncio: mantém placar, recua velocidade para ~×1.2 e recomeça.
  const beginRevive = () => {
    const { w, h } = dims.current;
    if (!w || !h) return;
    startedRef.current = false;
    setWaiting(true);
    setNewRecord(false);
    setFlash(null);
    windRef.current = 0; windClock.current = 4 + Math.random() * 3; setWind(0);
    pickupRef.current = null; pickClock.current = 7 + Math.random() * 4; setPickType(null);
    fxRef.current = null; setFx(null);
    cardRef.current = null; cardClock.current = 6 + Math.random() * 4; setCardOn(false);
    comboRef.current = 0; multiplierRef.current = 1; setCombo(0);
    beatRef.current = false; setOnFire(false);
    speedTierRef.current = 0; setSpeedTier(0);
    ball.current = { x: w / 2, y: R + 8, vx: 0, vy: 0 };
    ballTX.setValue(w / 2 - R); ballTY.setValue(8);
    charX.current = w / 2; charTX.setValue(w / 2 - CW / 2);
    last.current = 0; clockRef.current = 0;
    stop();
    playingRef.current = true;
    setPhase('playing');
    raf.current = requestAnimationFrame(loop);
  };

  const handleRevive = async () => {
    if (reviving) return;
    setReviving(true);
    const result = await showRewarded();
    setReviving(false);
    if (result === 'dismissed') return;
    setRevived(true);
    // worldSpeedAt(100) = ×1.2 — recua o "mundo" para esse ponto.
    speedOffsetRef.current = Math.max(0, touchesRef.current - 100);
    beginRevive();
  };

  const end = async () => {
    stop();
    const final = touchesRef.current;
    const beat = final > record;
    setNewRecord(beat && final > 0);
    setPhase('over');
    const top = await addGameScore(nick, final);
    setScores(top);
    // Envia pro ranking global (silencioso se offline). Só vale a pena se tocou.
    if (final > 0) {
      const g = await submitGlobalScore(GAME, nick, final);
      if (g) setGlobalScores(g);
    }
  };

  const shareScore = () => {
    Share.share({
      message: `⚽ Fiz ${touchesRef.current} embaixadinhas no Acompanhador da Copa 2026! Tenta me superar:\n\n${DOWNLOAD_LINKS}`,
    }).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {phase === 'menu' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(8) }}>
              <Text style={styles.title}>Embaixadinhas ⚽</Text>
              <Text style={styles.sub}>Arraste o dedo pra mover o craque e não deixe a bola cair!</Text>

              <Text style={styles.fieldLabel}>Seu apelido</Text>
              <TextInput
                style={styles.input}
                value={nick}
                onChangeText={setNick}
                placeholder="Ex.: Craque10"
                placeholderTextColor={c.textFaint}
                maxLength={16}
                returnKeyType="done"
              />

              <Pressable style={styles.primaryBtn} onPress={startGame} accessibilityRole="button" accessibilityLabel="Começar o jogo de embaixadinhas">
                <Text style={styles.primaryText}>▶ Jogar</Text>
              </Pressable>

              {record > 0 && <Text style={styles.recordLine}>🏆 Seu recorde: {record} toques</Text>}

              <View style={styles.skinBlock}>
                <Text style={styles.skinTitle}>👕 Camisas — destravam pelo seu recorde</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skinRow}>
                  {SKINS.map((sk) => {
                    const unlocked = record >= sk.threshold;
                    const equipped = skinId === sk.id;
                    return (
                      <Pressable
                        key={sk.id}
                        disabled={!unlocked}
                        onPress={() => { setSkinId(sk.id); saveSkin(sk.id); }}
                        style={[styles.skinCard, equipped && styles.skinCardOn, !unlocked && styles.skinCardLocked]}
                        accessibilityRole="button"
                        accessibilityLabel={unlocked ? `Equipar camisa ${sk.name}` : `Camisa ${sk.name}, destrava com ${sk.threshold} toques`}
                      >
                        <View style={[styles.skinSwatch, { backgroundColor: sk.jersey, borderColor: sk.trim }]}>
                          <Text style={[styles.skinSwatchNum, { color: sk.numColor }]}>{sk.num}</Text>
                        </View>
                        <Text style={styles.skinName} numberOfLines={1}>{sk.name}</Text>
                        <Text style={[styles.skinLock, equipped && styles.skinLockOn]}>
                          {unlocked ? (equipped ? '✓ equipada' : 'tocar') : `🔒 ${sk.threshold}`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.rankBlock}>
                <Text style={styles.rankTitle}>🌎 Ranking mundial</Text>
                {loadingGlobal && globalScores === null ? (
                  <Text style={styles.rankNote}>Carregando ranking…</Text>
                ) : globalScores === null ? (
                  <Pressable onPress={refreshGlobal} accessibilityRole="button" accessibilityLabel="Tentar carregar o ranking de novo">
                    <Text style={styles.rankNote}>Sem internet pra carregar o ranking. Toque pra tentar de novo.</Text>
                  </Pressable>
                ) : globalScores.length === 0 ? (
                  <Text style={styles.rankNote}>Ninguém no ranking ainda. Jogue e seja o primeiro! 🥇</Text>
                ) : (
                  globalScores.map((s, i) => {
                    // Destaca "(você)" pelo aparelho OU pelo apelido — após reinstalar, o
                    // id muda mas o ranking colapsa pelo apelido, então casa pelo nick também.
                    const mine = s.id === myId || (nick.trim() !== '' && s.nick.trim().toLowerCase() === nick.trim().toLowerCase());
                    return (
                      <View key={s.id} style={[styles.rankRow, mine && styles.rankRowMine]}>
                        <Text style={styles.rankPos}>{i + 1}º</Text>
                        <Text style={[styles.rankNick, mine && styles.rankNickMine]} numberOfLines={1}>
                          {s.nick}{mine ? ' (você)' : ''}
                        </Text>
                        <Text style={styles.rankScore}>{s.score}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          )}

          {phase === 'playing' && (
            <View style={styles.playWrap}>
              <View style={styles.hud}>
                <Text style={styles.hudTouches}>{touches}</Text>
                <Text style={styles.hudLabel}>toques · recorde {record}</Text>
                {speedTier > 0 && (
                  <Text style={styles.hudSpeed}>
                    {speedTier === 1 ? '🏃 ×1.5' : speedTier === 2 ? '💨 ×2.0' : '🚀 ×2.5'}
                  </Text>
                )}
              </View>
              <Animated.View style={[styles.field, { transform: [{ translateX: shakeX }] }]} onLayout={onLayout} {...pan.panHandlers}>
                <FieldBg />
                {wind !== 0 && <Text style={styles.windIndic}>{wind < 0 ? '🌬️ ⬅️' : '➡️ 🌬️'}</Text>}
                {fx && <Text style={styles.fxLabel}>{fx === 'speed' ? '⚡ RÁPIDO' : '⏱️ LENTO'}</Text>}
                {combo >= 2 && (
                  <Animated.Text style={[styles.comboBadge, { transform: [{ scale: comboScale }] }]}>
                    {combo >= COMBO_TARGET ? '🔥 2x' : `🎯 ${combo}/${COMBO_TARGET}`}
                  </Animated.Text>
                )}
                {flash && <Text style={styles.flash}>{flash}</Text>}
                {pickType && (
                  <Animated.View style={[styles.pickup, { transform: [{ translateX: pickTX }, { translateY: pickTY }] }]} pointerEvents="none">
                    <Text style={styles.pickupEmoji}>{pickType === 'speed' ? '⚡' : pickType === 'slow' ? '⏱️' : '⭐'}</Text>
                  </Animated.View>
                )}
                {cardOn && (
                  <Animated.View style={[styles.card, { transform: [{ translateX: cardTX }, { translateY: cardTY }] }]} pointerEvents="none">
                    <Text style={styles.cardEmoji}>🟨</Text>
                  </Animated.View>
                )}
                <Animated.View style={[styles.ball, { transform: [{ translateX: ballTX }, { translateY: ballTY }] }]} pointerEvents="none">
                  {onFire && <View style={styles.ballFire} />}
                  <Text style={styles.ballEmoji} allowFontScaling={false}>⚽</Text>
                </Animated.View>
                <Animated.View style={[styles.char, { transform: [{ translateX: charTX }] }]} pointerEvents="none">
                  <Player skin={skin} />
                </Animated.View>
                {waiting && (
                  <View style={styles.startOverlay} pointerEvents="none">
                    <Text style={styles.startBig}>Toque e arraste! 👆</Text>
                    <Text style={styles.startSmall}>A bola cai quando você encostar na tela</Text>
                  </View>
                )}
              </Animated.View>
              <Text style={styles.hint}>Arraste · pegue ⚡/⏱️/⭐ · evite 🟨 e o vento 🌬️</Text>
            </View>
          )}

          {phase === 'over' && (
            <View style={styles.over}>
              <Text style={styles.overEmoji}>{newRecord ? '🎉' : '⚽'}</Text>
              <Text style={styles.overScore}>{touches}</Text>
              <Text style={styles.overLabel}>toques</Text>
              {newRecord ? <Text style={styles.overRecord}>Novo recorde! 🏆</Text> : <Text style={styles.overMsg}>Recorde: {record} · fica embaixo da bola pra não deixar cair!</Text>}
              {maxComboRef.current >= 2 && <Text style={styles.overCombo}>🎯 Maior combo: {maxComboRef.current} perfeitas seguidas</Text>}
              {!revived && rewardedAvailable() && (
                <Pressable
                  style={[styles.reviveBtn, reviving && { opacity: 0.6 }]}
                  onPress={handleRevive}
                  disabled={reviving}
                  accessibilityRole="button"
                  accessibilityLabel="Assistir anúncio para continuar jogando"
                >
                  <Text style={styles.reviveBtnText}>{reviving ? 'Carregando…' : '📺 Continuar (anúncio)'}</Text>
                </Pressable>
              )}
              <Pressable style={styles.replayBtn} onPress={startGame} accessibilityRole="button" accessibilityLabel="Jogar de novo">
                <Text style={styles.replayText}>🔄 Jogar de novo</Text>
              </Pressable>
              <Pressable style={styles.shareBtn} onPress={shareScore} accessibilityRole="button" accessibilityLabel="Compartilhar pontuação e desafiar amigos">
                <Text style={styles.shareText}>Desafiar amigos 📲</Text>
              </Pressable>
              <View style={styles.voltarSep} />
              <Pressable style={styles.voltarBtn} onPress={() => setPhase('menu')} accessibilityRole="button" accessibilityLabel="Voltar ao menu">
                <Text style={styles.voltarText}>← Voltar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ c, st }: ThemeTokens) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: c.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: c.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), height: '90%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: c.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: c.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4), lineHeight: 19 },
  fieldLabel: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12, marginBottom: spacing(1), textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, color: c.text, fontFamily: fonts.semibold, fontSize: 16, paddingVertical: spacing(3), paddingHorizontal: spacing(4), marginBottom: spacing(4) },
  primaryBtn: { backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch' },
  primaryText: { color: c.ink, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  skinBlock: { marginTop: spacing(4) },
  skinTitle: { color: c.textDim, fontFamily: fonts.bold, fontSize: 12.5, marginBottom: spacing(2) },
  skinRow: { gap: spacing(2), paddingRight: spacing(2) },
  skinCard: { width: 72, alignItems: 'center', paddingVertical: spacing(2), borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  skinCardOn: { borderColor: c.accent, backgroundColor: 'rgba(20,224,138,0.10)' },
  skinCardLocked: { opacity: 0.5 },
  skinSwatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(1) },
  skinSwatchNum: { fontFamily: fonts.extrabold, fontSize: 14 },
  skinName: { color: c.text, fontFamily: fonts.semibold, fontSize: 11.5 },
  skinLock: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 10, marginTop: 1 },
  skinLockOn: { color: c.accent },
  startOverlay: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center', zIndex: 5, paddingHorizontal: spacing(4) },
  startBig: { color: '#fff', fontFamily: fonts.display, fontSize: 26, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8, textAlign: 'center' },
  startSmall: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.semibold, fontSize: 13, marginTop: spacing(1), textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textAlign: 'center' },
  recordLine: { color: c.amber, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', marginTop: spacing(4) },
  rankBlock: { marginTop: spacing(5) },
  rankTitle: { color: c.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(2) },
  rankNote: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', paddingVertical: spacing(5), lineHeight: 19 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(2), paddingHorizontal: spacing(3), borderBottomWidth: 1, borderBottomColor: c.border },
  rankRowMine: { backgroundColor: st.favoriteBg, borderRadius: radius.sm, borderBottomColor: 'transparent' },
  rankPos: { color: c.textFaint, fontFamily: fonts.extrabold, fontSize: 13, minWidth: 30 },
  rankNick: { flex: 1, color: c.text, fontFamily: fonts.semibold, fontSize: 14 },
  rankNickMine: { color: c.accent, fontFamily: fonts.bold },
  rankScore: { color: c.accent, fontFamily: fonts.display, fontSize: 16, minWidth: 48, textAlign: 'right', fontVariant: ['tabular-nums'] },
  playWrap: { flex: 1 },
  hud: { alignItems: 'center', marginBottom: spacing(2) },
  hudTouches: { color: c.text, fontFamily: fonts.display, fontSize: 44, fontVariant: ['tabular-nums'] },
  hudLabel: { color: c.textDim, fontFamily: fonts.medium, fontSize: 12, marginTop: -4 },
  hudSpeed: { color: c.amber, fontFamily: fonts.bold, fontSize: 11, marginTop: 2, letterSpacing: 0.3 },
  field: { flex: 1, backgroundColor: '#1b7038', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(20,224,138,0.35)', overflow: 'hidden' },
  flash: { position: 'absolute', alignSelf: 'center', top: '32%', color: c.amber, fontFamily: fonts.display, fontSize: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, zIndex: 4 },
  ball: { position: 'absolute', left: 0, top: 0, width: R * 2, height: R * 2, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  ballEmoji: { fontSize: R * 2 - 12, lineHeight: R * 2, width: R * 2, textAlign: 'center', includeFontPadding: false },
  ballFire: { position: 'absolute', top: -8, left: -8, width: R * 2 + 16, height: R * 2 + 16, borderRadius: R + 8, backgroundColor: 'rgba(255,120,0,0.5)' },
  windIndic: { position: 'absolute', top: '34%', alignSelf: 'center', fontSize: 22, zIndex: 4, backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, overflow: 'hidden' },
  fxLabel: { position: 'absolute', top: '22%', alignSelf: 'center', color: '#fff', fontFamily: fonts.display, fontSize: 24, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, zIndex: 5 },
  comboBadge: { position: 'absolute', top: '13%', alignSelf: 'center', color: '#FFD200', fontFamily: fonts.display, fontSize: 30, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, zIndex: 5 },
  pickup: { position: 'absolute', left: 0, top: 0, width: PICK_R * 2, height: PICK_R * 2, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  pickupEmoji: { fontSize: PICK_R * 2 - 6, lineHeight: PICK_R * 2, textAlign: 'center', includeFontPadding: false },
  card: { position: 'absolute', left: 0, top: 0, width: CARD_R * 2, height: CARD_R * 2, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  cardEmoji: { fontSize: CARD_R * 2 - 4, lineHeight: CARD_R * 2, textAlign: 'center', includeFontPadding: false },
  overCombo: { color: c.amber, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', marginTop: spacing(1) },
  char: { position: 'absolute', left: 0, bottom: 0, width: CW, height: CH, alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 },
  hint: { color: c.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(2) },
  over: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing(6) },
  overEmoji: { fontSize: 60 },
  overScore: { color: c.text, fontFamily: fonts.display, fontSize: 64, marginTop: spacing(2) },
  overLabel: { color: c.textDim, fontFamily: fonts.medium, fontSize: 16, marginTop: -8 },
  overRecord: { color: c.amber, fontFamily: fonts.display, fontSize: 20, marginTop: spacing(2), marginBottom: spacing(4) },
  overMsg: { color: c.textDim, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: spacing(2), marginBottom: spacing(4), paddingHorizontal: spacing(4), lineHeight: 19 },
  reviveBtn: { backgroundColor: c.amber, borderRadius: radius.md, paddingVertical: spacing(3), paddingHorizontal: spacing(5), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(2), marginBottom: spacing(1) },
  reviveBtnText: { color: '#111', fontFamily: fonts.bold, fontSize: 15 },
  replayBtn: { backgroundColor: c.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(2) },
  replayText: { color: c.ink, fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5 },
  shareBtn: { paddingVertical: spacing(3), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(1) },
  shareText: { color: c.accent, fontFamily: fonts.bold, fontSize: 15 },
  voltarSep: { height: 1, alignSelf: 'stretch', backgroundColor: c.border, marginTop: spacing(4), marginBottom: spacing(1) },
  voltarBtn: { paddingVertical: spacing(2.5), alignItems: 'center', alignSelf: 'stretch' },
  voltarText: { color: c.textFaint, fontFamily: fonts.bold, fontSize: 14 },
  ghostBtn: { paddingVertical: spacing(2), alignItems: 'center', alignSelf: 'stretch' },
  ghostText: { color: c.textDim, fontFamily: fonts.bold, fontSize: 14 },
});

// Boneco com a camisa do Brasil (amarelo/verde/azul) — montado com formas.
const pl = StyleSheet.create({
  body: { width: CW, height: CH, alignItems: 'center', justifyContent: 'flex-end' },
  head: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8B98A', borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)', alignItems: 'center', zIndex: 2 },
  hair: { position: 'absolute', top: -3, width: 34, height: 16, borderTopLeftRadius: 17, borderTopRightRadius: 17, backgroundColor: '#241712' },
  jersey: { width: 52, height: 38, backgroundColor: '#FFD200', borderRadius: 9, marginTop: -2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A7B3E' },
  collar: { position: 'absolute', top: 0, width: 18, height: 7, backgroundColor: '#0A7B3E', borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  sleeve: { position: 'absolute', top: 4, width: 11, height: 16, backgroundColor: '#0A7B3E', borderRadius: 5 },
  sleeveL: { left: -6 },
  sleeveR: { right: -6 },
  num: { color: '#0A7B3E', fontFamily: fonts.extrabold, fontSize: 19 },
  shorts: { width: 42, height: 18, backgroundColor: '#1B3FAE', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, marginTop: -1 },
  legsRow: { flexDirection: 'row', gap: 7, marginTop: 0 },
  leg: { width: 12, height: 20, backgroundColor: '#E8B98A', borderBottomWidth: 6, borderBottomColor: '#fff', borderRadius: 3 },
});

// Fundo do campinho: torcida no topo, gol, círculo central e linhas laterais.
const fbg = StyleSheet.create({
  crowd: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '16%',
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 4, overflow: 'hidden', backgroundColor: '#0a2516',
    borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.22)',
  },
  dot: { width: 9, height: 9, borderRadius: 5, margin: 1.5, opacity: 1 },
  goal: {
    position: 'absolute', top: '14%', left: '34%', right: '34%', height: 24,
    borderColor: 'rgba(255,255,255,0.7)', borderWidth: 3, borderBottomWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circle: {
    position: 'absolute', alignSelf: 'center', top: '44%', width: 96, height: 96,
    borderRadius: 48, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
  },
  outline: {
    position: 'absolute', top: '13%', left: 6, right: 6, bottom: 6,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md,
  },
});
