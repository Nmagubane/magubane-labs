/** A parent's home: their children, adding a child, and setting up this device so children can sign in. */
import { useState } from 'react';
import { api } from '../../lib/api.ts';
import { useResource, invalidate } from '../../lib/useResource.ts';
import { useSession } from '../../lib/session.tsx';
import { Link, useRouter } from '../../lib/router.tsx';
import { Button, Loading, ErrorState, PageHeader, Empty } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import type { FamilyDto, CreatedChildDto, DeviceDto } from '../../../shared/api-junior.ts';
import { AddChildForm, PictureCode, languageLine } from './ChildBits.tsx';
import { relativeDay } from '../../lib/format.ts';
import { VoicePicker } from '../junior/VoicePicker.tsx';
import { rememberGrownUp, forgetGrownUp } from '../../lib/rememberedEmail.ts';

export function FamilyHome() {
  const { data, error, reload } = useResource<FamilyDto>('/api/family');
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<CreatedChildDto | null>(null);
  if (error) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return <Loading label="Loading your family" />;
  return (
    <>
      <PageHeader title="Your children" lead="Grades 1 to 3: maths, reading, English and life skills, with a voice that reads everything aloud. Ten to fifteen minutes a day is plenty." />
      {created ? (
        <section className="sheet sheet-feature created" role="status">
          <h2>{created.child.name} is ready</h2>
          <p>Show {created.child.name} these 3 pictures. They tap their name, then these pictures in this order:</p>
          <PictureCode code={created.pictureCode} size="lg" />
          <p className="muted">You can always see and change them on {created.child.name}’s page.</p>
          <Button variant="secondary" size="sm" onClick={() => setCreated(null)}>
            Done
          </Button>
        </section>
      ) : null}
      {data.children.length ? (
        <ul className="kids">
          {data.children.map((c) => (
            <li key={c.id}>
              <Link to={`/family/children/${c.id}`} className="kid-row">
                <span className="jsi-initial sm" style={{ background: c.colour }} aria-hidden>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <span className="kid-main">
                  <span className="kid-name">{c.name}</span>
                  <span className="muted">
                    Grade {c.grade}, {languageLine(c.homeLanguage)}
                  </span>
                </span>
                <span className="kid-week">
                  <span>{c.minutes7d} min this week</span>
                  <span className="muted">{c.lastActiveAt ? `Last practised ${relativeDay(c.lastActiveAt)}` : 'Not started yet'}</span>
                </span>
                <Icon name="next" />
              </Link>
            </li>
          ))}
        </ul>
      ) : !adding ? (
        <Empty title="Add your first child" action={<Button onClick={() => setAdding(true)}>Add a child</Button>}>
          <p>A first name, a grade and a home language. Your child signs in by tapping their name and 3 pictures, so there is no email or password for them.</p>
        </Empty>
      ) : null}
      {data.children.length && !adding ? (
        <p>
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            Add another child
          </Button>
        </p>
      ) : null}
      {adding ? (
        <section className="sheet" aria-labelledby="add-h">
          <h2 id="add-h">Add a child</h2>
          <AddChildForm
            endpoint="/api/family/children"
            forTeacher={false}
            onCreated={(c) => {
              setCreated(c);
              setAdding(false);
              invalidate('/api/family');
              void reload();
            }}
          />
          <Button variant="quiet" size="sm" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </section>
      ) : null}
      {data.children.length ? <DevicePanel family={data} onChange={() => void reload()} /> : null}
    </>
  );
}

export function DevicePanel({ family, onChange, classId }: { family?: FamilyDto; onChange: () => void; classId?: string }) {
  const { logout, me } = useSession();
  const { navigate } = useRouter();
  const devices = useResource<DeviceDto[]>('/api/junior/devices');
  const [busy, setBusy] = useState(false);
  const thisDevice = family ? family.thisDevice : (devices.data ?? []).some((d) => d.current && d.scopeId === classId);
  const setUp = async () => {
    setBusy(true);
    try {
      await api.post('/api/junior/devices', classId ? { classId } : {});
      invalidate('/api/family', '/api/junior');
      onChange();
      void devices.reload();
    } finally {
      setBusy(false);
    }
  };
  // Handing over signs the grown-up out, so a child can't reach picture codes or delete buttons.
  // On a family device we remember the email so coming back is just the password.
  const handOver = async () => {
    if (!classId && me?.user?.email) rememberGrownUp(me.user.email);
    await logout();
    navigate('/junior', { replace: true });
  };
  const forget = async () => {
    forgetGrownUp();
    await api.post('/api/junior/device/forget');
    invalidate('/api/family', '/api/junior');
    onChange();
    void devices.reload();
  };
  const revoke = async (id: string) => {
    await api.del(`/api/junior/devices/${id}`);
    void devices.reload();
    onChange();
  };
  const list = (devices.data ?? []).filter((d) => (classId ? d.scope === 'class' : d.scope === 'family'));
  return (
    <section className="sheet" aria-labelledby="dev-h">
      <h2 id="dev-h">Where {classId ? 'children' : 'your children'} sign in</h2>
      <p className="muted">Children can only sign in on a phone, tablet or computer you have set up. It remembers {classId ? 'this class' : 'your family'}. Your password is never stored, so children can't get into your account.</p>
      {thisDevice ? <VoicePicker /> : null}
      {thisDevice ? (
        <div className="row-actions">
          <Button onClick={() => void handOver()} aria-describedby="handover-note">
            <Icon name="tablet" />
            Log out and hand to a child
          </Button>
          <Button variant="quiet" size="sm" onClick={() => void forget()}>
            Stop children signing in here
          </Button>
          <p id="handover-note" className="muted small handover-note">
            This logs you out so children can&apos;t open {classId ? 'your class pages' : 'this page'}. To come back, tap <strong>Grown-ups</strong> on the children&apos;s screen{classId ? ' and log in.' : '. Your email will already be filled in.'}
          </p>
        </div>
      ) : (
        <Button busy={busy} onClick={() => void setUp()}>
          <Icon name="tablet" />
          Set up this device for {classId ? 'this class' : 'my children'}
        </Button>
      )}
      {list.length ? (
        <ul className="devices">
          {list.map((d) => (
            <li key={d.id}>
              <span>
                {d.label}
                {d.current ? <strong> (this device)</strong> : null}
                <span className="muted"> {d.lastUsedAt ? `used ${relativeDay(d.lastUsedAt)}` : `set up ${relativeDay(d.createdAt)}`}</span>
              </span>
              <Button variant="quiet" size="sm" onClick={() => void revoke(d.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
