import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.tab, focused && styles.tabOn]} numberOfLines={1}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        headerTintColor: theme.accent,
        headerTitleStyle: {
          fontFamily: theme.fonts.display,
          fontSize: 20,
          color: theme.ink,
          letterSpacing: 0.5,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 58,
          paddingTop: 4,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
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
  tab: {
    fontFamily: theme.fonts.bodyMed,
    fontSize: 12,
    color: theme.muted,
    marginBottom: 8,
  },
  tabOn: {
    color: theme.accent,
    fontFamily: theme.fonts.bodyBold,
  },
});
