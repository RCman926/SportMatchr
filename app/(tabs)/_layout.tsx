import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        },
        headerTintColor: '#0D9488',
        headerTitleStyle: { fontWeight: '700', color: '#0F172A' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="solos"
        options={{
          title: 'Solos',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>⚡</Text>,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
