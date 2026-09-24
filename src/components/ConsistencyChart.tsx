import { StyleSheet, Text, View } from 'react-native';
import { dateKeyOffset } from '../lib/date';
import { colors } from '../theme/colors';

type Props = {
  completions: Record<string, number>;
  targetCount: number;
  days?: number;
};

const COLUMNS = 7;

function cellColor(ratio: number) {
  if (ratio <= 0) return colors.surface;
  if (ratio < 1) return colors.accent + '55';
  return colors.accent;
}

/** Plain-View calendar heatmap over the last `days` days — no charting library. */
export function ConsistencyChart({ completions, targetCount, days = 28 }: Props) {
  const cells = Array.from({ length: days }, (_, i) => {
    const offset = -(days - 1 - i); // oldest first, today last
    const key = dateKeyOffset(offset);
    const count = completions[key] ?? 0;
    const ratio = targetCount > 0 ? Math.min(1, count / targetCount) : 0;
    return { key, ratio };
  });

  const rows: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += COLUMNS) {
    rows.push(cells.slice(i, i + COLUMNS));
  }

  const completedCount = cells.filter((c) => c.ratio >= 1).length;

  return (
    <View>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell) => (
            <View key={cell.key} style={[styles.cell, { backgroundColor: cellColor(cell.ratio) }]} />
          ))}
        </View>
      ))}
      <Text style={styles.caption}>
        {completedCount} of {days} days fully completed
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 4,
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
