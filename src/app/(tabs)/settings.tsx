import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  cancelAllNudges,
  getCurrentPermissionStatus,
  requestNotificationPermission,
} from '../../lib/notifications';
import { getNotificationPrefs, setNotificationPrefs } from '../../lib/storage';
import { colors } from '../../theme/colors';
import type { NotificationPermissionStatus } from '../../types';

export default function SettingsScreen() {
  const [enabled, setEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [prefs, osStatus] = await Promise.all([getNotificationPrefs(), getCurrentPermissionStatus()]);
      setEnabled(prefs.enabled && osStatus === 'granted');
      setPermissionStatus(osStatus as NotificationPermissionStatus);
      setLoaded(true);
    })();
  }, []);

  const handleToggle = async (next: boolean) => {
    if (next) {
      const granted = await requestNotificationPermission();
      setEnabled(granted);
      setPermissionStatus(granted ? 'granted' : 'denied');
    } else {
      setEnabled(false);
      const prefs = await getNotificationPrefs();
      await setNotificationPrefs({ ...prefs, enabled: false });
      await cancelAllNudges();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Daily reminders</Text>
          <Text style={styles.rowSubtitle}>
            {permissionStatus === 'denied'
              ? 'Notifications are blocked in system settings.'
              : 'A quick nudge if a habit is still pending today.'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={!loaded}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  rowText: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
