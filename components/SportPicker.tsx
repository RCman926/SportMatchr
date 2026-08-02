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
  OttawaSport,
} from '../constants/sports';

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

  const selectedList: string[] = isSingle(props)
    ? props.selected
      ? [props.selected]
      : []
    : props.selected;

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(OTTAWA_SPORT_CATEGORIES)
      .map(([category, sports]) => ({
        category,
        sports: (sports as readonly OttawaSport[]).filter(
          (s) => !q || s.toLowerCase().includes(q)
        ),
      }))
      .filter((c) => c.sports.length > 0);
  }, [query]);

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

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.85}>
          <Text style={styles.edit}>{isSingle(props) ? 'Choose' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

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
              style={styles.chipOn}
              onPress={() => setOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.chipOnText}>{s}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

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

          {!query && (
            <View style={styles.seasonTabs}>
              {(['Winter', 'Summer', 'Year-round'] as const).map((season) => (
                <View key={season} style={styles.seasonPill}>
                  <Text style={styles.seasonPillText}>{season}</Text>
                </View>
              ))}
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {!query &&
              (Object.keys(OTTAWA_POPULAR_BY_SEASON) as (keyof typeof OTTAWA_POPULAR_BY_SEASON)[]).map(
                (season) => (
                  <View key={`pop-${season}`} style={styles.block}>
                    <Text style={styles.cat}>Popular · {season}</Text>
                    <View style={styles.chipsWrap}>
                      {OTTAWA_POPULAR_BY_SEASON[season].map((s) => {
                        const on = selectedList.includes(s);
                        return (
                          <TouchableOpacity
                            key={s}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => toggle(s)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.chipText, on && styles.chipOnText]}>{s}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              )}

            {filteredCategories.map(({ category, sports }) => (
              <View key={category} style={styles.block}>
                <Text style={styles.cat}>{category} sports</Text>
                <View style={styles.chipsWrap}>
                  {sports.map((s) => {
                    const on = selectedList.includes(s);
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chip, on && styles.chipOn]}
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

/** Horizontal filter chips — swipe / scroll sideways to see all sports */
export function SportFilterBar({
  selected,
  onChange,
  includeAll = true,
}: {
  selected: string | null;
  onChange: (sport: string | null) => void;
  includeAll?: boolean;
}) {
  const chips = useMemo(() => {
    const seasonal = getSeasonalPopularSports();
    const rest = OTTAWA_POPULAR_SPORTS.filter((s) => !seasonal.includes(s));
    return [...seasonal, ...rest];
  }, []);

  return (
    <View style={styles.filterWrap}>
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
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, on && styles.filterChipOn]}
              onPress={() => onChange(on ? null : s)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, on && styles.filterTextOn]} numberOfLines={1}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text style={styles.scrollHint}>Swipe for more activities — volleyball, shinny, tai chi…</Text>
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
    color: '#0D9488',
    fontWeight: '700',
    fontSize: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    color: '#0D9488',
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
  seasonTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  seasonPill: {
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  seasonPillText: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 11,
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
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipOn: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterChipOn: {
    backgroundColor: '#E87722',
    borderColor: '#E87722',
  },
  filterText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextOn: {
    color: '#FFFFFF',
  },
  scrollHint: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});
