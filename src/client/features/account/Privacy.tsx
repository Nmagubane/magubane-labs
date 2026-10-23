import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { Logo } from '../../ui/primitives.tsx';
import type { PublicConfig } from '../../../shared/api.ts';

/** Plain-language privacy notice for the pilot. Keep it in step with what the code actually does. */
export function Privacy() {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  useEffect(() => {
    api.get<PublicConfig>('/api/config').then(setCfg).catch(() => undefined);
  }, []);
  const contact = cfg?.contactEmail;
  return (
    <main id="main" className="doc">
      <a href="/" className="doc-logo" aria-label="Magubane Labs home">
        <Logo />
      </a>
      <h1>Privacy notice</h1>
      <p className="lead">Magubane Labs is in an early, invite-only pilot. This page says, in plain words, what we collect, why, and what you can do about it.</p>
      <p className="muted small">Version {cfg?.privacyVersion ?? '2026-10-pilot'}</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> first name, email address and a password. Passwords are stored only as a scrambled hash that nobody, including us, can read.
        </li>
        <li>
          <strong>If you are under 18:</strong> your parent or guardian&apos;s name and email, and the date they agreed to this notice.
        </li>
        <li>
          <strong>Your learning profile:</strong> grade, curriculum, subjects, goals and how many minutes a day you plan to study.
        </li>
        <li>
          <strong>Your learning activity:</strong> the questions you were given, your answers, how long you took, hints you used, how sure you said you were, and the results we work out from that (mastery, mistakes, progress).
        </li>
        <li>
          <strong>Tutor conversations:</strong> the messages you send to the AI tutor and its replies.
        </li>
        <li>
          <strong>The access code</strong> you signed up with, so we know which pilot group you belong to.
        </li>
      </ul>
      <p>We use one cookie, which keeps you logged in. There is no advertising, no tracking cookies and no third-party analytics.</p>

      <h2>Why we collect it</h2>
      <p>To teach you: to choose your next questions, show your progress, estimate exam readiness and let the tutor help with the work you&apos;re doing. We also look at how the pilot is going overall so we can improve the product.</p>
      <p>We never sell your data and we never use it for advertising.</p>

      <h2>Who else sees it</h2>
      <ul>
        <li>
          <strong>Our hosting provider</strong> (Render) stores the database on its servers in Frankfurt, Germany.
        </li>
        <li>
          <strong>Anthropic</strong> provides the AI behind the tutor. When you message the tutor, your message, your grade, the skill you&apos;re working on and the related question are sent to Anthropic to generate the reply. Your name and email are <strong>not</strong> sent.
        </li>
        <li>Nobody else. Parent and teacher dashboards don&apos;t exist yet. When they do, we&apos;ll update this notice first.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>For as long as your account exists. When you delete your account, everything listed above is deleted straight away. Copies in backups are overwritten as the backups are replaced.</p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Delete your account</strong> at any time from <em>Your account</em> in the app. It is immediate and permanent.
        </li>
        <li>
          <strong>Ask for a copy of your data, or to correct it,</strong>
          {contact ? (
            <>
              {' '}
              by emailing <a href={`mailto:${contact}`}>{contact}</a>.
            </>
          ) : (
            ' by contacting the person who invited you to the pilot.'
          )}
        </li>
        <li>Parents and guardians can make any of these requests on behalf of their child.</li>
      </ul>

      <h2>Children</h2>
      <p>Learners under 18 may only use Magubane Labs with a parent or guardian&apos;s agreement, which is given when the account is created. The tutor is instructed never to ask for personal details and to keep conversations on learning.</p>

      <h2>Changes</h2>
      <p>If this notice changes in a way that matters, we&apos;ll tell you in the app before it takes effect.</p>
    </main>
  );
}
