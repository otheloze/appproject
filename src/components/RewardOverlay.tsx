import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  variant: 'habit' | 'challenge';
  habitName: string;
  onDone: () => void;
};

const HABIT_SPARKS = ['✨', '⭐', '🔥', '✨', '⭐', '🔥'];
const CHALLENGE_SPARKS = ['🎉', '🏆', '✨', '🎉', '⭐', '🎊', '✨', '🏆'];

export function RewardOverlay({ variant, habitName, onDone }: Props) {
  const habitPlayer = useAudioPlayer(require('../../assets/sounds/habit-complete.wav'));
  const challengePlayer = useAudioPlayer(require('../../assets/sounds/challenge-complete.wav'));

  // Lazily-initialized state (not refs) so this component satisfies the
  // "no ref access during render" lint rule; identity is still stable across
  // re-renders since the initializer only runs once, same as a ref would.
  const [scale] = useState(() => new Animated.Value(0.6));
  const [opacity] = useState(() => new Animated.Value(0));
  const sparkGlyphs = variant === 'challenge' ? CHALLENGE_SPARKS : HABIT_SPARKS;
  const [sparkAnims] = useState(() =>
    sparkGlyphs.map(() => ({ translate: new Animated.Value(0), opacity: new Animated.Value(1) }))
  );

  useEffect(() => {
    let heavyHapticTimer: ReturnType<typeof setTimeout> | undefined;
    if (variant === 'challenge') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      heavyHapticTimer = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
      challengePlayer.seekTo(0);
      challengePlayer.play();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      habitPlayer.seekTo(0);
      habitPlayer.play();
    }

    const burstDuration = variant === 'challenge' ? 800 : 600;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 180,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ...sparkAnims.map((s) =>
        Animated.parallel([
          Animated.timing(s.translate, {
            toValue: 1,
            duration: burstDuration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(s.opacity, { toValue: 0, duration: burstDuration, useNativeDriver: true }),
        ])
      ),
    ]).start();

    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    if (variant === 'habit') {
      dismissTimer = setTimeout(onDone, 750);
    }
    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
      if (heavyHapticTimer) clearTimeout(heavyHapticTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sparks = sparkAnims.map((s, i) => {
    const angle = (i / sparkAnims.length) * Math.PI * 2;
    const distance = variant === 'challenge' ? 140 : 70;
    const translateX = s.translate.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.cos(angle) * distance],
    });
    const translateY = s.translate.interpolate({
      inputRange: [0, 1],
      outputRange: [0, Math.sin(angle) * distance],
    });
    return (
      <Animated.Text
        key={i}
        style={[styles.spark, { opacity: s.opacity, transform: [{ translateX }, { translateY }] }]}
      >
        {sparkGlyphs[i]}
      </Animated.Text>
    );
  });

  if (variant === 'challenge') {
    return (
      <View style={styles.blockingBackdrop}>
        <View style={styles.sparkField}>{sparks}</View>
        <Animated.View style={[styles.challengeCard, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.challengeTitle}>3-day streak locked in!</Text>
          <Text style={styles.challengeSubtitle}>{habitName}</Text>
          <Pressable style={styles.dismissButton} onPress={onDone}>
            <Text style={styles.dismissButtonText}>Nice!</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.habitOverlay} pointerEvents="none">
      <View style={styles.sparkField}>{sparks}</View>
      <Animated.View style={[styles.habitBadge, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.habitBadgeText}>✓</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  habitOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitBadgeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background,
  },
  sparkField: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    fontSize: 22,
  },
  blockingBackdrop: {
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
  challengeCard: {
    width: '80%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  trophy: {
    fontSize: 56,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  challengeSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 24,
  },
  dismissButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  dismissButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
