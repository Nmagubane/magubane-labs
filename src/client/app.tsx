import { useEffect, type ReactNode } from 'react';
import { RouterProvider, useRouter, matchPath, Link, useRouteFocus } from './lib/router.tsx';
import { SessionProvider, useSession } from './lib/session.tsx';
import { Logo, Loading, ErrorState } from './ui/primitives.tsx';
import { Icon, type IconName } from './ui/Icon.tsx';
import { AuthPage } from './features/auth/AuthPage.tsx';
import { Onboarding } from './features/onboarding/Onboarding.tsx';
import { Home } from './features/home/Home.tsx';
import { Catalogue } from './features/learn/Catalogue.tsx';
import { SkillPage } from './features/learn/SkillPage.tsx';
import { PracticeHub } from './features/practice/PracticeHub.tsx';
import { PracticeRunner } from './features/practice/PracticeRunner.tsx';
import { TestsHub } from './features/tests/TestsHub.tsx';
import { TestRunner } from './features/tests/TestRunner.tsx';
import { Results } from './features/tests/Results.tsx';
import { Tutor } from './features/tutor/Tutor.tsx';
import { Progress } from './features/progress/Progress.tsx';
import { Exams } from './features/exam/Exams.tsx';
import { ExamDetail } from './features/exam/ExamDetail.tsx';
import { Privacy } from './features/account/Privacy.tsx';
import { Account } from './features/account/Account.tsx';
import { VerifyEmail } from './features/auth/VerifyEmail.tsx';
import { TeachHome } from './features/teach/TeachHome.tsx';
import { ClassPage } from './features/teach/ClassPage.tsx';
import { TeacherLearner } from './features/teach/TeacherLearner.tsx';
import { Present } from './features/teach/Present.tsx';
import { LoginCards } from './features/teach/LoginCards.tsx';
import { JuniorSignIn } from './features/junior/JuniorSignIn.tsx';
import { JuniorHome, JuniorWorld } from './features/junior/JuniorHome.tsx';
import { IcanPage } from './features/junior/Ican.tsx';
import { Player } from './features/junior/Player.tsx';
import { FamilyHome } from './features/family/FamilyHome.tsx';
import { ChildOverview } from './features/family/ChildOverview.tsx';

const NAV: { to: string; label: string; icon: IconName; match: string[] }[] = [
  { to: '/home', label: 'Home', icon: 'home', match: ['/home'] },
  { to: '/learn', label: 'Learn', icon: 'learn', match: ['/learn'] },
  { to: '/practice', label: 'Practice', icon: 'practice', match: ['/practice'] },
  { to: '/tests', label: 'Tests', icon: 'tests', match: ['/tests', '/results'] },
  { to: '/tutor', label: 'Tutor', icon: 'tutor', match: ['/tutor'] },
  { to: '/progress', label: 'Progress', icon: 'progress', match: ['/progress', '/exams'] },
];

const TEACH_NAV: typeof NAV = [
  { to: '/teach', label: 'Classes', icon: 'people', match: ['/teach'] },
  { to: '/learn', label: 'Lessons', icon: 'learn', match: ['/learn'] },
  { to: '/account', label: 'Account', icon: 'user', match: ['/account'] },
];

const PARENT_NAV: typeof NAV = [
  { to: '/family', label: 'Children', icon: 'family', match: ['/family'] },
  { to: '/account', label: 'Account', icon: 'user', match: ['/account'] },
];

type RouteDef = { pattern: string; render: (p: Record<string, string>) => ReactNode; focus?: boolean };

const PARENT_ROUTES: RouteDef[] = [
  { pattern: '/family', render: () => <FamilyHome /> },
  { pattern: '/family/children/:id', render: (p) => <ChildOverview key={p.id} id={p.id as string} backTo="/family" backLabel="Your children" /> },
  { pattern: '/account', render: () => <Account /> },
];

/** Grades 1–3: full-screen, no navigation chrome. */
const JUNIOR_ROUTES: RouteDef[] = [
  { pattern: '/play', render: () => <JuniorHome /> },
  { pattern: '/play/go/:id', render: (p) => <Player key={p.id} id={p.id as string} /> },
  { pattern: '/play/ican', render: () => <IcanPage /> },
  { pattern: '/play/:subject', render: (p) => <JuniorWorld key={p.subject} subject={p.subject as string} /> },
];

const TEACH_ROUTES: RouteDef[] = [
  { pattern: '/teach', render: () => <TeachHome /> },
  { pattern: '/teach/classes/:id', render: (p) => <ClassPage key={p.id} id={p.id as string} /> },
  { pattern: '/teach/learners/:id', render: (p) => <TeacherLearner key={p.id} id={p.id as string} /> },
  { pattern: '/teach/present/:skillId', render: (p) => <Present key={p.skillId} skillId={p.skillId as string} />, focus: true },
  { pattern: '/teach/classes/:id/cards', render: (p) => <LoginCards key={p.id} id={p.id as string} /> },
  { pattern: '/learn', render: () => <Catalogue /> },
  { pattern: '/learn/:skillId', render: (p) => <SkillPage key={p.skillId} skillId={p.skillId as string} /> },
  { pattern: '/account', render: () => <Account /> },
];

const ROUTES: RouteDef[] = [
  { pattern: '/home', render: () => <Home /> },
  { pattern: '/learn', render: () => <Catalogue /> },
  { pattern: '/learn/:skillId', render: (p) => <SkillPage key={p.skillId} skillId={p.skillId as string} /> },
  { pattern: '/practice', render: () => <PracticeHub /> },
  { pattern: '/practice/:id', render: (p) => <PracticeRunner key={p.id} id={p.id as string} />, focus: true },
  { pattern: '/tests', render: () => <TestsHub /> },
  { pattern: '/tests/:id', render: (p) => <TestRunner key={p.id} id={p.id as string} />, focus: true },
  { pattern: '/results/:id', render: (p) => <Results key={p.id} id={p.id as string} /> },
  { pattern: '/tutor', render: () => <Tutor conversationId={null} /> },
  { pattern: '/tutor/:id', render: (p) => <Tutor conversationId={p.id as string} /> },
  { pattern: '/progress', render: () => <Progress /> },
  { pattern: '/exams', render: () => <Exams /> },
  { pattern: '/exams/:id', render: (p) => <ExamDetail key={p.id} id={p.id as string} /> },
  { pattern: '/account', render: () => <Account /> },
];

function Shell({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { me, logout } = useSession();
  const teacher = me?.user?.role === 'teacher';
  const parent = me?.user?.role === 'parent';
  const nav = teacher ? TEACH_NAV : parent ? PARENT_NAV : NAV;
  const homePath = teacher ? '/teach' : parent ? '/family' : '/home';
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="rail" aria-label="Main">
        <Link to={homePath} className="rail-brand" aria-label="Magubane Labs home">
          <Logo />
        </Link>
        <nav>
          <ul>
            {nav.map((n) => {
              const active = n.match.some((m) => path === m || path.startsWith(`${m}/`));
              return (
                <li key={n.to}>
                  <Link to={n.to} className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                    <Icon name={n.icon} />
                    <span>{n.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="rail-foot">
          <p className="rail-user">
            <span className="rail-name">{me?.user?.displayName}</span>
            <span className="muted">{teacher ? (me?.user?.school ?? 'Teacher') : parent ? 'Parent' : `Grade ${me?.profile?.grade}`}</span>
          </p>
          <div className="rail-links">
            <Link to="/account" className="btn btn-quiet btn-sm">
              <span>Your account</span>
            </Link>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
      </aside>
      <header className="topbar">
        <Link to={homePath} aria-label="Magubane Labs home">
          <Logo />
        </Link>
        <div className="topbar-actions">
          {teacher || parent ? null : (
            <Link to="/progress" className={`topbar-link${path.startsWith('/progress') || path.startsWith('/exams') ? ' active' : ''}`}>
              <Icon name="progress" />
              <span>Progress</span>
            </Link>
          )}
          <Link to="/account" className={`topbar-link${path === '/account' ? ' active' : ''}`}>
            <Icon name="user" />
            <span>Account</span>
          </Link>
        </div>
      </header>
      <main id="main" className="main">
        {children}
      </main>
      <nav className="tabbar" aria-label="Main">
        {nav.filter((n) => n.to !== '/progress').map((n) => {
          const active = n.match.some((m) => path === m || path.startsWith(`${m}/`));
          return (
            <Link key={n.to} to={n.to} className={`tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon name={n.icon} size={22} />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Routes() {
  const { path, navigate } = useRouter();
  const { me, error, refresh } = useSession();
  useRouteFocus(path);

  const user = me?.user ?? null;
  const profile = me?.profile ?? null;
  const teacher = user?.role === 'teacher';
  const parent = user?.role === 'parent';
  const junior = !!user && user.role === 'student' && (!!user.junior || (!!profile && profile.grade <= 3));
  const publicPaths = ['/', '/welcome', '/login', '/signup', '/signup/teacher', '/signup/parent', '/forgot', '/junior'];

  useEffect(() => {
    if (!me || path === '/privacy') return;
    if (!user && !publicPaths.includes(path)) navigate('/login', { replace: true });
    else if (user && !user.emailVerified) return;
    else if (junior) {
      if (!JUNIOR_ROUTES.some((r) => matchPath(r.pattern, path))) navigate('/play', { replace: true });
    } else if (parent) {
      if (!PARENT_ROUTES.some((r) => matchPath(r.pattern, path))) navigate('/family', { replace: true });
    } else if (teacher) {
      if (publicPaths.includes(path) || path === '/onboarding' || path === '/home' || !TEACH_ROUTES.some((r) => matchPath(r.pattern, path))) navigate('/teach', { replace: true });
    } else if (user && (!profile || !profile.baselineCompleted) && path !== '/onboarding' && !path.startsWith('/tests/') && !path.startsWith('/results/')) navigate('/onboarding', { replace: true });
    else if (user && profile?.baselineCompleted && (publicPaths.includes(path) || path === '/onboarding')) navigate('/home', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, path]);

  if (path === '/privacy') return <Privacy />;

  if (!me) {
    if (error)
      return (
        <main id="main" className="main main-bare">
          <ErrorState error={error} onRetry={() => void refresh()} />
        </main>
      );
    return (
      <main id="main" className="main main-bare">
        <Loading label="Opening Magubane Labs" />
      </main>
    );
  }

  if (!user) {
    if (path === '/junior') return <JuniorSignIn />;
    const mode = path === '/login' ? 'login' : path === '/signup/teacher' ? 'teacher' : path === '/signup/parent' ? 'parent' : path === '/forgot' ? 'forgot' : 'signup';
    // Keyed so switching between forms starts clean (no stale error from another form).
    return <AuthPage key={mode} mode={mode} />;
  }
  if (!user.emailVerified) return <VerifyEmail />;
  if (junior) {
    for (const r of JUNIOR_ROUTES) {
      const params = matchPath(r.pattern, path);
      if (params) return <div className="junior">{r.render(params)}</div>;
    }
    return null;
  }
  if (path === '/onboarding' && !teacher && !parent) return <Onboarding />;

  for (const r of teacher ? TEACH_ROUTES : parent ? PARENT_ROUTES : ROUTES) {
    const params = matchPath(r.pattern, path);
    if (params) {
      if (r.focus || (!profile?.baselineCompleted && (path.startsWith('/tests/') || path.startsWith('/results/'))))
        return (
          <main id="main" className="main main-focus">
            {r.render(params)}
          </main>
        );
      return <Shell>{r.render(params)}</Shell>;
    }
  }
  if (!teacher && !parent && !profile?.baselineCompleted) return null;
  return (
    <Shell>
      <div className="state state-empty">
        <h1>This page doesn't exist</h1>
        <p>The link may be old or mistyped.</p>
        <Link to="/home" className="btn btn-primary">
          <span>Go to Home</span>
        </Link>
      </div>
    </Shell>
  );
}

export function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <Routes />
      </SessionProvider>
    </RouterProvider>
  );
}
