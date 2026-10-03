import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, Users } from 'lucide-react';
import { api, type GroupPerson } from '../api';
import { Empty, PageTitle, Skeleton, StatusMark } from '../components/UI';
import { useApp } from '../context';
import { kgToUnit } from '../../../../packages/shared/model';
export default function Group() {
  const { user } = useApp();
  const [people, setPeople] = useState<GroupPerson[] | null>(null),
    [error, setError] = useState('');
  function load() {
    setError('');
    void api<{ people: GroupPerson[] }>('/group')
      .then((r) => setPeople(r.people))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not connect.'));
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE ACCOUNTABILITY"
        title="Your small circle."
        description="Show up together. Share only what you choose."
        action={
          <Link className="button secondary" to="/settings">
            Sharing settings
          </Link>
        }
      />
      <div className="privacy-banner">
        <LockKeyhole size={18} />
        <p>
          Only opted-in activity appears here. Notes, calories and photo links stay private. Weight
          change needs a separate opt-in.
        </p>
      </div>
      {error ? (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={load}>Retry</button>
        </div>
      ) : !people ? (
        <Skeleton />
      ) : !people.length ? (
        <Empty
          title="Your circle is taking shape"
          description="Enable activity sharing in Settings to join the accountability view."
          action={
            <Link className="button primary" to="/settings">
              Choose what to share
            </Link>
          }
        />
      ) : (
        <div className="group-grid">
          {people.map((p) => (
            <article className="panel person-card" key={p.id}>
              <div className="person-heading">
                <span className="avatar">
                  {p.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div>
                  <h2>
                    {p.name}
                    {p.id === user?.id && <small> · you</small>}
                  </h2>
                  <p className="muted">Their local day · {p.date}</p>
                </div>
                <Users size={17} />
              </div>
              <div className="person-objectives">
                {(['gym', 'cardio', 'diet'] as const).map((k) => (
                  <div key={k}>
                    <span>{k === 'diet' ? 'Diet target' : k[0].toUpperCase() + k.slice(1)}</span>
                    <StatusMark state={p[k]} />
                  </div>
                ))}
              </div>
              <div className="person-footer">
                <span>
                  <strong>{p.streak}</strong> day streak
                </span>
                {p.weightChange !== null && (
                  <span>
                    {p.weightChange > 0 ? '+' : ''}
                    {kgToUnit(p.weightChange, user!.unit).toFixed(1)} {user!.unit} · 30 days
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
