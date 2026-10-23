import { useId, type ReactNode } from 'react';
import type { QuestionPayload, ResponseValue, FeedbackDto } from '../../../shared/api.ts';
import { Rich, RichBlocks } from '../../ui/RichText.tsx';
import { Figure } from '../../ui/Figure.tsx';
import { AnswerInput } from './AnswerInput.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { BAND_LABEL } from '../../lib/format.ts';
import { responseText } from '../../../shared/questions/answer.ts';

const LEVEL = ['', 'Warm-up', 'Core', 'Standard', 'Stretch', 'Challenge'];

export function QuestionView({
  question,
  value,
  onChange,
  onSubmit,
  disabled,
  autoFocus,
  number,
  showLevel = true,
}: {
  question: QuestionPayload;
  value: ResponseValue | null;
  onChange: (v: ResponseValue) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
  number?: ReactNode;
  showLevel?: boolean;
}) {
  const promptId = useId();
  return (
    <div className="question">
      <div className="question-meta">
        {number ? <span className="question-number">{number}</span> : null}
        {showLevel ? (
          <span className={`level level-${question.difficulty}`} title={`Difficulty ${question.difficulty} of 5`}>
            <span className="level-pips" aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => (
                <i key={i} className={i <= question.difficulty ? 'on' : ''} />
              ))}
            </span>
            {LEVEL[question.difficulty]}
          </span>
        ) : null}
      </div>
      <div className="question-prompt" id={promptId}>
        <Rich text={question.prompt} as="p" />
      </div>
      {question.figure ? <Figure figure={question.figure} /> : null}
      <div className="question-answer">
        <AnswerInput input={question.input} value={value} onChange={onChange} onSubmit={onSubmit} disabled={disabled} autoFocus={autoFocus} describedBy={promptId} />
      </div>
    </div>
  );
}

export function FeedbackPanel({ feedback, response, children, solutionOpen }: { feedback: FeedbackDto; response?: ResponseValue | null; children?: ReactNode; solutionOpen?: boolean }) {
  const gained = feedback.masteryAfter - feedback.masteryBefore;
  return (
    <section className={`feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} aria-live="polite">
      <header className="feedback-head">
        <span className="feedback-mark" aria-hidden>
          <Icon name={feedback.correct ? 'check' : 'cross'} size={22} />
        </span>
        <div>
          <h3>{feedback.correct ? 'Correct.' : feedback.skipped ? 'Skipped.' : feedback.mistake ? feedback.mistake.label : 'Not quite.'}</h3>
          {!feedback.correct && response ? (
            <p className="feedback-your">
              You answered <strong>{responseText(response)}</strong>.
            </p>
          ) : null}
        </div>
        <p className="feedback-mastery" title="Mastery for this skill">
          <span className="num">{feedback.masteryAfter}%</span>
          <span className={`delta ${gained >= 0 ? 'up' : 'down'}`}>
            {gained > 0 ? `+${gained}` : gained < 0 ? `${gained}` : '±0'}
          </span>
          <span className="muted">{BAND_LABEL[feedback.band]}</span>
        </p>
      </header>
      {!feedback.correct ? (
        <div className="feedback-body">
          {feedback.feedback ? <Rich text={feedback.feedback} as="p" /> : null}
          {feedback.mistake ? <p className="feedback-tip">{feedback.mistake.tip}</p> : null}
          <p>
            Correct answer: <Rich text={feedback.answerDisplay} />
          </p>
        </div>
      ) : null}
      <details className="solution" open={solutionOpen ?? !feedback.correct}>
        <summary>Worked solution</summary>
        <ol>
          {feedback.solution.map((s, i) => (
            <li key={i}>
              <RichBlocks text={s} />
            </li>
          ))}
        </ol>
      </details>
      {children ? <div className="feedback-actions">{children}</div> : null}
    </section>
  );
}
