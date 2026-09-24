import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import { motion } from '../../constants/motion';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  const mark = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    mark.value = withSpring(focused ? 1 : 0, {
      ...motion.springSoft,
      reduceMotion: ReduceMotion.System,
    });
  }, [focused, mark]);
  const bar = useAnimatedStyle(() => ({
    width: 6 + mark.value * 14,
    opacity: 0.35 + mark.value * 0.65,
  }));

  return (
    <View style={styles.tabWrap}>
      <Text style={[styles.tab, focused && styles.tabOn]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View style={[styles.tabMark, bar]} />
    </View>
  );
}

/** Top bar: house → Play. Page titles live in-screen so we don’t double them. */
function HomeHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push('/(tabs)/home')}
      hitSlop={12}
      style={({ pressed }) => [styles.homeBtn, pressed && styles.homeBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel="Home"
    >
      <Text style={styles.homeIcon}>⌂</Text>
      <Text style={styles.homeWord}>Home</Text>
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 10 : 6);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => null,
        headerLeft: () => <HomeHeaderButton />,
        headerStyle: {
          backgroundColor: theme.surfaceRaised,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.accent,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.surfaceRaised,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 0,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.ballDark,
        tabBarInactiveTintColor: theme.mutedSoft,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Play',
          tabBarIcon: () => null,
          tabBarLabel: ({ focused }) => <TabLabel label="Play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="solos"
        options={{
          title: 'Right now',
          tabBarIcon: () => null,
          tabBarLabel: ({ focused }) => <TabLabel label="Now" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Places',
          tabBarIcon: () => null,
          tabBarLabel: ({ focused }) => <TabLabel label="Places" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Your games',
          tabBarIcon: () => null,
          tabBarLabel: ({ focused }) => <TabLabel label="Games" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: () => null,
          tabBarLabel: ({ focused }) => <TabLabel label="You" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    alignItems: 'center',
    minWidth: 44,
  },
  tab: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  tabOn: {
    color: theme.ballDark,
    fontFamily: theme.fonts.bodyBold,
  },
  tabMark: {
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.ball,
    marginTop: 4,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  homeBtnPressed: {
    backgroundColor: theme.accentSoft,
  },
  homeIcon: {
    fontSize: 22,
    color: theme.accentDark,
    lineHeight: 24,
    marginTop: -2,
  },
  homeWord: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 15,
    color: theme.ink,
    letterSpacing: -0.2,
  },
});
