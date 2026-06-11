import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useStore } from '../lib/store';
import {
  ALBUM,
  albumStats,
  normalizeCode,
  sectionStats,
  type AlbumSection,
} from '../data/stickers';
import { teamFlag } from '../data/teams';
import { TradeSheet } from './TradeSheet';
import { colors, fonts, radius, spacing } from '../lib/theme';

type Filter = 'todos' | 'ausente' | 'tenho';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ausente', label: 'Faltam' },
  { key: 'tenho', label: 'Tenho' },
];

const COLS = 5;
const PAD = spacing(4);
const GAP = spacing(2);
const TILE = Math.floor((Dimensions.get('window').width - PAD * 2 - GAP * (COLS - 1)) / COLS);

export function AlbumScreen() {
  const { album, incSticker, decSticker } = useStore();
  const stats = useMemo(() => albumStats(album), [album]);

  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filter, setFilter] = useState<Filter>('todos');
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [tradeOpen, setTradeOpen] = useState(false);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expandAll = () => setOpenSections(new Set(ALBUM.sections.map((s) => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  const submitMark = () => {
    const code = normalizeCode(query);
    if (!code) {
      flash('🤔 Código não encontrado');
      return;
    }
    incSticker(code);
    const qty = (album[code] ?? 0) + 1;
    flash(`✓ ${code} marcada${qty > 1 ? ` (×${qty})` : ''}`);
    setQuery('');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: PAD, paddingBottom: spacing(12) }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Álbum</Text>
        <Text style={styles.subtitle}>
          {stats.owned} de {stats.total} figurinhas · {stats.percent}% completo
        </Text>

        {/* Dashboard */}
        <View style={styles.statsRow}>
          <Stat value={stats.owned} label="Tenho" color={colors.accent} />
          <Stat value={stats.missing} label="Faltam" color={colors.live} />
          <Stat value={stats.duplicates} label="Repetidas" color={colors.amber} />
          <Stat value={`${stats.percent}%`} label="Completo" color={colors.teal} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${stats.percent}%` }]} />
        </View>

        {/* Marcação rápida por código */}
        <View style={styles.markBar}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitMark}
            placeholder="Digite o código — ex.: BRA 5"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.markInput}
            accessibilityLabel="Marcar figurinha por código"
          />
          <Pressable
            style={styles.markBtn}
            onPress={submitMark}
            accessibilityRole="button"
            accessibilityLabel="Marcar"
          >
            <Text style={styles.markBtnText}>MARCAR</Text>
          </Pressable>
        </View>
        <Text style={styles.hint}>Toque numa figurinha para adicionar · segure para remover.</Text>

        {/* Trocar */}
        <Pressable style={styles.tradeBtn} onPress={() => setTradeOpen(true)} accessibilityRole="button" accessibilityLabel="Trocar figurinhas">
          <Text style={styles.tradeBtnText}>🔁  Trocar figurinhas</Text>
        </Pressable>

        {/* Barra de ações: filtros + expandir/recolher */}
        <View style={styles.actionsRow}>
          <View style={styles.segment}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[styles.segBtn, active && styles.segBtnActive]}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Filtrar: ${f.label}`}
                >
                  <Text style={[styles.segText, active && styles.segTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={expandAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Expandir tudo">
            <Text style={styles.expandLink}>Expandir</Text>
          </Pressable>
          <Pressable onPress={collapseAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Recolher tudo">
            <Text style={styles.expandLink}>Recolher</Text>
          </Pressable>
        </View>

        {/* Seções */}
        {ALBUM.sections.map((section) => (
          <SectionRow
            key={section.id}
            section={section}
            album={album}
            open={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            filter={filter}
            onInc={incSticker}
            onDec={decSticker}
          />
        ))}
      </ScrollView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <TradeSheet visible={tradeOpen} onClose={() => setTradeOpen(false)} />
    </View>
  );
}

function Stat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionRow({
  section,
  album,
  open,
  onToggle,
  filter,
  onInc,
  onDec,
}: {
  section: AlbumSection;
  album: Record<string, number>;
  open: boolean;
  onToggle: () => void;
  filter: Filter;
  onInc: (code: string) => void;
  onDec: (code: string) => void;
}) {
  const st = sectionStats(section, album);
  const complete = st.missing === 0;
  const flag = section.teamId ? teamFlag(section.teamId) : '⭐';

  const visible = section.stickers.filter((s) => {
    const qty = album[s.code] ?? 0;
    if (filter === 'ausente') return qty === 0;
    if (filter === 'tenho') return qty >= 1;
    return true;
  });

  // Sob um filtro ativo, esconde seções que não têm nenhuma figurinha no critério.
  if (filter !== 'todos' && visible.length === 0) return null;

  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHead}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${section.title}, ${st.owned} de ${st.total}`}
      >
        <Text style={styles.sectionFlag}>{flag}</Text>
        <View style={styles.flex1}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.code ? <Text style={styles.sectionCode}>{section.code}</Text> : null}
        </View>
        <View style={[styles.sectionCount, complete && styles.sectionCountDone]}>
          <Text style={[styles.sectionCountText, complete && styles.sectionCountTextDone]}>
            {complete ? '✓ ' : ''}
            {st.owned}/{st.total}
          </Text>
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>

      {open && (
        <View style={styles.grid}>
          {visible.map((s) => {
            const qty = album[s.code] ?? 0;
            const owned = qty >= 1;
            const dupes = qty > 1 ? qty - 1 : 0;
            return (
              <Pressable
                key={s.code}
                style={[styles.tile, owned && styles.tileOwned, s.shiny && owned && styles.tileFoil]}
                onPress={() => onInc(s.code)}
                onLongPress={() => onDec(s.code)}
                delayLongPress={250}
                accessibilityRole="button"
                accessibilityLabel={`${s.code}${owned ? `, tenho${dupes ? `, ${dupes} repetidas` : ''}` : ', falta'}`}
              >
                <Text style={[styles.tileNum, owned && styles.tileNumOwned]}>
                  {s.code.replace(/^[A-Z]+/, '') || s.code}
                </Text>
                {owned && (
                  <View style={styles.tileCheck}>
                    <Text style={styles.tileCheckText}>✓</Text>
                  </View>
                )}
                {dupes > 0 && (
                  <View style={styles.tileDupe}>
                    <Text style={styles.tileDupeText}>×{dupes}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 34 },
  subtitle: { color: colors.textDim, fontFamily: fonts.regular, fontSize: 14, marginTop: 2, marginBottom: spacing(4) },

  statsRow: { flexDirection: 'row', gap: spacing(2) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  statValue: { fontFamily: fonts.display, fontSize: 22 },
  statLabel: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 11, marginTop: 2 },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    marginTop: spacing(3),
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },

  markBar: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(4) },
  markInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(4),
    height: 50,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  markBtn: {
    paddingHorizontal: spacing(5),
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markBtnText: { color: colors.ink, fontFamily: fonts.display, fontSize: 15, letterSpacing: 0.5 },
  hint: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, marginTop: spacing(2), marginBottom: spacing(4) },

  tradeBtn: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: spacing(3),
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  tradeBtnText: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(3) },
  segment: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 3, flex: 1 },
  segBtn: { flex: 1, paddingVertical: spacing(2), borderRadius: radius.sm, alignItems: 'center' },
  segBtnActive: { backgroundColor: colors.accent },
  segText: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13 },
  segTextActive: { color: colors.ink, fontFamily: fonts.bold },
  expandLink: { color: colors.textDim, fontFamily: fonts.semibold, fontSize: 13 },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(3) },
  sectionFlag: { fontSize: 22 },
  flex1: { flex: 1 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  sectionCode: { color: colors.textFaint, fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1, marginTop: 1 },
  sectionCount: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionCountDone: { backgroundColor: colors.accentDeep, borderColor: colors.accentDeep },
  sectionCountText: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 13 },
  sectionCountTextDone: { color: colors.white },
  chevron: { color: colors.textDim, fontFamily: fonts.bold, fontSize: 14, width: 16, textAlign: 'center' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.sm,
    backgroundColor: colors.bgElev,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileOwned: { backgroundColor: colors.surface2, borderColor: colors.accent },
  tileFoil: { borderColor: colors.amber },
  tileNum: { color: colors.textFaint, fontFamily: fonts.display, fontSize: 18 },
  tileNumOwned: { color: colors.text },
  tileCheck: {
    position: 'absolute',
    top: -5,
    left: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tileCheckText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10 },
  tileDupe: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tileDupeText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 10 },

  toast: {
    position: 'absolute',
    bottom: spacing(6),
    alignSelf: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
    borderRadius: radius.pill,
  },
  toastText: { color: colors.ink, fontFamily: fonts.bold, fontSize: 14 },
});
