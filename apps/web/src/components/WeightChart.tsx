import type { WeightLog } from '../../../../packages/shared/model';
import { kgToUnit } from '../../../../packages/shared/model';
import { movingAverage } from '../../../../packages/shared/analytics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Empty } from './UI';
export default function WeightChart({
  weights,
  unit = 'kg',
  height = 220,
  from,
}: {
  weights: WeightLog[];
  unit?: 'kg' | 'lb';
  height?: number;
  from?: string;
}) {
  const data = movingAverage(weights)
    .filter((w) => !from || w.date >= from)
    .map((w) => ({
      ...w,
      weight: Number(kgToUnit(w.weight, unit).toFixed(1)),
      average: Number(kgToUnit(w.average, unit).toFixed(1)),
    }));
  if (!data.length)
    return (
      <Empty
        title="Your trend starts here"
        description="Add your first weigh-in to see your progress."
      />
    );
  return (
    <div
      className="chart"
      style={{ height }}
      role="img"
      aria-label={`Weight chart showing ${weights.length} measurements in ${unit}. Latest weight ${data.at(-1)?.weight}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => d.slice(5)}
            axisLine={false}
            tickLine={false}
            minTickGap={42}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <YAxis
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tickFormatter={(v) => Number(v).toFixed(1)}
            axisLine={false}
            tickLine={false}
            width={60}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              color: 'var(--text)',
            }}
          />
          <Line
            name={`Weight (${unit})`}
            type="monotone"
            dataKey="weight"
            stroke="var(--chart-soft)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            name="7-day average"
            type="monotone"
            dataKey="average"
            stroke="var(--accent)"
            strokeWidth={2.5}
            dot={data.length === 1}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
