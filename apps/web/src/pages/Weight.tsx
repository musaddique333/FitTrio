import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { api } from '../api';
import { Metric, NumberField, PageTitle, WeightChart } from '../components/UI';
import { addDays, movingAverage } from '../../../../packages/shared/analytics';
import { kgToUnit, unitToKg } from '../../../../packages/shared/model';
const ranges = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
  { label: 'All time', days: 0 },
];
export default function Weight() {
  const { data, refresh } = useApp();
  const [range, setRange] = useState(30),
    [date, setDate] = useState(data!.today),
    [weight, setWeight] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [removing, setRemoving] = useState<string | null>(null);
  const { weights, user, today } = data!;
  const past = weights.filter((w) => w.date <= today),
    latest = past.at(-1),
    first = past[0];
  const from = range ? addDays(today, 1 - range) : undefined;
  const trend = movingAverage(past).at(-1);
  const display = (n: number | undefined | null) =>
    n === undefined || n === null ? '—' : `${kgToUnit(n, user.unit).toFixed(1)} ${user.unit}`;
  async function save(e: FormEvent) {
    e.preventDefault();
    if (weight === null) return;
    setBusy(true);
    try {
      await api('/weights', {
        method: 'POST',
        body: { date, weight: unitToKg(weight, user.unit) },
      });
      await refresh();
      setWeight(null);
      toast.success('Weigh-in saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(d: string) {
    setBusy(true);
    try {
      await api(`/weights/${d}`, { method: 'DELETE', body: {} });
      await refresh();
      setRemoving(null);
      toast.success('Weigh-in removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PROGRESS, IN PERSPECTIVE"
        title="Follow the trend."
        description="Fluctuations are normal. Consistency tells the story."
      />
      <section className="metric-row">
        <Metric label="Current weight" value={display(latest?.weight)} />
        <Metric label="Starting weight" value={display(first?.weight)} />
        <Metric label="Target weight" value={display(user.targetWeight)} />
        <Metric
          label="Total change"
          value={display(latest && first ? latest.weight - first.weight : null)}
        />
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Your weight journey</h2>
          <span className="muted">7-day average: {display(trend?.average)}</span>
        </div>
        <div className="segmented range-tabs" aria-label="Weight chart range">
          {ranges.map((r) => (
            <button
              key={r.label}
              aria-pressed={range === r.days}
              className={range === r.days ? 'selected' : ''}
              onClick={() => setRange(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <WeightChart weights={past} from={from} unit={user.unit} height={290} />
        <p className="field-hint">
          Average uses available measurements from the preceding seven calendar days. Missing days
          are not estimated.
        </p>
      </section>
      <section className="panel">
        <h2>A quick weigh-in</h2>
        <form className="inline-form" onSubmit={save}>
          <label className="field">
            <span>Weigh-in date</span>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <NumberField
            label="New weight"
            unit={user.unit}
            value={weight}
            onChange={setWeight}
            min={kgToUnit(20, user.unit)}
            max={kgToUnit(500, user.unit)}
            step="0.01"
            required
          />
          <button className="button primary" disabled={busy}>
            <Plus size={17} />
            {busy ? 'Saving…' : 'Save weight'}
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Measurement history</h2>
        {!weights.length ? (
          <p className="muted">Your first weigh-in will appear here.</p>
        ) : (
          <div className="history-list">
            {[...weights].reverse().map((w) => (
              <div className="history-row" key={w.date}>
                <span>{w.date}</span>
                <strong>{display(w.weight)}</strong>
                {removing === w.date ? (
                  <div className="row-actions">
                    <button className="button secondary" onClick={() => setRemoving(null)}>
                      Cancel
                    </button>
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() => void remove(w.date)}
                    >
                      Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    className="icon-button"
                    aria-label={`Delete weight for ${w.date}`}
                    onClick={() => setRemoving(w.date)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
