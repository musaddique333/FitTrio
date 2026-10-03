import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Dumbbell,
  Footprints,
  Flame,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { useApp } from '../context';
import { Metric, PageTitle, SectionHeader, StatusMark, WeightChart } from '../components/UI';
import { addDays, summarize, weekStart } from '../../../../packages/shared/analytics';
import { kgToUnit, emptyLog } from '../../../../packages/shared/model';
export default function Dashboard() {
  const { data } = useApp();
  if (!data) return null;
  const { user, today, logs, weights, workouts } = data;
  const log = logs.find((l) => l.date === today) ?? emptyLog(user.calorieTarget);
  const week = summarize(logs, weights, workouts, weekStart(today), today);
  const pastWeights = weights.filter((w) => w.date <= today);
  const latest = pastWeights.at(-1);
  const previous = pastWeights.filter((w) => w.date <= addDays(today, -7)).at(-1);
  const delta = latest && previous ? latest.weight - previous.weight : null;
  const done = [log.gym, log.cardio, log.diet].filter((s) => s === 'done' || s === 'rest').length;
  return (
    <>
      <PageTitle
        eyebrow="YOUR DAILY CHECK-IN"
        title={`Keep going, ${user.name.split(' ')[0]}.`}
        description={new Date(`${today}T12:00:00Z`).toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })}
        action={
          <Link to="/log" className="button primary">
            <span>Log today</span>
            <PlusIcon />
          </Link>
        }
      />
      <section className="today-panel">
        <div className="today-intro">
          <span className="pill">
            <Sparkles size={13} /> SMALL WINS ADD UP
          </span>
          <h2>Make today count.</h2>
          <p>Three small commitments. One stronger you.</p>
          <div className="daily-fraction">
            <span>{done}</span>
            <span>/ 3</span>
            <small>objectives checked in</small>
          </div>
        </div>
        <div className="today-objectives">
          {[
            { key: 'gym' as const, name: 'Gym', detail: 'Show up for yourself', icon: Dumbbell },
            {
              key: 'cardio' as const,
              name: 'Cardio',
              detail: 'Keep your heart in it',
              icon: Footprints,
            },
            {
              key: 'diet' as const,
              name: 'Diet target',
              detail: `${log.calorieTarget.toLocaleString()} kcal · your daily target`,
              icon: Flame,
            },
          ].map(({ key, name, detail, icon: Icon }) => (
            <Link className="objective" to="/log" key={key}>
              <span className="objective-icon">
                <Icon size={21} />
              </span>
              <div>
                <strong>{name}</strong>
                <small>{detail}</small>
              </div>
              <span className="objective-state">
                {log[key] === 'done'
                  ? 'Done'
                  : log[key] === 'rest'
                    ? 'Rest day'
                    : log[key] === 'missed'
                      ? 'Not completed'
                      : 'Not logged'}
                <StatusMark state={log[key]} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="metric-row">
        <Metric
          label="Current weight"
          value={
            latest ? (
              <>
                {kgToUnit(latest.weight, user.unit).toFixed(1)}
                <em>{user.unit}</em>
              </>
            ) : (
              '—'
            )
          }
          note={
            delta === null
              ? 'Add regular weigh-ins'
              : `${delta > 0 ? '+' : ''}${kgToUnit(delta, user.unit).toFixed(1)} ${user.unit} vs a week ago`
          }
        />
        <Metric
          label="Current streak"
          value={
            <>
              {data.streak}
              <em>days</em>
            </>
          }
          note="All daily objectives done or rest"
        />
        <Metric
          label="Gym this week"
          value={
            <>
              {week.gym}
              <em>/ {user.gymGoal}</em>
            </>
          }
          note="Your weekly session goal"
        />
        <Metric
          label="Weekly adherence"
          value={
            <>
              {week.adherence}
              <em>%</em>
            </>
          }
          note="Rest days excluded · week to date"
        />
      </section>
      <div className="dashboard-columns">
        <section className="panel chart-panel">
          <SectionHeader
            title="A little progress, every day"
            aside={
              <Link to="/weight" className="text-link">
                Weight history
                <ArrowUpRight size={14} />
              </Link>
            }
          />
          <div className="chart-intro">
            <span className="muted">Weight trend · last 30 days</span>
            <span className="chart-key">
              <span className="tiny-dot" />
              7-day average
            </span>
          </div>
          <WeightChart
            weights={pastWeights.filter((w) => w.date >= addDays(today, -29))}
            unit={user.unit}
          />
          <div className="chart-caption">
            <TrendingDown size={15} />
            <span>Look at the trend. One weigh-in doesn’t tell the whole story.</span>
          </div>
        </section>
        <section className="panel week-panel">
          <SectionHeader title="This week" aside={<span className="tag">WEEK TO DATE</span>} />
          <div className="week-days">
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(weekStart(today), i),
                l = logs.find((l) => l.date === date);
              return (
                <Link
                  to={`/log/${date}`}
                  key={date}
                  className={`week-day ${date === today ? 'is-today' : ''}`}
                >
                  <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                  <strong>{Number(date.slice(-2))}</strong>
                  <div>
                    {(['gym', 'cardio', 'diet'] as const).map((k) => (
                      <i
                        key={k}
                        className={l?.[k] === 'done' ? 'done' : l?.[k] === 'rest' ? 'rest' : ''}
                      />
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="review-stats">
            <div>
              <span>Average calories</span>
              <strong>
                {week.averageCalories?.toLocaleString() ?? '—'} <small>kcal</small>
              </strong>
            </div>
            <div>
              <span>Diet target met</span>
              <strong>
                {week.diet} <small>/ {week.days} days</small>
              </strong>
            </div>
            <div>
              <span>Workout time</span>
              <strong>
                {week.workoutMinutes} <small>min</small>
              </strong>
            </div>
          </div>
          <Link to="/analytics" className="review-link">
            Your weekly review
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="quiet-banner">
        <span className="quote-icon">
          <Check size={19} />
        </span>
        <div>
          <strong>Consistency beats perfection.</strong>
          <p>Rest days count. Honest check-ins count. Showing up tomorrow counts.</p>
        </div>
        <Link to="/group" className="text-link">
          See your circle
          <ArrowUpRight size={14} />
        </Link>
      </section>
    </>
  );
}
function PlusIcon() {
  return <ArrowRight size={17} />;
}
