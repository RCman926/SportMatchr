import { ScrollView, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { theme } from '../constants/theme';
import { PageHero } from '../components/SportScene';

export default function LegalScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.pad}>
      <Stack.Screen options={{ title: 'Terms & privacy' }} />

      <PageHero caption="Ottawa · pickup" height={128} />
      <Text style={styles.kicker}>Ottawa · pickup</Text>
      <Text style={styles.h1}>How this app works</Text>
      <Text style={styles.p}>
        SportMatchr helps people in Ottawa find a game or a quiet movement session at a free
        public place — parks, courts, fields, rinks, lawns. It is not a dating app. Meet at the
        mapped public place only. Never share a home address.
      </Text>

      <Text style={styles.h2}>Using the app</Text>
      <Text style={styles.p}>
        You must be 18 or older. You’re responsible for how you show up: be decent, leave if it
        feels off, and use Report in chat if someone crosses a line. Hosts can remove players from
        a game. We can close accounts that abuse people or the product.
      </Text>
      <Text style={styles.p}>
        Games are organized by people, not by us. We don’t guarantee anyone will be there, or that
        a session is safe. Public parks have their own rules.
      </Text>

      <Text style={styles.h2}>What we store</Text>
      <Text style={styles.p}>
        If you create an account we keep your email, display name, optional face photo, sports you
        pick, and games you host or join. Sign in with Google shares the name, email, and photo
        Google already has for that account — we don’t get your Google password. Chat in a game is
        stored so the group can coordinate.
        Location is used for “near you” distances. Go Live shares a coarsened area (~150 m), not
        your exact pin. Presence (“online”) is a short heartbeat from this device — it is not a
        promise that two strangers are in Ottawa.
      </Text>
      <Text style={styles.p}>
        We use this to run the matcher (auth, profiles, sessions, chat, safety). We don’t sell your
        list. We don’t collect gender or age on your profile. Hosts may label a game (for example
        female only) — that’s a host note, not a background check.
      </Text>
      <Text style={styles.p}>
        You can permanently delete your account from You → Delete account permanently. This removes
        your profile and associated app activity. Some operational logs may remain briefly with our
        infrastructure providers for security and reliability.
      </Text>

      <Text style={styles.h2}>Your copy, our copy</Text>
      <Text style={styles.p}>
        The SportMatchr name, screens, and text are ours. You’re invited to use the live app, not
        to copy the product as your own. Third-party libraries (including Expo) keep their own
        licenses.
      </Text>

      <Text style={styles.foot}>
        This page is a plain-language summary for testers, not a substitute for a lawyer. Last
        updated 22 Sep 2026.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16, paddingBottom: 40 },
  kicker: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    color: theme.accentDark,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontFamily: theme.fonts.displayBold,
    fontSize: 28,
    color: theme.ink,
    marginBottom: 12,
  },
  h2: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
    color: theme.ink,
    marginTop: 18,
    marginBottom: 8,
  },
  p: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.muted,
    lineHeight: 22,
    marginBottom: 10,
  },
  foot: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.mutedSoft,
    lineHeight: 18,
    marginTop: 16,
  },
});
