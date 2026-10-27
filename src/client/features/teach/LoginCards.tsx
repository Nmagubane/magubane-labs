/** Printable sign-in cards for a Grade 1–3 class: one card per child with their name and 3 pictures. */
import { useResource } from '../../lib/useResource.ts';
import { Link } from '../../lib/router.tsx';
import { Button, Loading, ErrorState } from '../../ui/primitives.tsx';
import { Icon } from '../../ui/Icon.tsx';
import type { ClassChildrenCardsDto } from '../../../shared/api-junior.ts';
import { PictureCode } from '../family/ChildBits.tsx';

export function LoginCards({ id }: { id: string }) {
  const { data, error, reload } = useResource<ClassChildrenCardsDto>(`/api/teach/classes/${id}/login-cards`);
  if (error) return <ErrorState error={error} onRetry={() => void reload()} />;
  if (!data) return <Loading label="Loading cards" />;
  return (
    <div className="login-cards-page">
      <div className="no-print">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/teach">Classes</Link>
          <span aria-hidden>/</span>
          <Link to={`/teach/classes/${id}`}>{data.className}</Link>
          <span aria-hidden>/</span>
          <span>Sign-in cards</span>
        </nav>
        <h1>Sign-in cards for {data.className}</h1>
        <p className="lead">Print, cut out and give each child their card, or keep them in a box by the class device. Keep them in the classroom.</p>
        <Button onClick={() => window.print()}>
          <Icon name="print" />
          Print cards
        </Button>
      </div>
      {data.children.length ? (
        <ul className="login-cards">
          {data.children.map((c) => (
            <li key={c.id} className="login-card">
              <p className="lc-name">
                <span className="jsi-initial sm" style={{ background: c.colour }} aria-hidden>
                  {c.name.charAt(0).toUpperCase()}
                </span>
                {c.name}
              </p>
              <PictureCode code={c.pictureCode} />
              <p className="lc-how">Tap your name, then these 3 pictures.</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">No children in this class yet. Add them on the class page.</p>
      )}
    </div>
  );
}
