/** Grades 10–12 probability and counting (CAPS Paper 1). */
import type { Lesson } from './types.ts';

export const PROBABILITY_LESSONS: Lesson[] = [
  {
    id: 'probability-rules',
    skillId: 'probability-rules',
    title: 'Venn diagrams and the addition rule',
    minutes: 13,
    blocks: [
      {
        kind: 'predict',
        prompt: 'Two fair dice are rolled. Which is more likely: a sum of 7, or a sum of 12?',
        options: ['A sum of 7', 'A sum of 12', 'They are equally likely'],
        answer: 0,
        explanation: 'There are 36 equally likely outcomes. Six of them give 7 — (1; 6), (2; 5) … (6; 1) — but only (6; 6) gives 12. The sums are not equally likely; the 36 pairs are.',
      },
      {
        kind: 'widget',
        title: 'Dice lab',
        task: 'Pick an event and roll 10 times, then 100 at a time. Watch the relative frequency (blue) move towards the theoretical probability (dashed).',
        widget: { type: 'probability-lab', mode: 'dice' },
      },
      { kind: 'key-idea', body: 'When outcomes are equally likely, $P(E) = \\dfrac{n(E)}{n(S)}$. $P(\\text{not } A) = 1 - P(A)$. **Addition rule:** $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$: the overlap is in both $P(A)$ and $P(B)$, so subtract it once. **Mutually exclusive** events can\'t happen together, so for them $P(A \\text{ or } B) = P(A) + P(B)$. **Complementary** events are mutually exclusive and cover everything: their probabilities add up to 1.' },
      { kind: 'trap', wrong: '$P(A) = 0{,}6$ and $P(B) = 0{,}5$, so $P(A \\text{ or } B) = 1{,}1$.', why: 'No probability is more than 1. These events must overlap: $P(A \\text{ or } B) = 0{,}6 + 0{,}5 - P(A \\text{ and } B)$.' },
      { kind: 'example', level: 1 },
      { kind: 'check', level: 2 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'independent-events',
    skillId: 'independent-events',
    title: 'Independent events and tree diagrams',
    minutes: 14,
    blocks: [
      {
        kind: 'predict',
        prompt: 'A fair coin has landed heads five times in a row. What is the probability of heads on the next toss?',
        options: ['Less than $\\frac{1}{2}$', '$\\frac{1}{2}$', 'More than $\\frac{1}{2}$'],
        answer: 1,
        explanation: 'The coin has no memory: each toss is independent of the ones before, so it is still $\\frac{1}{2}$.',
      },
      {
        kind: 'widget',
        title: 'Venn lab',
        task: 'Change the overlap until $P(A \\text{ and } B) = P(A) \\times P(B)$. Then make the overlap 0: are the events still independent?',
        widget: { type: 'probability-lab', mode: 'venn' },
      },
      { kind: 'key-idea', body: '$A$ and $B$ are **independent** exactly when $P(A \\text{ and } B) = P(A) \\times P(B)$: one happening doesn\'t change the chance of the other. **Tree diagrams:** multiply along a branch, add the branches that fit the event. **Without replacement**, the second draw has one item fewer, and one fewer of whatever came out first. **Two-way tables:** read $P(A)$ and $P(B)$ from the totals and $P(A \\text{ and } B)$ from the cell where they meet.' },
      { kind: 'trap', wrong: '$A$ and $B$ are mutually exclusive, so they are independent.', why: 'The opposite. If $A$ happens, mutually exclusive $B$ can\'t, so knowing $A$ changes everything about $B$. With $P(A), P(B) > 0$: $P(A \\text{ and } B) = 0 \\ne P(A) \\times P(B)$.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
  {
    id: 'counting-principle',
    skillId: 'counting-principle',
    title: 'Counting and probability',
    minutes: 14,
    blocks: [
      {
        kind: 'predict',
        prompt: 'In how many different orders can three learners stand in a row?',
        options: ['3', '6', '9'],
        answer: 1,
        explanation: '3 choices for the first place, then 2, then 1: $3 \\times 2 \\times 1 = 6$. Write them out to check: ABC, ACB, BAC, BCA, CAB, CBA.',
      },
      {
        kind: 'widget',
        title: 'Counting boxes',
        task: 'Fill 3 places from 5 items, with and then without repetition. Then fill every place without repetition and compare with $5!$.',
        widget: { type: 'probability-lab', mode: 'slots' },
      },
      { kind: 'key-idea', body: '**Counting principle:** one box per place, the number of choices in each, then multiply. $n$ different items in a row: $n! = n(n - 1)\\cdots 1$. **Rules first:** fill restricted places first; for "together", glue the items into one block and multiply by the ways inside it; "not together" $=$ all $-$ together. **Identical items:** divide by the factorial of each repeat count. **Probability:** $\\dfrac{\\text{arrangements in the event}}{\\text{all arrangements}}$.' },
      { kind: 'trap', wrong: 'BANANA has 6 letters, so it has $6! = 720$ arrangements.', why: 'Swapping the three A\'s, or the two N\'s, gives the same word. There are $\\dfrac{6!}{3! \\times 2!} = 60$ different arrangements.' },
      { kind: 'example', level: 3 },
      { kind: 'check', level: 1 },
      { kind: 'check', level: 4 },
    ],
  },
];
