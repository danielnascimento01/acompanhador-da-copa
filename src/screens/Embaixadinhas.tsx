import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, LayoutChangeEvent, Modal, PanResponder, Pressable, ScrollView, Share,
  StyleSheet, Text, TextInput, View,
} from 'react-native';

import { addGameScore, loadGameScores, loadNick, saveNick, type ScoreEntry } from '../lib/funStorage';
import { fetchGlobalLeaderboard, getDeviceId, submitGlobalScore, type GlobalEntry } from '../lib/leaderboard';
import { colors, fonts, radius, spacing } from '../lib/theme';

const APP_LINK = 'https://play.google.com/store/apps/details?id=com.danielnascimento.copa2026';
const GAME = 'embaixadinhas';

// Tamanhos (px) e física do mini-game.
const CW = 64;   // largura do boneco
const CH = 84;   // altura do boneco
const R = 26;    // raio da bola
const GRAVITY = 900;   // px/s²
const BOUNCE = 560;    // velocidade pra cima ao cabecear
const HEAD_BAND = 34;  // tolerância vertical do toque na cabeça

type Phase = 'menu' | 'playing' | 'over';

function milestoneFor(t: number): string | null {
  if (t === 10) return 'UAU! 🔥';
  if (t === 25) return '25 toques!';
  if (t === 50) return 'Craque! 50!';
  if (t === 75) return 'Fenômeno! 75!';
  if (t === 100) return 'LENDA! 100! 👑';
  return null;
}

// ── Boneco (camisa do Brasil) montado com formas — leve, nítido e sem assets ──
function Player() {
  return (
    <View style={pl.body} pointerEvents="none">
      <View style={pl.head}>
        <View style={pl.hair} />
      </View>
      <View style={pl.jersey}>
        <View style={pl.collar} />
        <View style={[pl.sleeve, pl.sleeveL]} />
        <View style={[pl.sleeve, pl.sleeveR]} />
        <Text style={pl.num}>10</Text>
      </View>
      <View style={pl.shorts} />
      <View style={pl.legsRow}>
        <View style={pl.leg} />
        <View style={pl.leg} />
      </View>
    </View>
  );
}

// ── Fundo do campo: torcida, gol, linhas e faixas (memo: render uma vez só) ──
const STRIPES = ['#10421f', '#0d3a1b', '#10421f', '#0d3a1b', '#10421f', '#0d3a1b'];
const CROWD_COLORS = ['#1f7a44', '#f4c20d', '#e9e9e9', '#1b3fae', '#2a9d5a', '#d23b3b'];
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
  const myId = useRef<string>('');

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

  const record = scores.length ? scores[0].score : 0;

  const refreshGlobal = () => {
    setLoadingGlobal(true);
    fetchGlobalLeaderboard(GAME)
      .then((r) => setGlobalScores(r))
      .finally(() => setLoadingGlobal(false));
  };

  useEffect(() => {
    if (visible) {
      loadNick().then(setNick);
      loadGameScores().then(setScores);
      getDeviceId().then((id) => { myId.current = id; });
      refreshGlobal();
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

    const b = ball.current;
    b.vy += GRAVITY * dt;
    b.y += b.vy * dt;
    b.x += b.vx * dt;

    // paredes
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > w - R) { b.x = w - R; b.vx = -Math.abs(b.vx); }

    // cabeça do boneco (topo do boneco fica em h - CH)
    const headY = h - CH + 16;
    if (b.vy > 0 && b.y + R >= headY && b.y + R <= headY + HEAD_BAND) {
      const cx = charX.current;
      if (Math.abs(b.x - cx) < CW / 2 + R * 0.6) {
        b.y = headY - R;
        b.vy = -BOUNCE;
        b.vx += (b.x - cx) * 4.5; // desvia conforme onde bate → habilidade
        b.vx = Math.max(-280, Math.min(280, b.vx));
        touchesRef.current += 1;
        setTouches(touchesRef.current);
        const ms = milestoneFor(touchesRef.current);
        const isRecord = touchesRef.current === record + 1 && record > 0;
        if (isRecord && ms) showFlash(`Novo recorde! ${ms}`, 1600);
        else if (isRecord) showFlash('Novo recorde! 🎉', 1600);
        else if (ms) showFlash(ms, touchesRef.current >= 100 ? 1600 : 900);
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
      message: `⚽ Fiz ${touchesRef.current} embaixadinhas no Acompanhador da Copa 2026! Tenta me superar:\n${APP_LINK}`,
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
                placeholderTextColor={colors.textFaint}
                maxLength={16}
                returnKeyType="done"
              />

              <Pressable style={styles.primaryBtn} onPress={startGame} accessibilityRole="button" accessibilityLabel="Começar o jogo de embaixadinhas">
                <Text style={styles.primaryText}>▶ Jogar</Text>
              </Pressable>

              {record > 0 && <Text style={styles.recordLine}>🏆 Seu recorde: {record} toques</Text>}

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
                    const mine = s.id === myId.current;
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
              </View>
              <View style={styles.field} onLayout={onLayout} {...pan.panHandlers}>
                <FieldBg />
                {flash && <Text style={styles.flash}>{flash}</Text>}
                <Animated.View style={[styles.ball, { transform: [{ translateX: ballTX }, { translateY: ballTY }] }]} pointerEvents="none">
                  <Text style={styles.ballEmoji}>⚽</Text>
                </Animated.View>
                <Animated.View style={[styles.char, { transform: [{ translateX: charTX }] }]} pointerEvents="none">
                  <Player />
                </Animated.View>
                {waiting && (
                  <View style={styles.startOverlay} pointerEvents="none">
                    <Text style={styles.startBig}>Toque e arraste! 👆</Text>
                    <Text style={styles.startSmall}>A bola cai quando você encostar na tela</Text>
                  </View>
                )}
              </View>
              <Text style={styles.hint}>Arraste o dedo na tela pra mover ⬅️➡️</Text>
            </View>
          )}

          {phase === 'over' && (
            <View style={styles.over}>
              <Text style={styles.overEmoji}>{newRecord ? '🎉' : '⚽'}</Text>
              <Text style={styles.overScore}>{touches}</Text>
              <Text style={styles.overLabel}>toques</Text>
              {newRecord ? <Text style={styles.overRecord}>Novo recorde! 🏆</Text> : <Text style={styles.overMsg}>Recorde: {record} · fica embaixo da bola pra não deixar cair!</Text>}
              <Pressable style={styles.primaryBtn} onPress={shareScore} accessibilityRole="button" accessibilityLabel="Compartilhar pontuação e desafiar amigos">
                <Text style={styles.primaryText}>Desafiar amigos 📲</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={startGame} accessibilityRole="button" accessibilityLabel="Jogar de novo">
                <Text style={styles.ghostText}>Jogar de novo</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={() => setPhase('menu')} accessibilityRole="button" accessibilityLabel="Voltar ao menu">
                <Text style={styles.ghostText}>Voltar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: colors.bgElev, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(5), paddingTop: spacing(3), height: '90%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderBright, alignSelf: 'center', marginBottom: spacing(3) },
  close: { position: 'absolute', top: spacing(4), right: spacing(5), zIndex: 2 },
  closeText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28 },
  sub: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 13, marginBottom: spacing(4), lineHeight: 19 },
  fieldLabel: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 12, marginBottom: spacing(1), textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontFamily: fonts.semibold, fontSize: 16, paddingVertical: spacing(3), paddingHorizontal: spacing(4), marginBottom: spacing(4) },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: spacing(4), alignItems: 'center', alignSelf: 'stretch' },
  primaryText: { color: colors.ink, fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.5 },
  startOverlay: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center', zIndex: 5, paddingHorizontal: spacing(4) },
  startBig: { color: '#fff', fontFamily: fonts.display, fontSize: 26, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8, textAlign: 'center' },
  startSmall: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.semibold, fontSize: 13, marginTop: spacing(1), textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textAlign: 'center' },
  recordLine: { color: colors.amber, fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', marginTop: spacing(4) },
  rankBlock: { marginTop: spacing(5) },
  rankTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, marginBottom: spacing(2) },
  rankNote: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', paddingVertical: spacing(5), lineHeight: 19 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.border },
  rankRowMine: { backgroundColor: 'rgba(20,224,138,0.08)', borderRadius: radius.sm },
  rankPos: { color: colors.textFaint, fontFamily: fonts.extrabold, fontSize: 13, width: 28 },
  rankNick: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  rankNickMine: { color: colors.accent, fontFamily: fonts.bold },
  rankScore: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  playWrap: { flex: 1 },
  hud: { alignItems: 'center', marginBottom: spacing(2) },
  hudTouches: { color: colors.text, fontFamily: fonts.display, fontSize: 44, fontVariant: ['tabular-nums'] },
  hudLabel: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 12, marginTop: -4 },
  field: { flex: 1, backgroundColor: '#0c2a16', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(20,224,138,0.25)', overflow: 'hidden' },
  flash: { position: 'absolute', alignSelf: 'center', top: '32%', color: colors.amber, fontFamily: fonts.display, fontSize: 30, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, zIndex: 4 },
  ball: { position: 'absolute', left: 0, top: 0, width: R * 2, height: R * 2, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  ballEmoji: { fontSize: R * 2 - 6 },
  char: { position: 'absolute', left: 0, bottom: 0, width: CW, height: CH, alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 },
  hint: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: spacing(2) },
  over: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing(6) },
  overEmoji: { fontSize: 60 },
  overScore: { color: colors.text, fontFamily: fonts.display, fontSize: 64, marginTop: spacing(2) },
  overLabel: { color: colors.textDim, fontFamily: fonts.medium, fontSize: 16, marginTop: -8 },
  overRecord: { color: colors.amber, fontFamily: fonts.display, fontSize: 20, marginTop: spacing(2), marginBottom: spacing(4) },
  overMsg: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: spacing(2), marginBottom: spacing(4), paddingHorizontal: spacing(4), lineHeight: 19 },
  shareBtn: { paddingVertical: spacing(3), alignItems: 'center', alignSelf: 'stretch', marginTop: spacing(1) },
  shareText: { color: colors.accent, fontFamily: fonts.bold, fontSize: 15 },
  ghostBtn: { paddingVertical: spacing(2), alignItems: 'center', alignSelf: 'stretch' },
  ghostText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14 },
});

// Boneco com a camisa do Brasil (amarelo/verde/azul) — montado com formas.
const pl = StyleSheet.create({
  body: { width: CW, height: CH, alignItems: 'center', justifyContent: 'flex-end' },
  head: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E8B98A', borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)', alignItems: 'center', zIndex: 2 },
  hair: { position: 'absolute', top: -3, width: 28, height: 13, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: '#241712' },
  jersey: { width: 42, height: 30, backgroundColor: '#FFD200', borderRadius: 8, marginTop: -2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0A7B3E' },
  collar: { position: 'absolute', top: 0, width: 14, height: 6, backgroundColor: '#0A7B3E', borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  sleeve: { position: 'absolute', top: 3, width: 9, height: 13, backgroundColor: '#0A7B3E', borderRadius: 4 },
  sleeveL: { left: -5 },
  sleeveR: { right: -5 },
  num: { color: '#0A7B3E', fontFamily: fonts.extrabold, fontSize: 15 },
  shorts: { width: 34, height: 14, backgroundColor: '#1B3FAE', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, marginTop: -1 },
  legsRow: { flexDirection: 'row', gap: 6, marginTop: 0 },
  leg: { width: 10, height: 16, backgroundColor: '#E8B98A', borderBottomWidth: 5, borderBottomColor: '#fff', borderRadius: 3 },
});

// Fundo do campinho: torcida no topo, gol, círculo central e linhas laterais.
const fbg = StyleSheet.create({
  crowd: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '13%',
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 4, overflow: 'hidden', backgroundColor: '#07180e',
    borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  dot: { width: 7, height: 7, borderRadius: 4, margin: 1.5, opacity: 0.85 },
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
