import { useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { Metric, PageTitle, WeightChart } from '../components/UI';
import {
  addDays,
  summarize,
  weekStart,
  movingAverage,
} from '../../../../packages/shared/analytics';
import { kgToUnit } from '../../../../packages/shared/model';
export default function Analytics() {
  const { data } = useApp();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const { today, logs, weights, workouts, user } = data!;
  const from = period === 'weekly' ? weekStart(today) : today.slice(0, 7) + '-01';
  const summary = summarize(logs, weights, workouts, from, today);
  const weekly = summarize(logs, weights, workouts, weekStart(today), today);
  const averages = movingAverage(weights.filter((w) => w.date <= today));
  const averageNow = averages.at(-1),
    averageThen = averages.filter((w) => w.date <= addDays(today, -7)).at(-1);
  const averageChange =
    averageNow && averageThen
      ? kgToUnit(averageNow.average - averageThen.average, user.unit)
      : null;
  return (
    <>
      <PageTitle
        eyebrow="TURN CHECK-INS INTO CLARITY"
        title="See what’s working."
        description="Honest numbers. Useful perspective."
        action={
          <div className="segmented">
            <button
              aria-pressed={period === 'weekly'}
              className={period === 'weekly' ? 'selected' : ''}
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </button>
            <button
              aria-pressed={period === 'monthly'}
              className={period === 'monthly' ? 'selected' : ''}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
          </div>
        }
      />
      <p className="period-caption">
        {from} → {today} · {summary.days} days · {period === 'weekly' ? 'week' : 'month'} to date
      </p>
      <section className="metric-row">
        <Metric
          label="Completion"
          value={
            <>
              {summary.adherence}
              <em>%</em>
            </>
          }
          note="Rest opportunities excluded"
        />
        <Metric
          label="Average calories"
          value={summary.averageCalories ?? '—'}
          note="Only recorded days included"
        />
        <Metric
          label="Weight change"
          value={
            summary.weightChange === null
              ? '—'
              : `${kgToUnit(summary.weightChange, user.unit).toFixed(1)} ${user.unit}`
          }
          note="First to latest within this period"
        />
        <Metric
          label="Best streak"
          value={
            <>
              {summary.bestStreak}
              <em>days</em>
            </>
          }
          note="Consecutive complete check-ins"
        />
      </section>
      <div className="dashboard-columns">
        <section className="panel">
          <h2>Your three commitments</h2>
          <div className="adherence-list">
            {[
              { label: 'Gym', count: summary.gym, percent: summary.gymPercent },
              { label: 'Cardio', count: summary.cardio, percent: summary.cardioPercent },
              { label: 'Diet target', count: summary.diet, percent: summary.dietPercent },
            ].map((s) => (
              <div key={s.label}>
                <div className="section-heading">
                  <strong>{s.label}</strong>
                  <span>
                    {s.count} completed · {s.percent}%
                  </span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="review-stats">
            <div>
              <span>Recorded workouts</span>
              <strong>{summary.workoutCount}</strong>
            </div>
            <div>
              <span>Total training</span>
              <strong>
                {summary.workoutMinutes} <small>min</small>
              </strong>
            </div>
          </div>
          <p className="field-hint">
            Missing days count as incomplete. Rest days are excluded from each objective’s
            percentage.
          </p>
        </section>
        <section className="panel">
          <h2>Weight in perspective</h2>
          <WeightChart
            weights={weights.filter((w) => w.date >= from && w.date <= today)}
            unit={user.unit}
          />
          <Link to="/weight" className="text-link">
            Explore your full history
            <ArrowUpRight size={14} />
          </Link>
        </section>
      </div>
      <section className="panel weekly-review">
        <p className="eyebrow">YOUR WEEKLY REVIEW</p>
        <h2>Small steps, real momentum.</h2>
        <div className="review-grid">
          <Metric label="Gym" value={`${weekly.gym} / ${user.gymGoal}`} note="Weekly goal" />
          <Metric
            label="Cardio"
            value={`${weekly.cardio} / ${user.cardioGoal}`}
            note="Weekly goal"
          />
          <Metric label="Diet" value={`${weekly.diet} / ${weekly.days}`} note="Days so far" />
          <Metric
            label="Average calories"
            value={weekly.averageCalories ?? '—'}
            note="kcal per logged day"
          />
        </div>
        <div className="insights">
          <p>
            <Check size={17} />
            You completed {Math.round((100 * weekly.gym) / user.gymGoal)}% of your weekly gym goal
            so far.
          </p>
          <p>
            <Check size={17} />
            {averageChange === null
              ? 'Add weigh-ins across two weeks to compare your 7-day averages.'
              : `Your 7-day average ${averageChange < 0 ? 'decreased' : 'increased'} by ${Math.abs(averageChange).toFixed(1)} ${user.unit} compared with a week ago.`}
          </p>
          <p>
            <Check size={17} />
            You met your diet target on {weekly.diet} of {weekly.days} days this week.
          </p>
        </div>
      </section>
    </>
  );
}
