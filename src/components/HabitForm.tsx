import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { formatTimeOfDay, minutesToTimeOfDay, parseTimeOfDay } from '../lib/date';
import { notificationsSupported } from '../lib/notifications';
import { colors } from '../theme/colors';
import type { HabitType } from '../types';

export type HabitFormValues = {
  name: string;
  type: HabitType;
  targetCount: number;
  reminderIntention: string;
  reminderTime: string | null;
};

type Props = {
  initialValues?: Partial<HabitFormValues>;
  submitLabel: string;
  onSubmit: (values: HabitFormValues) => void;
};

const REMINDER_STEP_MINUTES = 30;
const DEFAULT_REMINDER_MINUTES = 9 * 60; // 9:00 AM

export function HabitForm({ initialValues, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [type, setType] = useState<HabitType>(initialValues?.type ?? 'binary');
  const [targetCount, setTargetCount] = useState(initialValues?.targetCount ?? 3);
  const [reminderIntention, setReminderIntention] = useState(initialValues?.reminderIntention ?? '');

  const initialTime = parseTimeOfDay(initialValues?.reminderTime);
  const [reminderEnabled, setReminderEnabled] = useState(!!initialTime);
  const [reminderMinutes, setReminderMinutes] = useState(
    initialTime ? initialTime.hour * 60 + initialTime.minute : DEFAULT_REMINDER_MINUTES
  );

  const canSubmit = name.trim().length > 0 && (type === 'binary' || targetCount >= 2);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      type,
      targetCount: type === 'binary' ? 1 : targetCount,
      reminderIntention: reminderIntention.trim(),
      reminderTime: reminderEnabled ? minutesToTimeOfDay(reminderMinutes) : null,
    });
  };

  const adjustReminderTime = (deltaMinutes: number) => {
    setReminderMinutes((m) => (m + deltaMinutes + 24 * 60) % (24 * 60));
  };

  return (
    <View>
      <Text style={styles.label}>Habit name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Drink water"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
      />

      <Text style={styles.label}>How often per day?</Text>
      <View style={styles.typeRow}>
        <Pressable
          style={[styles.typeOption, type === 'binary' && styles.typeOptionActive]}
          onPress={() => setType('binary')}
        >
          <Text style={[styles.typeOptionText, type === 'binary' && styles.typeOptionTextActive]}>
            Once a day
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeOption, type === 'count' && styles.typeOptionActive]}
          onPress={() => setType('count')}
        >
          <Text style={[styles.typeOptionText, type === 'count' && styles.typeOptionTextActive]}>
            Multiple times a day
          </Text>
        </Pressable>
      </View>

      {type === 'count' && (
        <View style={styles.stepperRow}>
          <Text style={styles.label}>Target per day</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setTargetCount((c) => Math.max(2, c - 1))}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text style={styles.stepperValue}>{targetCount}</Text>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setTargetCount((c) => Math.min(20, c + 1))}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.label}>What&apos;s the plan? (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. after breakfast, before bed"
        placeholderTextColor={colors.textMuted}
        value={reminderIntention}
        onChangeText={setReminderIntention}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <Text style={styles.label}>Daily reminder</Text>
      {notificationsSupported() ? (
        <>
          <View style={styles.reminderToggleRow}>
            <Text style={styles.reminderToggleLabel}>Remind me at a set time</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
          {reminderEnabled && (
            <View style={[styles.stepper, styles.reminderStepper]}>
              <Pressable style={styles.stepperButton} onPress={() => adjustReminderTime(-REMINDER_STEP_MINUTES)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </Pressable>
              <Text style={styles.reminderTimeValue}>
                {formatTimeOfDay(Math.floor(reminderMinutes / 60), reminderMinutes % 60)}
              </Text>
              <Pressable style={styles.stepperButton} onPress={() => adjustReminderTime(REMINDER_STEP_MINUTES)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.reminderUnsupportedText}>
          Reminders need a development build here — not available in Expo Go on Android.
        </Text>
      )}

      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitButtonText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '22',
  },
  typeOptionText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  typeOptionTextActive: {
    color: colors.accent,
  },
  stepperRow: {
    marginTop: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reminderTimeValue: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
    minWidth: 90,
    textAlign: 'center',
  },
  reminderUnsupportedText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  reminderStepper: {
    marginTop: 12,
  },
  stepperValue: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
});
