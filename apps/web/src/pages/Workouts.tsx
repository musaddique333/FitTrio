import { useState, type FormEvent } from 'react';
import { Dumbbell, Plus, Trash2, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../context';
import { api } from '../api';
import { Empty, NumberField, PageTitle } from '../components/UI';
import type { WorkoutInput } from '../../../../packages/shared/model';
const exercise = () => ({
  name: '',
  sets: 3,
  reps: 10,
  weight: 0,
  unit: 'kg' as 'kg' | 'lb',
  notes: '',
});
export default function Workouts() {
  const { data, refresh } = useApp();
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<WorkoutInput>({
    date: data!.today,
    name: '',
    duration: null,
    notes: '',
    exercises: [{ ...exercise(), unit: data!.user.unit }],
  });
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/workouts', { method: 'POST', body: form });
      await refresh();
      setEditing(false);
      setForm({
        date: data!.today,
        name: '',
        duration: null,
        notes: '',
        exercises: [{ ...exercise(), unit: data!.user.unit }],
      });
      toast.success('Workout saved. Strong work.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await api(`/workouts/${id}`, { method: 'DELETE', body: {} });
      await refresh();
      setDeleting(null);
      toast.success('Workout removed.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="PUT IN THE WORK"
        title="Your training journal."
        description="Remember the reps. Recognize the progress."
        action={
          <button className="button primary" onClick={() => setEditing(!editing)}>
            {editing ? <X size={17} /> : <Plus size={17} />}{' '}
            {editing ? 'Close editor' : 'Add workout'}
          </button>
        }
      />
      {editing && (
        <form className="panel workout-form" onSubmit={save}>
          <h2>A session worth recording</h2>
          <div className="form-grid three">
            <label className="field">
              <span>Workout name</span>
              <input
                placeholder="e.g. Push day"
                required
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Workout date</span>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <NumberField
              label="Duration"
              unit="min"
              value={form.duration}
              max={1440}
              onChange={(n) => setForm({ ...form, duration: n })}
            />
          </div>
          <div className="exercise-list">
            {form.exercises.map((ex, i) => (
              <fieldset className="exercise-editor" key={i}>
                <legend>
                  <span className="exercise-number">{i + 1}</span>Exercise {i + 1}
                </legend>
                <label className="field">
                  <span>Exercise name</span>
                  <input
                    required
                    placeholder="e.g. Bench press"
                    maxLength={120}
                    value={ex.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        exercises: form.exercises.map((r, j) =>
                          j === i ? { ...r, name: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </label>
                <div className="exercise-fields">
                  {(['sets', 'reps', 'weight'] as const).map((key) => (
                    <NumberField
                      key={key}
                      label={key[0].toUpperCase() + key.slice(1)}
                      value={ex[key]}
                      min={key === 'weight' ? 0 : 1}
                      max={key === 'sets' ? 100 : key === 'reps' ? 1000 : 2000}
                      step={key === 'weight' ? '0.5' : '1'}
                      required
                      onChange={(n) =>
                        setForm({
                          ...form,
                          exercises: form.exercises.map((r, j) =>
                            j === i ? { ...r, [key]: n ?? 0 } : r,
                          ),
                        })
                      }
                    />
                  ))}
                  <label className="field">
                    <span>Unit</span>
                    <select
                      value={ex.unit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          exercises: form.exercises.map((r, j) =>
                            j === i ? { ...r, unit: e.target.value as 'kg' | 'lb' } : r,
                          ),
                        })
                      }
                    >
                      <option>kg</option>
                      <option>lb</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove exercise ${i + 1}`}
                    disabled={form.exercises.length === 1}
                    onClick={() =>
                      setForm({ ...form, exercises: form.exercises.filter((_, j) => j !== i) })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
                <label className="field">
                  <span>
                    Exercise notes <small>optional</small>
                  </span>
                  <input
                    value={ex.notes}
                    maxLength={1000}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        exercises: form.exercises.map((r, j) =>
                          j === i ? { ...r, notes: e.target.value } : r,
                        ),
                      })
                    }
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <button
            type="button"
            className="button secondary"
            disabled={form.exercises.length >= 30}
            onClick={() =>
              setForm({
                ...form,
                exercises: [...form.exercises, { ...exercise(), unit: data!.user.unit }],
              })
            }
          >
            <Plus size={16} />
            Add exercise
          </button>
          <label className="field">
            <span>Session notes</span>
            <textarea
              value={form.notes}
              maxLength={4000}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <div className="sticky-save">
            <span>Recording a workout does not change your daily gym status.</span>
            <button className="button primary" disabled={busy}>
              <Check size={17} />
              {busy ? 'Saving…' : 'Save workout'}
            </button>
          </div>
        </form>
      )}
      {!data!.workouts.length && !editing ? (
        <Empty
          title="Your first session is waiting"
          description="Add a workout and build a journal of your strength."
          action={
            <button className="button primary" onClick={() => setEditing(true)}>
              Add a workout
            </button>
          }
        />
      ) : (
        <div className="workout-cards">
          {data!.workouts.map((w) => (
            <article className="panel workout-card" key={w.id}>
              <header>
                <span className="workout-icon">
                  <Dumbbell size={20} />
                </span>
                <div>
                  <h2>{w.name}</h2>
                  <p className="muted">
                    {w.date}
                    {w.duration !== null && (
                      <>
                        {' '}
                        · <Clock size={12} />
                        {w.duration} min
                      </>
                    )}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Delete ${w.name} on ${w.date}`}
                  onClick={() => setDeleting(w.id)}
                >
                  <Trash2 size={16} />
                </button>
              </header>
              {w.exercises.map((e, i) => (
                <div className="exercise-summary" key={i}>
                  <span>{i + 1}</span>
                  <div>
                    <strong>{e.name}</strong>
                    <small>
                      {e.sets} sets × {e.reps} reps{e.notes && ` · ${e.notes}`}
                    </small>
                  </div>
                  <b>
                    {e.weight} <small>{e.unit}</small>
                  </b>
                </div>
              ))}
              {w.notes && <p className="workout-note">{w.notes}</p>}
              {deleting === w.id && (
                <div className="delete-confirm">
                  <p>Remove this workout permanently?</p>
                  <button className="button secondary" onClick={() => setDeleting(null)}>
                    Cancel
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() => void remove(w.id)}
                  >
                    Delete workout
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
