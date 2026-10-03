import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context';
import { PageTitle, StatusMark } from '../components/UI';
import { addDays } from '../../../../packages/shared/analytics';
export default function Calendar() {
  const { data } = useApp();
  const [month, setMonth] = useState(data?.today.slice(0, 7) ?? '2026-01');
  if (!data) return null;
  const start = month + '-01';
  const weekday = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7;
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const cells = Math.ceil((count + weekday) / 7) * 7;
  function move(delta: number) {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <>
      <PageTitle
        eyebrow="THE BIGGER PICTURE"
        title="Your consistency calendar."
        description="Every day is a chance to begin again."
      />
      <section className="panel calendar-panel">
        <div className="calendar-toolbar">
          <h2>
            {new Date(`${start}T12:00:00Z`).toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </h2>
          <div>
            <button className="button secondary" onClick={() => setMonth(data.today.slice(0, 7))}>
              Today
            </button>
            <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}>
              <ChevronLeft size={20} />
            </button>
            <button className="icon-button" aria-label="Next month" onClick={() => move(1)}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="calendar-grid calendar-labels">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {Array.from({ length: cells }, (_, i) => {
            const date = addDays(start, i - weekday),
              inMonth = date.startsWith(month),
              log = data.logs.find((l) => l.date === date);
            return (
              <Link
                to={`/log/${date}`}
                key={date}
                className={`calendar-cell ${inMonth ? '' : 'outside'} ${date === data.today ? 'today' : ''}`}
                aria-label={`Edit ${date}`}
              >
                <span className="date-number">{Number(date.slice(-2))}</span>
                <div className="calendar-marks">
                  {(['gym', 'cardio', 'diet'] as const).map((key) => (
                    <StatusMark key={key} state={log?.[key] ?? 'pending'} label={key} />
                  ))}
                </div>
                {log?.calories !== null && log?.calories !== undefined && (
                  <small className="calendar-calories">{log.calories.toLocaleString()} kcal</small>
                )}
              </Link>
            );
          })}
        </div>
        <div className="calendar-legend">
          <span>Indicators: gym · cardio · diet</span>
          <span>
            <StatusMark state="done" />
            Done
          </span>
          <span>
            <StatusMark state="rest" />
            Rest
          </span>
          <span>
            <StatusMark state="missed" />
            Missed
          </span>
          <span>
            <StatusMark state="pending" />
            Not logged
          </span>
        </div>
      </section>
    </>
  );
}
