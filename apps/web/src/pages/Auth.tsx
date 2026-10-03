import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, LockKeyhole, Activity } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../context';
import type { User } from '../../../../packages/shared/model';
export default function Auth() {
  const { authenticate } = useApp();
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const { user } = await api<{ user: User }>(register ? '/auth/register' : '/auth/login', {
        method: 'POST',
        body: {
          email: form.get('email'),
          password: form.get('password'),
          ...(register ? { name: form.get('name'), invite: form.get('invite') } : {}),
        },
      });
      await authenticate(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="wordmark">
          FitTrio<span>●</span>
        </div>
        <div className="auth-story-copy">
          <div className="pill">
            <span className="tiny-dot" />
            YOUR SMALL CIRCLE. YOUR BIG GOALS.
          </div>
          <h1>
            Show up.
            <br />
            Build momentum.
            <br />
            <span>Repeat.</span>
          </h1>
          <p>
            A quieter space for your workouts, your progress,
            <br className="desktop-only" /> and the people keeping you accountable.
          </p>
          <div className="auth-preview">
            <div>
              <Activity size={20} />
              <span>One good day at a time.</span>
            </div>
            <div className="preview-checks">
              {['Move', 'Fuel', 'Reflect'].map((s) => (
                <span key={s}>
                  <Check size={14} />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="auth-footer">Consistency, tracked.</p>
      </section>
      <section className="auth-form-side">
        <div className="auth-form-wrap">
          <div className="lock-icon">
            <LockKeyhole size={21} />
          </div>
          <p className="eyebrow">WELCOME TO YOUR SPACE</p>
          <h2>{register ? 'Join your circle' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'A personal invitation is all you need.'
              : 'Your next good day starts here.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label className="field">
                <span>Your name</span>
                <input name="name" autoComplete="name" required maxLength={80} />
              </label>
            )}
            <label className="field">
              <span>Email address</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="At least 12 characters"
                minLength={12}
                maxLength={128}
                required
              />
            </label>
            {register && (
              <label className="field">
                <span>Invitation code</span>
                <input name="invite" autoComplete="off" required minLength={20} />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="button primary full" type="submit">
              {busy ? 'Connecting…' : register ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} />
            </button>
          </form>
          <button
            className="auth-switch"
            onClick={() => {
              setRegister(!register);
              setError('');
            }}
          >
            {register ? 'Already a member? Sign in' : 'Have an invitation? Join your circle'}
          </button>
          <div className="privacy-note">
            <LockKeyhole size={13} />
            <span>Private by default. Progress on your terms.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
