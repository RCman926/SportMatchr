import type { ReactNode } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { theme, cardShadow, softShadow } from '../constants/theme';
import { CITY_PHOTO, sportPhoto } from '../lib/sportPhotos';
import { sportVisual } from '../lib/sportVisual';
import { KenBurns, enterUp, layoutSpring } from './motion';

/** Full-bleed photo of the place — the card is the picture. */
export function SportScene({
  sport,
  height = 160,
  label = true,
  compact = false,
}: {
  sport: string | null | undefined;
  height?: number;
  label?: boolean;
  compact?: boolean;
}) {
  const vis = sportVisual(sport);
  const drift = !compact && height >= 148;
  return (
    <View style={[styles.scene, { height, backgroundColor: vis.ground }]}>
      <KenBurns active={drift}>
        <Image source={sportPhoto(sport)} style={styles.photo} resizeMode="cover" />
      </KenBurns>
      <View style={[styles.shade, drift && styles.shadeRich]} />
      {label && sport ? (
        <View style={styles.caption}>
          <Text style={[styles.captionText, compact && styles.captionCompact]} numberOfLines={2}>
            {sport}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Page banner — sport photo when filtered, Ottawa park otherwise. */
export function PageHero({
  sport,
  caption,
  title,
  height = 152,
}: {
  sport?: string | null;
  caption?: string;
  title?: string;
  height?: number;
}) {
  return (
    <Animated.View entering={enterUp(0)} style={[styles.heroLift, cardShadow]}>
      <View style={[styles.scene, styles.hero, { height }]}>
      <KenBurns active>
        <Image
          source={sport ? sportPhoto(sport) : CITY_PHOTO}
          style={styles.photo}
          resizeMode="cover"
        />
      </KenBurns>
      <View style={[styles.shade, styles.shadeRich]} />
      <View style={styles.heroCopy}>
        {title ? (
          <Text style={styles.heroTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {caption ? (
          <Text style={styles.captionText} numberOfLines={2}>
            {caption}
          </Text>
        ) : null}
      </View>
      </View>
    </Animated.View>
  );
}

export function SportPoster({
  sport,
  selected,
  width = 176,
  height = 140,
}: {
  sport: string;
  selected?: boolean;
  width?: number | `${number}%`;
  height?: number;
}) {
  return (
    <View style={[styles.poster, { width }, selected && styles.posterOn]}>
      <SportScene sport={sport} height={height} compact />
    </View>
  );
}

export function SportSceneStrip({
  sports,
  height = 168,
}: {
  sports: string[];
  height?: number;
}) {
  const shown = sports.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <View style={styles.stripRow}>
      {shown.map((s) => (
        <View key={s} style={styles.stripCell}>
          <SportScene sport={s} height={height} compact />
        </View>
      ))}
    </View>
  );
}

export function SportBox({
  sport,
  children,
}: {
  sport: string;
  children: ReactNode;
}) {
  const vis = sportVisual(sport);
  return (
    <Animated.View
      entering={enterUp(40)}
      layout={layoutSpring}
      style={[styles.boxLift, cardShadow]}
    >
      <View style={[styles.box, { borderColor: vis.border }]}>
        <SportScene sport={sport} height={168} />
        <View style={styles.boxBody}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 21, 16, 0.28)',
  },
  shadeRich: {
    ...(Platform.OS === 'web'
      ? {
          backgroundColor: 'transparent',
          backgroundImage:
            'linear-gradient(180deg, rgba(14,21,16,0.08) 0%, rgba(14,21,16,0.22) 42%, rgba(14,21,16,0.68) 100%)',
        }
      : { backgroundColor: 'rgba(14, 21, 16, 0.38)' }),
  },
  caption: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(14, 21, 16, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroCopy: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(14, 21, 16, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.displayBold,
    fontSize: 26,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  captionText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  captionCompact: {
    fontSize: 13,
  },
  poster: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  posterOn: {
    borderColor: theme.ball,
    ...softShadow,
  },
  boxLift: {
    marginBottom: 14,
    borderRadius: theme.radius.lg,
  },
  box: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  boxBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  stripRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stripCell: {
    flex: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    minWidth: 0,
  },
  heroLift: {
    marginBottom: 12,
    borderRadius: theme.radius.lg,
  },
  hero: {
    borderRadius: theme.radius.lg,
  },
});
