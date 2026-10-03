import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dumbbell, Footprints, Flame, Check, Save, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { api } from '../api';
import { PageTitle, NumberField, StatusMark } from '../components/UI';
import {
  dateSchema,
  emptyLog,
  kgToUnit,
  unitToKg,
  type DailyInput,
  type Status,
} from '../../../../packages/shared/model';
export default function Daily() {
  const { data, refresh } = useApp();
  const params = useParams(),
    navigate = useNavigate();
  const date = params.date ?? data!.today;
  const existing = data!.logs.find((l) => l.date === date);
  const initial = {
    ...(existing ?? emptyLog(data!.user.calorieTarget)),
    weight: data!.weights.find((w) => w.date === date)?.weight ?? null,
  };
  const [form, setForm] = useState<DailyInput>(initial),
    [busy, setBusy] = useState(false),
    [details, setDetails] = useState(false);
  useEffect(() => {
    const old = data!.logs.find((l) => l.date === date);
    setForm({
      ...(old ?? emptyLog(data!.user.calorieTarget)),
      weight: data!.weights.find((w) => w.date === date)?.weight ?? null,
    });
  }, [date, data]);
  const valid = dateSchema.safeParse(date).success;
  if (!valid)
    return (
      <p>
        Invalid calendar date. <button onClick={() => navigate('/calendar')}>Go to calendar</button>
      </p>
    );
  const set = <K extends keyof DailyInput>(key: K, value: DailyInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const diet =
    form.autoDiet && form.calories !== null
      ? form.calories <= form.calorieTarget
        ? 'done'
        : 'missed'
      : form.diet;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/logs/${date}`, {
        method: 'PUT',
        body: {
          gym: form.gym,
          cardio: form.cardio,
          diet: form.diet,
          calories: form.calories,
          calorieTarget: form.calorieTarget,
          autoDiet: form.autoDiet,
          weight: form.weight,
          workoutStart: form.workoutStart,
          workoutEnd: form.workoutEnd,
          cardioDuration: form.cardioDuration,
          cardioNotes: form.cardioNotes,
          workoutNotes: form.workoutNotes,
          notes: form.notes,
          foodPhoto: form.foodPhoto,
          progressPhoto: form.progressPhoto,
        },
      });
      await refresh();
      toast.success('Your check-in is saved. Keep going.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ONE DAY AT A TIME"
        title={date === data!.today ? 'Today is a fresh start.' : 'Your daily check-in.'}
        description="A quick check-in. An honest picture."
        action={
          <label className="date-picker">
            <span className="sr-only">Log date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && navigate(`/log/${e.target.value}`)}
            />
          </label>
        }
      />
      <form onSubmit={submit} className="daily-form">
        <section className="panel">
          <h2>Your three commitments</h2>
          <p className="muted">Choose what reflects your day. Rest is part of the plan.</p>
          <div className="commitments">
            {[
              { key: 'gym' as const, name: 'Gym', icon: Dumbbell },
              { key: 'cardio' as const, name: 'Cardio', icon: Footprints },
              { key: 'diet' as const, name: 'Diet target', icon: Flame },
            ].map(({ key, name, icon: Icon }) => (
              <fieldset className="commitment" key={key}>
                <legend>
                  <Icon size={19} />
                  {name}
                  <StatusMark state={key === 'diet' ? diet : form[key]} />
                </legend>
                <div className="segmented status-select">
                  {(['done', 'missed', 'rest', 'pending'] as Status[]).map((state) => (
                    <label key={state} className={form[key] === state ? 'selected' : ''}>
                      <input
                        type="radio"
                        name={key}
                        checked={form[key] === state}
                        disabled={key === 'diet' && form.autoDiet && form.calories !== null}
                        onChange={() => set(key, state)}
                      />
                      {state === 'done'
                        ? 'Done'
                        : state === 'missed'
                          ? 'Missed'
                          : state === 'rest'
                            ? 'Rest'
                            : 'Not yet'}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Fuel & progress</h2>
          <div className="form-grid three">
            <NumberField
              label="Calories eaten"
              unit="kcal"
              value={form.calories}
              onChange={(n) => set('calories', n)}
              max={20000}
            />
            <NumberField
              label="Calorie target"
              unit="kcal"
              value={form.calorieTarget}
              onChange={(n) => set('calorieTarget', n ?? 1800)}
              min={500}
              required
            />
            <NumberField
              label="Weight"
              unit={data!.user.unit}
              value={
                form.weight === null
                  ? null
                  : Number(kgToUnit(form.weight, data!.user.unit).toFixed(2))
              }
              onChange={(n) => set('weight', n === null ? null : unitToKg(n, data!.user.unit))}
              min={kgToUnit(20, data!.user.unit)}
              max={kgToUnit(500, data!.user.unit)}
              step="0.01"
            />
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.autoDiet}
              onChange={(e) => set('autoDiet', e.target.checked)}
            />
            <span>Mark diet automatically when calories are within target</span>
          </label>
          <p className="field-hint">
            This day keeps its own calorie target, even if you change your profile later.
          </p>
        </section>
        <section className="panel">
          <button
            type="button"
            className="details-toggle"
            aria-expanded={details}
            onClick={() => setDetails(!details)}
          >
            <div>
              <h2>A little more detail</h2>
              <p className="muted">Workout times, cardio, notes & photo links. All optional.</p>
            </div>
            <ChevronDown size={20} className={details ? 'rotate' : ''} />
          </button>
          {details && (
            <div className="details-body">
              <div className="form-grid three">
                <label className="field">
                  <span>Workout start</span>
                  <input
                    type="time"
                    value={form.workoutStart ?? ''}
                    onChange={(e) => set('workoutStart', e.target.value || null)}
                  />
                </label>
                <label className="field">
                  <span>Workout end</span>
                  <input
                    type="time"
                    value={form.workoutEnd ?? ''}
                    onChange={(e) => set('workoutEnd', e.target.value || null)}
                  />
                </label>
                <NumberField
                  label="Cardio duration"
                  unit="min"
                  value={form.cardioDuration}
                  onChange={(n) => set('cardioDuration', n)}
                  max={1440}
                />
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Workout notes</span>
                  <textarea
                    value={form.workoutNotes}
                    maxLength={4000}
                    onChange={(e) => set('workoutNotes', e.target.value)}
                    placeholder="What went well?"
                  />
                </label>
                <label className="field">
                  <span>Cardio notes</span>
                  <textarea
                    value={form.cardioNotes}
                    maxLength={2000}
                    onChange={(e) => set('cardioNotes', e.target.value)}
                    placeholder="A walk, a run, a little movement…"
                  />
                </label>
                <label className="field">
                  <span>Food photo link</span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.foodPhoto ?? ''}
                    onChange={(e) => set('foodPhoto', e.target.value || null)}
                  />
                  {existing?.foodPhoto && (
                    <a href={existing.foodPhoto} target="_blank" rel="noopener noreferrer">
                      Open saved photo
                    </a>
                  )}
                </label>
                <label className="field">
                  <span>Progress photo link</span>
                  <input
                    type="url"
                    placeholder="https://…"
                    value={form.progressPhoto ?? ''}
                    onChange={(e) => set('progressPhoto', e.target.value || null)}
                  />
                  {existing?.progressPhoto && (
                    <a href={existing.progressPhoto} target="_blank" rel="noopener noreferrer">
                      Open saved photo
                    </a>
                  )}
                </label>
              </div>
              <p className="field-hint">
                HTTPS links only. Photos open on their host and stay private within FitTrio.
              </p>
            </div>
          )}
        </section>
        <section className="panel">
          <label className="field">
            <span>A note to yourself</span>
            <textarea
              placeholder="Energy, sleep, wins, or anything on your mind."
              maxLength={4000}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
        </section>
        <div className="sticky-save">
          <span>
            <Check size={15} />
            Your check-in is private
          </span>
          <button type="submit" className="button primary" disabled={busy}>
            <Save size={17} />
            {busy ? 'Saving…' : 'Save check-in'}
          </button>
        </div>
      </form>
    </>
  );
}
