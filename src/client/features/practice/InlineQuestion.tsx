/** A lesson check: reuses an existing question in this lesson session, or creates one at the given level. */
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api.ts';
import { Loading, ErrorState, Button } from '../../ui/primitives.tsx';
import { QuestionCard } from './QuestionCard.tsx';
import type { PracticeItem, ActivityStateResponse } from '../../../shared/api.ts';

// One request per (activity, check) even if React mounts twice.
const pending = new Map<string, Promise<PracticeItem>>();

function loadCheck(activityId: string, checkNumber: number, level: number): Promise<PracticeItem> {
  const key = `${activityId}:${checkNumber}`;
  let p = pending.get(key);
  if (!p) {
    p = api.get<ActivityStateResponse>(`/api/activities/${activityId}`).then((state) => {
      const existing = state.items[checkNumber - 1];
      if (existing) return existing;
      return api.post<PracticeItem>(`/api/activities/${activityId}/next`, { level });
    });
    pending.set(key, p);
    p.catch(() => pending.delete(key));
  }
  return p;
}

let queue: Promise<unknown> = Promise.resolve();

export function InlineQuestion({ activityId, level, checkNumber = 1 }: { activityId: string; level: number; checkNumber?: number }) {
  const [item, setItem] = useState<PracticeItem | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [another, setAnother] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    // Serialise check creation so check 1 is created before check 2.
    const run = () => (another === 0 ? loadCheck(activityId, checkNumber, level) : api.post<PracticeItem>(`/api/activities/${activityId}/next`, { level }));
    const p = queue.then(run, run);
    queue = p.catch(() => undefined);
    p.then((it) => live && setItem(it)).catch((e: ApiError) => live && setError(e));
    return () => {
      live = false;
    };
  }, [activityId, level, checkNumber, another]);

  if (error) return <ErrorState error={error} onRetry={() => setAnother((n) => n + 1)} />;
  if (!item) return <Loading label="Preparing a question" />;
  return (
    <QuestionCard
      item={item}
      autoFocus={false}
      afterFeedback={
        <Button variant="secondary" onClick={() => setAnother((n) => n + 1)}>
          Try another
        </Button>
      }
    />
  );
}
