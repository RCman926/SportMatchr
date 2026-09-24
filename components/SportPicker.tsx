import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  OTTAWA_SPORT_CATEGORIES,
  OTTAWA_POPULAR_BY_SEASON,
  OTTAWA_POPULAR_SPORTS,
  getSeasonalPopularSports,
  MAP_SPORTS,
  popularSportsForBrowse,
  currentOttawaSeason,
  OttawaSport,
  SportSeason,
} from '../constants/sports';
import { theme } from '../constants/theme';
import { SportPoster } from './SportScene';
import { sportVisual } from '../lib/sportVisual';
import { PressScale } from './motion';

export type BrowseSeason = SportSeason | 'All' | 'In season';

type MultiProps = {
  mode?: 'multi';
  selected: string[];
  onChange: (sports: string[]) => void;
  label?: string;
  max?: number;
};

type SingleProps = {
  mode: 'single';
  selected: string | null;
  onChange: (sport: string | null) => void;
  label?: string;
  allowClear?: boolean;
};

type Props = MultiProps | SingleProps;

function isSingle(props: Props): props is SingleProps {
  return props.mode === 'single';
}

export function SportPicker(props: Props) {
  const label =
    props.label ?? (isSingle(props) ? 'Sport' : 'Sports I play');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [browseSeason, setBrowseSeason] = useState<SportSeason | 'All'>('All');

  const selectedList: string[] = isSingle(props)
    ? props.selected
      ? [props.selected]
      : []
    : props.selected;

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(OTTAWA_SPORT_CATEGORIES)
      .filter(([category]) => browseSeason === 'All' || category === browseSeason)
      .map(([category, sports]) => ({
        category,
        sports: (sports as readonly OttawaSport[]).filter(
          (s) => !q || s.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.sports.length > 0);
  }, [query, browseSeason]);

  const toggle = (sport: OttawaSport) => {
    if (isSingle(props)) {
      const next =
        props.selected === sport ? (props.allowClear ? null : sport) : sport;
      props.onChange(next);
      setOpen(false);
      return;
    }

    const max = props.max ?? 8;
    const exists = props.selected.includes(sport);
    if (exists) {
      props.onChange(props.selected.filter((s) => s !== sport));
      return;
    }
    if (props.selected.length >= max) return;
    props.onChange([...props.selected, sport]);
  };

  const quickPicks = useMemo(() => {
    if (!isSingle(props)) return [] as OttawaSport[];
    const seasonal = getSeasonalPopularSports();
    const rest = OTTAWA_POPULAR_SPORTS.filter((s) => !seasonal.includes(s));
    const merged = [...seasonal, ...rest];
    // Keep selected visible even if it isn't in the popular list
    if (props.selected && !merged.includes(props.selected as OttawaSport)) {
      return [props.selected as OttawaSport, ...merged];
    }
    return merged;
  }, [props]);

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Text style={styles.edit}>{isSingle(props) ? 'All activities' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {isSingle(props) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          {quickPicks.map((s) => {
            const on = props.selected === s;
            return (
              <PressScale key={s} onPress={() => props.onChange(s)} accessibilityLabel={s}>
                <SportPoster sport={s} selected={on} />
              </PressScale>
            );
          })}
          <TouchableOpacity
            style={styles.moreChip}
            onPress={() => setOpen(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.moreChipText}>More…</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.chips}>
          {selectedList.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyChip}
              onPress={() => setOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyChipText}>Tap to pick sports</Text>
            </TouchableOpacity>
          ) : (
            selectedList.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chipOn, { backgroundColor: sportVisual(s).ink, borderColor: sportVisual(s).ink }]}
                onPress={() => setOpen(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.chipOnText}>{s}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isSingle(props) ? 'Pick a sport' : 'Pick your sports'}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.85}>
              <Text style={styles.done}>Done</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.search}
            placeholder="Search Ottawa sports…"
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />

          <Text style={styles.seasonNote}>
            Browse by season anytime — shinny / hockey stay available in summer when you can rent
            ice.
          </Text>

          {!query ? (
            <View style={styles.seasonTabs}>
              {(['All', 'Winter', 'Summer', 'Year-round'] as const).map((season) => {
                const on = browseSeason === season;
                return (
                  <TouchableOpacity
                    key={season}
                    style={[styles.seasonPill, on && styles.seasonPillOn]}
                    onPress={() => setBrowseSeason(season)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.seasonPillText, on && styles.seasonPillTextOn]}>
                      {season}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {!query &&
              (browseSeason === 'All'
                ? (['Winter', 'Summer', 'Year-round'] as SportSeason[])
                : [browseSeason]
              ).map((season) => (
                <View key={`pop-${season}`} style={styles.block}>
                  <Text style={styles.cat}>Popular · {season}</Text>
                  <View style={styles.chipsWrap}>
                    {OTTAWA_POPULAR_BY_SEASON[season].map((s) => {
                      const on = selectedList.includes(s);
                      const vis = sportVisual(s);
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.chip,
                            on && styles.chipOn,
                            { backgroundColor: on ? vis.ink : vis.wash, borderColor: on ? vis.ink : vis.border },
                          ]}
                          onPress={() => toggle(s)}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.chipText, on && styles.chipOnText]}>{s}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

            {filteredCategories.map(({ category, sports }) => (
              <View key={category} style={styles.block}>
                <Text style={styles.cat}>{category} sports</Text>
                <View style={styles.chipsWrap}>
                  {sports.map((s) => {
                    const on = selectedList.includes(s);
                    const vis = sportVisual(s);
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.chip,
                          on && styles.chipOn,
                          { backgroundColor: on ? vis.ink : vis.wash, borderColor: on ? vis.ink : vis.border },
                        ]}
                        onPress={() => toggle(s)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.chipText, on && styles.chipOnText]}>{s}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** Horizontal filter chips — season browse + compact sport posters */
export function SportFilterBar({
  selected,
  onChange,
  includeAll = true,
  onBrowseChange,
  variant = 'browse',
}: {
  selected: string | null;
  onChange: (sport: string | null) => void;
  includeAll?: boolean;
  onBrowseChange?: (browse: BrowseSeason) => void;
  /** Map: only facility basics. Browse: seasonal popular chips. */
  variant?: 'browse' | 'map';
}) {
  const [browse, setBrowse] = useState<BrowseSeason>('In season');

  const chips = useMemo(() => {
    if (variant === 'map') return [...MAP_SPORTS];
    const lead = popularSportsForBrowse(browse);
    const rest = OTTAWA_POPULAR_SPORTS.filter((s) => !lead.includes(s));
    if (browse === 'All' || browse === 'In season') return [...lead, ...rest];
    return lead;
  }, [browse, variant]);

  const now = currentOttawaSeason();

  const pickBrowse = (key: BrowseSeason) => {
    setBrowse(key);
    onBrowseChange?.(key);
  };

  return (
    <View style={styles.filterWrap}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.seasonScroll}
        contentContainerStyle={styles.seasonRow}
      >
        {(
          [
            ['In season', `Now · ${now}`],
            ['Winter', 'Winter'],
            ['Summer', 'Summer'],
            ['Year-round', 'Year-round'],
            ['All', 'All popular'],
          ] as const
        ).map(([key, label]) => {
          const on = browse === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.seasonChip, on && styles.seasonChipOn]}
              onPress={() => pickBrowse(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.seasonChipText, on && styles.seasonChipTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {includeAll && (
          <TouchableOpacity
            style={[styles.filterChip, !selected && styles.filterChipOn]}
            onPress={() => onChange(null)}
            activeOpacity={0.85}
          >
            <Text style={[styles.filterText, !selected && styles.filterTextOn]}>All</Text>
          </TouchableOpacity>
        )}
        {chips.map((s) => {
          const on = selected === s;
          return (
            <PressScale
              key={s}
              onPress={() => onChange(on ? null : s)}
              accessibilityLabel={s}
            >
              <SportPoster sport={s} selected={on} width={96} height={72} />
            </PressScale>
          );
        })}
      </ScrollView>
      {variant === 'browse' && browse === 'Winter' ? (
        <Text style={styles.scrollHint}>Ice sports when you can book a rink</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  edit: {
    color: '#E87722',
    fontWeight: '700',
    fontSize: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
    paddingRight: 16,
  },
  moreChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8D4CC',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  moreChipText: {
    color: '#5C6B62',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyChip: {
    borderWidth: 1,
    borderColor: '#404040',
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyChipText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  done: {
    color: '#E87722',
    fontWeight: '800',
    fontSize: 16,
  },
  search: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seasonNote: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.muted,
    lineHeight: 17,
    marginBottom: 10,
  },
  seasonTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  seasonPill: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
  },
  seasonPillOn: {
    backgroundColor: theme.accent,
    borderColor: theme.accentDark,
  },
  seasonPillText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
  },
  seasonPillTextOn: {
    color: '#FFFFFF',
  },
  seasonScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  seasonChip: {
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
  },
  seasonChipOn: {
    backgroundColor: theme.accentDark,
    borderColor: theme.accentDark,
  },
  seasonChipText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
  },
  seasonChipTextOn: {
    color: '#FFFFFF',
  },
  block: { marginBottom: 8 },
  cat: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipOn: {
    backgroundColor: '#E87722',
    borderColor: '#E87722',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  chipOnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterWrap: {
    marginBottom: 12,
    zIndex: 2,
  },
  filterScroll: {
    flexGrow: 0,
    width: '100%',
    // @ts-expect-error web CSS
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  filterRow: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 24,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: theme.surfaceRaised,
    borderWidth: 2,
    borderColor: theme.borderStrong,
    width: 72,
    height: 72,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  filterChipOn: {
    backgroundColor: theme.ball,
    borderColor: theme.ballDark,
  },
  filterText: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  filterTextOn: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
  },
  scrollHint: {
    marginTop: 5,
    fontSize: 11,
    color: theme.mutedSoft,
    fontFamily: theme.fonts.bodyMed,
    letterSpacing: 0.2,
  },
});
