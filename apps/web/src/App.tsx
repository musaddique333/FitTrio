import { lazy, Suspense } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Dumbbell,
  ChartNoAxesCombined,
  Scale,
  Users,
  Settings,
  LogOut,
  ArrowUpRight,
} from 'lucide-react';
import { useApp } from './context';
import { Skeleton } from './components/UI';
import Auth from './pages/Auth';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Daily = lazy(() => import('./pages/Daily'));
const Workouts = lazy(() => import('./pages/Workouts'));
const Weight = lazy(() => import('./pages/Weight'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Group = lazy(() => import('./pages/Group'));
const Profile = lazy(() => import('./pages/Profile'));
const navigation = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/log', label: 'Log today', icon: Plus },
  { path: '/workouts', label: 'Workouts', icon: Dumbbell },
  { path: '/weight', label: 'Weight', icon: Scale },
  { path: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { path: '/group', label: 'Your circle', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];
export default function App() {
  const { user, loading, error, data, refresh, signOut } = useApp();
  if (loading)
    return (
      <div className="initial-loading">
        <div className="wordmark">
          FitTrio<span>●</span>
        </div>
        <Skeleton />
      </div>
    );
  if (!user && error)
    return (
      <main className="initial-loading">
        <h1>Let’s reconnect</h1>
        <p>{error}</p>
        <button className="button primary" onClick={() => void refresh()}>
          Try again
        </button>
      </main>
    );
  if (!user) return <Auth />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="wordmark" to="/">
          FitTrio<span>●</span>
        </NavLink>
        <div className="workspace-label">YOUR PERSONAL SPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              end={path === '/'}
              key={path}
              to={path}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="tiny-dot" />A little better, every day.
            <ArrowUpRight size={14} />
          </div>
          <div className="profile-mini">
            <span className="avatar">
              {user.name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Consistency, tracked.</small>
            </div>
            <button className="icon-button" aria-label="Sign out" onClick={() => void signOut()}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="mobile-header">
        <NavLink className="wordmark" to="/">
          FitTrio<span>●</span>
        </NavLink>
        <NavLink to="/settings" className="avatar" aria-label="Settings">
          {user.name[0]}
        </NavLink>
      </div>
      <main className="main-content">
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => void refresh()}>Retry</button>
          </div>
        )}
        {!data ? (
          <Skeleton />
        ) : (
          <Suspense fallback={<Skeleton />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/log" element={<Daily />} />
              <Route path="/log/:date" element={<Daily />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/weight" element={<Weight />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/group" element={<Group />} />
              <Route path="/settings" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        )}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation
          .filter((n) => ['/', '/calendar', '/log', '/workouts', '/settings'].includes(n.path))
          .map(({ path, label, icon: Icon }) => (
            <NavLink
              end={path === '/'}
              key={path}
              to={path}
              className={({ isActive }) =>
                `mobile-link ${path === '/log' ? 'mobile-log' : ''} ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={20} />
              <span>{label === 'Overview' ? 'Home' : label === 'Log today' ? 'Log' : label}</span>
            </NavLink>
          ))}
      </nav>
    </div>
  );
}
