import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';
import { sportVisual, type SportFamily } from '../lib/sportVisual';

type Size = 'sm' | 'md' | 'lg';

const DIM: Record<Size, number> = { sm: 22, md: 36, lg: 48 };

/** Simple court-mark for a sport — color + shape, not emoji tabs. */
export function SportMark({
  sport,
  size = 'md',
}: {
  sport: string | null | undefined;
  size?: Size;
}) {
  const vis = sportVisual(sport);
  const d = DIM[size];
  return (
    <View
      style={[
        styles.wrap,
        {
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: vis.wash,
          borderColor: vis.border,
        },
      ]}
    >
      <Glyph family={vis.family} color={vis.ink} size={d} />
    </View>
  );
}

export function SportNameRow({
  sport,
  size = 'md',
}: {
  sport: string;
  size?: Size;
}) {
  const vis = sportVisual(sport);
  return (
    <View style={styles.nameRow}>
      <SportMark sport={sport} size={size} />
      <Text style={[styles.nameText, { color: vis.ink }]} numberOfLines={1}>
        {sport}
      </Text>
    </View>
  );
}

function Glyph({
  family,
  color,
  size,
}: {
  family: SportFamily;
  color: string;
  size: number;
}) {
  const u = Math.max(3, Math.round(size * 0.14));
  if (family === 'ice') {
    return (
      <View style={styles.center}>
        <View style={[styles.puck, { backgroundColor: color, width: u * 2.4, height: u * 1.1 }]} />
        <View style={[styles.stick, { backgroundColor: color, width: u * 0.55, height: u * 2.6 }]} />
      </View>
    );
  }
  if (family === 'court') {
    return (
      <View
        style={[
          styles.ball,
          {
            width: u * 2.8,
            height: u * 2.8,
            borderRadius: u * 1.4,
            borderColor: color,
          },
        ]}
      >
        <View style={[styles.ballLineH, { backgroundColor: color }]} />
        <View style={[styles.ballLineV, { backgroundColor: color }]} />
      </View>
    );
  }
  if (family === 'field') {
    return (
      <View
        style={[
          styles.hex,
          {
            width: u * 2.6,
            height: u * 2.6,
            borderRadius: u * 0.6,
            backgroundColor: color,
          },
        ]}
      />
    );
  }
  if (family === 'diamond') {
    return (
      <View
        style={[
          styles.diamond,
          {
            width: u * 2.1,
            height: u * 2.1,
            backgroundColor: color,
          },
        ]}
      />
    );
  }
  if (family === 'racket') {
    return (
      <View style={styles.center}>
        <View
          style={[
            styles.oval,
            {
              width: u * 2.2,
              height: u * 2.8,
              borderRadius: u * 1.2,
              borderColor: color,
            },
          ]}
        />
        <View style={[styles.handle, { backgroundColor: color, width: u * 0.45, height: u * 1.3 }]} />
      </View>
    );
  }
  if (family === 'disc') {
    return (
      <View
        style={[
          styles.ring,
          {
            width: u * 2.8,
            height: u * 2.8,
            borderRadius: u * 1.4,
            borderColor: color,
            borderWidth: Math.max(2, u * 0.55),
          },
        ]}
      />
    );
  }
  if (family === 'water') {
    return (
      <View style={styles.center}>
        <View style={[styles.wave, { backgroundColor: color, width: u * 2.6, height: u * 0.45 }]} />
        <View
          style={[
            styles.wave,
            { backgroundColor: color, width: u * 2.1, height: u * 0.45, marginTop: u * 0.45, opacity: 0.7 },
          ]}
        />
      </View>
    );
  }
  if (family === 'path') {
    return (
      <View style={styles.center}>
        <View style={[styles.chev, { borderLeftColor: color, borderBottomColor: color, width: u * 1.6, height: u * 1.6 }]} />
      </View>
    );
  }
  if (family === 'snow') {
    return (
      <View
        style={[
          styles.plus,
          { width: u * 0.5, height: u * 2.6, backgroundColor: color, transform: [{ rotate: '20deg' }] },
        ]}
      />
    );
  }
  if (family === 'climb') {
    return (
      <View style={styles.center}>
        <View style={[styles.block, { backgroundColor: color, width: u * 1.2, height: u * 1.2 }]} />
        <View
          style={[
            styles.block,
            { backgroundColor: color, width: u * 0.9, height: u * 0.9, marginTop: 2, marginLeft: u * 0.8, opacity: 0.75 },
          ]}
        />
      </View>
    );
  }
  if (family === 'quiet') {
    return (
      <View
        style={[
          styles.sun,
          {
            width: u * 2.4,
            height: u * 2.4,
            borderRadius: u * 1.2,
            backgroundColor: color,
            opacity: 0.9,
          },
        ]}
      />
    );
  }
  if (family === 'lawn') {
    return (
      <View style={styles.center}>
        <View style={[styles.flag, { backgroundColor: color, width: u * 0.4, height: u * 2.6 }]} />
        <View
          style={[
            styles.flagTip,
            { borderBottomColor: color, borderLeftWidth: u * 1.3, borderBottomWidth: u * 0.9 },
          ]}
        />
      </View>
    );
  }
  // gym
  return (
    <View style={styles.center}>
      <View style={[styles.bar, { backgroundColor: color, width: u * 2.6, height: u * 0.45 }]} />
      <View style={[styles.barEnd, { backgroundColor: color, width: u * 0.7, height: u * 1.5 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  puck: { borderRadius: 99 },
  stick: { borderRadius: 2, marginTop: 2 },
  ball: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballLineH: { position: 'absolute', height: 1.5, left: 3, right: 3 },
  ballLineV: { position: 'absolute', width: 1.5, top: 3, bottom: 3 },
  hex: {},
  diamond: { transform: [{ rotate: '45deg' }], borderRadius: 2 },
  oval: { borderWidth: 2 },
  handle: { borderRadius: 2, marginTop: 1 },
  ring: {},
  wave: { borderRadius: 99 },
  chev: {
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    transform: [{ rotate: '-45deg' }],
  },
  plus: { borderRadius: 2 },
  block: { borderRadius: 3 },
  sun: {},
  flag: { borderRadius: 2, position: 'absolute', left: 4 },
  flagTip: {
    borderLeftColor: 'transparent',
    marginLeft: 8,
    marginBottom: 8,
  },
  bar: { borderRadius: 99 },
  barEnd: { position: 'absolute', right: 2, borderRadius: 2 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  nameText: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});
