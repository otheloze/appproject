import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Step = {
  emoji: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    emoji: '➕',
    title: 'Create a habit',
    body: "Pick something you want to do consistently and add it as either a simple yes/no habit, or a count habit with a daily target (e.g. \"drink 8 glasses of water\").",
  },
  {
    emoji: '✅',
    title: 'Track it daily',
    body: 'Check it off from the Today tab as you go — a yes/no habit completes in one tap, a count habit fills up toward its target as you log each one.',
  },
  {
    emoji: '🚀',
    title: 'Hit your kickstart',
    body: 'New habits can start with a 3-day kickstart challenge to build momentum. Finish all three days in a row and you earn a bigger reward for it.',
  },
  {
    emoji: '📈',
    title: 'Track your progress',
    body: 'The Progress tab shows your streak, best streak, and a calendar heatmap of every day you completed — so you can see your consistency build up over time.',
  },
  {
    emoji: '🔔',
    title: 'Reminders when you need them',
    body: "Turn on daily check-in nudges in Settings for a gentle prompt if a habit is still pending, or set a specific reminder time on any individual habit so it pings you right when you want to act on it.",
  },
];

export default function HowItWorks() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>How this app works</Text>
        <Text style={styles.subtitle}>The core loop, in five steps.</Text>

        {STEPS.map((step) => (
          <View key={step.title} style={styles.step}>
            <Text style={styles.stepEmoji}>{step.emoji}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Got it</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  stepEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  close: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  closeText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
