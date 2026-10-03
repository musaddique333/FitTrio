import { Check, Minus, Circle, X, ArrowUpRight, Activity } from 'lucide-react';
import type { Status, WeightLog } from '../../../../packages/shared/model';
import { lazy, Suspense, type ReactNode } from 'react';
export function StatusMark({ state, label }: { state: Status; label?: string }) {
  const Icon =
    state === 'done' ? Check : state === 'rest' ? Minus : state === 'missed' ? X : Circle;
  return (
    <span
      className={`status status-${state}`}
      title={label ? `${label}: ${state}` : state}
      aria-label={label ? `${label}: ${state}` : state}
    >
      <Icon size={14} />
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Activity size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
const Chart = lazy(() => import('./WeightChart'));
export function WeightChart(props: {
  weights: WeightLog[];
  unit?: 'kg' | 'lb';
  height?: number;
  from?: string;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="skeleton"
          style={{ height: props.height ?? 220 }}
          aria-label="Loading weight chart"
        />
      }
    >
      <Chart {...props} />
    </Suspense>
  );
}
export function Metric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}
export function SectionHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {aside}
    </div>
  );
}
export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children}
      <ArrowUpRight size={14} />
    </span>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-page" aria-label="Loading your fitness data" aria-busy="true">
      <div className="skeleton title" />
      <div className="skeleton banner" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="skeleton block" key={i} />
        ))}
      </div>
      <div className="skeleton banner" />
    </div>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
  step = '1',
  unit,
  required = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: string;
  unit?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {unit && <small>{unit}</small>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        required={required}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  );
}
