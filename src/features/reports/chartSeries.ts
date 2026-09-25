import type {ChartSeries} from '../../components/TrendChart';

/** Money columns only. Litres stay in the table so they do not share a rupee axis. */
export function chartSeries(
  headers: string[],
  rows: Array<{label: string; cells: string[]}>,
): ChartSeries[] {
  return headers
    .map((name, index) => ({
      name,
      points: rows.map(row => ({
        label: row.label,
        value: Number(row.cells[index] ?? 0),
      })),
    }))
    .filter(series => series.name !== 'लिटर');
}
