import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

/** Shown once, right after the user's first-ever habit completion — the
 * highest-positive-emotion moment to ask for notification permission. */
export function NotificationSoftAsk({ onAccept, onDecline }: Props) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Keep the momentum going?</Text>
        <Text style={styles.subtitle}>
          We&apos;ll send a quick nudge if a habit&apos;s still pending — nothing if you&apos;re
          already done for the day.
        </Text>
        <Pressable style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Enable reminders</Text>
        </Pressable>
        <Pressable style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineButtonText}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(14, 14, 23, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 19,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  acceptButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  declineButton: {
    paddingVertical: 12,
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
