import { useState, type FormEvent } from 'react';
import { Save, LockKeyhole, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { api } from '../api';
import { NumberField, PageTitle } from '../components/UI';
import { kgToUnit, unitToKg, type ProfileInput } from '../../../../packages/shared/model';
export default function Profile() {
  const { data, refresh } = useApp();
  const u = data!.user;
  const [form, setForm] = useState<ProfileInput>({
      name: u.name,
      height: u.height,
      targetWeight: u.targetWeight,
      calorieTarget: u.calorieTarget,
      gymGoal: u.gymGoal,
      cardioGoal: u.cardioGoal,
      unit: u.unit,
      timezone: u.timezone,
      theme: u.theme,
      shareActivity: u.shareActivity,
      shareWeight: u.shareWeight,
    }),
    [busy, setBusy] = useState(false),
    [passwordBusy, setPasswordBusy] = useState(false);
  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/me', { method: 'PUT', body: form });
      await refresh();
      toast.success('Your preferences are saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget,
      fields = new FormData(element);
    setPasswordBusy(true);
    try {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword: fields.get('currentPassword'), password: fields.get('password') },
      });
      element.reset();
      toast.success('Password updated. Other sessions are signed out.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update password.');
    } finally {
      setPasswordBusy(false);
    }
  }
  function download() {
    const { user, ...records } = data!;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { exportedAt: new Date().toISOString(), profile: user, ...records },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrio-export-${data!.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageTitle
        eyebrow="PROGRESS ON YOUR TERMS"
        title="Make this space yours."
        description="Your goals, preferences, and privacy."
      />
      <nav className="settings-shortcuts" aria-label="More sections">
        <Link className="button secondary" to="/weight">
          Weight
        </Link>
        <Link className="button secondary" to="/analytics">
          Analytics
        </Link>
        <Link className="button secondary" to="/group">
          Your circle
        </Link>
      </nav>
      <form className="profile-form" onSubmit={save}>
        <section className="panel">
          <h2>The essentials</h2>
          <div className="form-grid">
            <label className="field">
              <span>Your name</span>
              <input
                required
                maxLength={80}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <input type="email" value={u.email} readOnly />
              <small className="field-hint">
                Contact the app administrator to change your email.
              </small>
            </label>
            <NumberField
              label="Height"
              unit="cm"
              value={form.height}
              onChange={(n) => set('height', n)}
              min={50}
              max={260}
            />
            <NumberField
              label="Target weight"
              unit={form.unit}
              value={
                form.targetWeight === null
                  ? null
                  : Number(kgToUnit(form.targetWeight, form.unit).toFixed(2))
              }
              onChange={(n) => set('targetWeight', n === null ? null : unitToKg(n, form.unit))}
              min={kgToUnit(20, form.unit)}
              max={kgToUnit(500, form.unit)}
              step="0.01"
            />
            <NumberField
              label="Daily calorie target"
              unit="kcal"
              value={form.calorieTarget}
              onChange={(n) => set('calorieTarget', n ?? 1800)}
              min={500}
              required
            />
            <label className="field">
              <span>Weight unit</span>
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value as 'kg' | 'lb')}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </label>
            <NumberField
              label="Weekly gym goal"
              unit="sessions"
              value={form.gymGoal}
              onChange={(n) => set('gymGoal', n ?? 3)}
              min={1}
              max={7}
              required
            />
            <NumberField
              label="Weekly cardio goal"
              unit="sessions"
              value={form.cardioGoal}
              onChange={(n) => set('cardioGoal', n ?? 3)}
              min={1}
              max={7}
              required
            />
          </div>
          <p className="field-hint">
            Changing your calorie target applies to new check-ins. Historical targets are preserved.
          </p>
        </section>
        <section className="panel">
          <h2>Feel at home</h2>
          <div className="form-grid">
            <label className="field">
              <span>Timezone</span>
              <input
                value={form.timezone}
                required
                maxLength={80}
                list="timezones"
                onChange={(e) => set('timezone', e.target.value)}
              />
              <datalist id="timezones">
                {[
                  'Europe/Dublin',
                  'Europe/London',
                  'Asia/Kolkata',
                  'UTC',
                  'America/New_York',
                  'America/Los_Angeles',
                  'Australia/Sydney',
                ].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <small className="field-hint">Use an IANA timezone, e.g. Asia/Kolkata.</small>
            </label>
            <label className="field">
              <span>Appearance</span>
              <select
                value={form.theme}
                onChange={(e) => set('theme', e.target.value as ProfileInput['theme'])}
              >
                <option value="system">Match my device</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
          </div>
        </section>
        <section className="panel">
          <h2>
            <LockKeyhole size={18} /> Private by default
          </h2>
          <p className="muted">
            This is a single private circle. Everyone with an invited account can see the shared
            view.
          </p>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.shareActivity}
              onChange={(e) => set('shareActivity', e.target.checked)}
            />
            <span>Share my name, daily objectives and streak with the circle</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.shareWeight}
              disabled={!form.shareActivity}
              onChange={(e) => set('shareWeight', e.target.checked)}
            />
            <span>Also share my 30-day weight change</span>
          </label>
          <p className="field-hint">
            Your exact weights, calories, notes, and photos are never shown in the group dashboard.
          </p>
        </section>
        <div className="sticky-save">
          <span>Built for your small circle.</span>
          <button className="button primary" disabled={busy}>
            <Save size={17} />
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
      <section className="panel">
        <h2>Change your password</h2>
        <form onSubmit={password}>
          <div className="form-grid">
            <label className="field">
              <span>Current password</span>
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </label>
          </div>
          <button className="button secondary" disabled={passwordBusy}>
            {passwordBusy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Your data belongs to you</h2>
        <p className="muted">
          Download your profile and fitness history as JSON. Keep the file private.
        </p>
        <button type="button" className="button secondary" onClick={download}>
          <Download size={17} />
          Export my data
        </button>
      </section>
    </>
  );
}
