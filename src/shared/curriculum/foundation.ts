/**
 * Foundation Phase (Grades 1–3) curriculum: Mathematics, Home Language, English First Additional Language
 * and Life Skills (Beginning Knowledge and Personal & Social Well-being).
 *
 * Every skill exists once per grade ("Count objects, Grade 2"), because CAPS sets a different range for each
 * grade and teachers report by grade. Within a grade, difficulty levels 1–5 climb to the end-of-year
 * expectation, so level 5 is "ready for next grade" for that skill.
 *
 * Ranges follow the CAPS Foundation Phase Mathematics document (DBE 2011): e.g. counting objects to
 * 50 / 200 / 1 000, calculations to 20 / 99 / 999, clock reading only from Grade 2. Life Skills topics follow
 * the Grade 1–3 Annual Teaching Plans. All mappings are PROVISIONAL until checked line by line against CAPS.
 *
 * Creative Arts and Physical Education are not skills here: an app cannot assess them honestly. They are
 * adult-led activity cards (see src/shared/junior/cards.ts).
 */
import type { Skill, Topic } from './catalogue.ts';

export const FOUNDATION_GRADES = [1, 2, 3] as const;
export type FoundationGrade = (typeof FOUNDATION_GRADES)[number];
export const isFoundationGrade = (g: number): g is FoundationGrade => g >= 1 && g <= 3;

export const FOUNDATION_TOPICS: Topic[] = [
  { id: 'fp-numbers', subjectId: 'mathematics', name: 'Numbers and counting', strand: 'Numbers, operations and relationships' },
  { id: 'fp-calc', subjectId: 'mathematics', name: 'Calculating', strand: 'Numbers, operations and relationships' },
  { id: 'fp-patterns', subjectId: 'mathematics', name: 'Patterns', strand: 'Patterns, functions and algebra' },
  { id: 'fp-shape', subjectId: 'mathematics', name: 'Shape and space', strand: 'Space and shape' },
  { id: 'fp-measure', subjectId: 'mathematics', name: 'Measurement and time', strand: 'Measurement' },
  { id: 'fp-data', subjectId: 'mathematics', name: 'Data', strand: 'Data handling' },
  { id: 'hl-sounds', subjectId: 'home-language', name: 'Sounds and letters', strand: 'Phonics' },
  { id: 'hl-words', subjectId: 'home-language', name: 'Reading and spelling words', strand: 'Reading and phonics' },
  { id: 'hl-reading', subjectId: 'home-language', name: 'Reading and understanding', strand: 'Reading and viewing' },
  { id: 'hl-language', subjectId: 'home-language', name: 'Language use', strand: 'Language structure and use' },
  { id: 'fal-words', subjectId: 'english-fal', name: 'English words', strand: 'Listening and speaking' },
  { id: 'fal-reading', subjectId: 'english-fal', name: 'Reading in English', strand: 'Reading and phonics' },
  { id: 'ls-me', subjectId: 'life-skills', name: 'Me and my body', strand: 'Personal and social well-being' },
  { id: 'ls-safe', subjectId: 'life-skills', name: 'Staying safe', strand: 'Personal and social well-being' },
  { id: 'ls-world', subjectId: 'life-skills', name: 'Plants and animals', strand: 'Beginning knowledge' },
  { id: 'ls-sky', subjectId: 'life-skills', name: 'Weather, water and sky', strand: 'Beginning knowledge' },
  { id: 'ls-people', subjectId: 'life-skills', name: 'Feelings, family and community', strand: 'Personal and social well-being' },
];

interface Spec {
  key: string;
  topicId: string;
  name: string;
  grades: readonly FoundationGrade[];
  /** One line per grade: what the child can do at the end of that grade. */
  outcome: Record<FoundationGrade, string>;
  signature: Record<FoundationGrade, string>;
  strand: string;
}

const g123 = [1, 2, 3] as const;
const g23 = [2, 3] as const;

const SPECS: Spec[] = [
  // ---------------- Mathematics ----------------
  {
    key: 'count-objects',
    topicId: 'fp-numbers',
    name: 'Count objects',
    grades: g123,
    outcome: { 1: 'Count up to 50 objects reliably, grouping in tens.', 2: 'Count up to 200 objects, grouping in tens and fives.', 3: 'Count up to 1 000 objects, grouping in hundreds and tens.' },
    signature: { 1: '1, 2, 3 \\dots 50', 2: '10, 20, 30 \\dots 200', 3: '100, 200 \\dots 1\\,000' },
    strand: 'Count objects',
  },
  {
    key: 'counting',
    topicId: 'fp-numbers',
    name: 'Count forwards and backwards',
    grades: g123,
    outcome: { 1: 'Count on and back in 1s from any number to 100, and in 2s, 5s and 10s.', 2: 'Count on and back to 200, in 1s, 2s, 3s, 4s, 5s and 10s.', 3: 'Count on and back to 1 000, also in 20s, 25s, 50s and 100s.' },
    signature: { 1: '5, 10, 15, \\square', 2: '3, 6, 9, \\square', 3: '25, 50, 75, \\square' },
    strand: 'Count forwards and backwards',
  },
  {
    key: 'numerals',
    topicId: 'fp-numbers',
    name: 'Number symbols and names',
    grades: g123,
    outcome: { 1: 'Recognise numbers to 100 and number names to 10.', 2: 'Read and write numbers and number names to 200.', 3: 'Read and write numbers and number names to 1 000.' },
    signature: { 1: '7 \\;\\; \\text{seven}', 2: '46 \\;\\; \\text{forty-six}', 3: '508' },
    strand: 'Number symbols and number names',
  },
  {
    key: 'compare',
    topicId: 'fp-numbers',
    name: 'Compare and order numbers',
    grades: g123,
    outcome: { 1: 'Compare and order numbers to 20; use first to tenth.', 2: 'Compare and order numbers to 99; use first to twentieth.', 3: 'Compare and order numbers to 999.' },
    signature: { 1: '12 > 9', 2: '45 < 54', 3: '709 > 690' },
    strand: 'Describe, compare and order numbers',
  },
  {
    key: 'place-value',
    topicId: 'fp-numbers',
    name: 'Tens and ones',
    grades: g123,
    outcome: { 1: 'See numbers from 10 to 20 as one ten and some ones.', 2: 'Break numbers to 99 into tens and ones.', 3: 'Break numbers to 999 into hundreds, tens and ones.' },
    signature: { 1: '14 = 10 + 4', 2: '67 = 60 + 7', 3: '385 = 300 + 80 + 5' },
    strand: 'Place value',
  },
  {
    key: 'add-sub',
    topicId: 'fp-calc',
    name: 'Add and subtract',
    grades: g123,
    outcome: { 1: 'Add and subtract with answers up to 20.', 2: 'Add and subtract to 99.', 3: 'Add and subtract to 999.' },
    signature: { 1: '8 + 5 = 13', 2: '46 + 27 = 73', 3: '352 - 128 = 224' },
    strand: 'Addition and subtraction',
  },
  {
    key: 'bonds',
    topicId: 'fp-calc',
    name: 'Number bonds',
    grades: g123,
    outcome: { 1: 'Know the pairs that make 10, and use them to 20.', 2: 'Know number bonds to 20 and add or subtract tens.', 3: 'Know number bonds to 30 and to 100 in tens.' },
    signature: { 1: '7 + \\square = 10', 2: '13 + \\square = 20', 3: '60 + \\square = 100' },
    strand: 'Number bonds and mental mathematics',
  },
  {
    key: 'word-problems',
    topicId: 'fp-calc',
    name: 'Story sums',
    grades: g123,
    outcome: { 1: 'Solve story problems with answers up to 20.', 2: 'Solve story problems with answers up to 99.', 3: 'Solve story problems with answers up to 999.' },
    signature: { 1: '5 + 3 = \\square', 2: '42 - 15 = \\square', 3: '125 + 240 = \\square' },
    strand: 'Problem solving',
  },
  {
    key: 'groups',
    topicId: 'fp-calc',
    name: 'Groups and sharing',
    grades: g123,
    outcome: { 1: 'Use repeated adding, grouping and sharing to 20.', 2: 'Multiply 1–10 by 2, 3, 4 and 5; group and share to 50.', 3: 'Multiply and divide by 2, 3, 4, 5 and 10 to 100.' },
    signature: { 1: '2 + 2 + 2 = 6', 2: '4 \\times 3 = 12', 3: '40 \\div 5 = 8' },
    strand: 'Repeated addition, multiplication and division',
  },
  {
    key: 'fractions',
    topicId: 'fp-calc',
    name: 'Fractions',
    grades: g123,
    outcome: { 1: 'Find halves, quarters, thirds and fifths of shapes and sharing.', 2: 'Name unit and non-unit fractions up to eighths; two halves make a whole.', 3: 'Find fractions of shapes and collections; compare fractions.' },
    signature: { 1: '\\text{1 half}', 2: '\\text{3 quarters}', 3: '\\text{2 fifths of 10}' },
    strand: 'Fractions',
  },
  {
    key: 'money',
    topicId: 'fp-calc',
    name: 'Money',
    grades: g123,
    outcome: { 1: 'Know coins and notes to R20; add amounts up to R20.', 2: 'Add amounts and give change up to R99.', 3: 'Use all coins and notes; work out totals and change; rands and cents.' },
    signature: { 1: 'R2 + R5 = R7', 2: 'R50 - R35 = R15', 3: 'R1 = 100c' },
    strand: 'Money',
  },
  {
    key: 'patterns',
    topicId: 'fp-patterns',
    name: 'Number and shape patterns',
    grades: g123,
    outcome: { 1: 'Copy, extend and describe simple number and shape patterns.', 2: 'Extend number patterns to 200 and describe the rule.', 3: 'Extend number patterns to 999 and find missing terms.' },
    signature: { 1: '\\triangle \\, \\bigcirc \\, \\triangle \\, \\square', 2: '4, 8, 12, \\square', 3: '950, 900, 850, \\square' },
    strand: 'Number and geometric patterns',
  },
  {
    key: 'shapes',
    topicId: 'fp-shape',
    name: '2-D shapes and 3-D objects',
    grades: g123,
    outcome: { 1: 'Name circles, triangles, squares, balls and boxes; spot symmetry.', 2: 'Also rectangles and cylinders; describe sides and faces.', 3: 'Also cones and pyramids; sort shapes by their properties.' },
    signature: { 1: '\\triangle \\; \\square \\; \\bigcirc', 2: '\\text{rectangle, cylinder}', 3: '\\text{cone, pyramid}' },
    strand: '2-D shapes, 3-D objects and symmetry',
  },
  {
    key: 'position',
    topicId: 'fp-shape',
    name: 'Position and direction',
    grades: g123,
    outcome: { 1: 'Use on, under, next to, in front of, behind, left and right.', 2: 'Describe where things are and follow directions.', 3: 'Read a simple map grid and give directions.' },
    signature: { 1: '\\text{under}', 2: '\\text{left of}', 3: '\\text{2 right, 1 up}' },
    strand: 'Position, orientation and views',
  },
  {
    key: 'time',
    topicId: 'fp-measure',
    name: 'Time',
    grades: g123,
    outcome: { 1: 'Know the days of the week, the months and the order of daily events.', 2: 'Tell the time to the hour and half hour.', 3: 'Tell the time to quarter hours and minutes; read a calendar.' },
    signature: { 1: '\\text{Monday, Tuesday} \\dots', 2: '\\text{half past 3}', 3: '\\text{quarter to 9}' },
    strand: 'Time',
  },
  {
    key: 'measure',
    topicId: 'fp-measure',
    name: 'Length, mass and capacity',
    grades: g123,
    outcome: { 1: 'Compare and measure with hand spans, blocks and cups.', 2: 'Choose metres, kilograms and litres; measure informally.', 3: 'Measure in centimetres; find perimeter and area by counting.' },
    signature: { 1: '\\text{longer, heavier}', 2: '\\text{1 m, 1 kg, 1 } \\ell', 3: '12 \\text{ cm}' },
    strand: 'Length, mass, capacity, perimeter and area',
  },
  {
    key: 'data',
    topicId: 'fp-data',
    name: 'Collect and read data',
    grades: g123,
    outcome: { 1: 'Sort objects and read a one-to-one pictograph.', 2: 'Read tallies, tables and pictographs.', 3: 'Read pictographs and bar graphs and answer questions.' },
    signature: { 1: '\\text{pictograph}', 2: '|||| \\;\\; ||', 3: '\\text{bar graph}' },
    strand: 'Data handling',
  },
  // ---------------- Home Language ----------------
  {
    key: 'first-sounds',
    topicId: 'hl-sounds',
    name: 'Letters and sounds',
    grades: g123,
    outcome: { 1: 'Hear the first and last sound in a word and match it to its letter.', 2: 'Hear sh, ch, th and other two-letter sounds.', 3: 'Hear vowel sounds like ee, ai, oa, ar and igh.' },
    signature: { 1: '\\text{s — snake}', 2: '\\text{sh — ship}', 3: '\\text{ee — tree}' },
    strand: 'Phonics: letter–sound relationships',
  },
  {
    key: 'phonological',
    topicId: 'hl-sounds',
    name: 'Rhymes and syllables',
    grades: g123,
    outcome: { 1: 'Hear rhyming words and clap syllables.', 2: 'Find rhymes and count syllables in longer words.', 3: 'Split compound words and count syllables.' },
    signature: { 1: '\\text{cat — hat}', 2: '\\text{ba-na-na}', 3: '\\text{sun + flower}' },
    strand: 'Phonological awareness',
  },
  {
    key: 'decode',
    topicId: 'hl-words',
    name: 'Read words',
    grades: g123,
    outcome: { 1: 'Sound out and read three-letter words.', 2: 'Read words with blends and two-letter sounds.', 3: 'Read longer words with vowel teams.' },
    signature: { 1: '\\text{c-a-t}', 2: '\\text{sh-i-p}', 3: '\\text{r-ai-n}' },
    strand: 'Phonics: blending',
  },
  {
    key: 'sight-words',
    topicId: 'hl-words',
    name: 'Sight words',
    grades: g123,
    outcome: { 1: 'Recognise common words like the, is, and, go at a glance.', 2: 'Recognise more common words quickly.', 3: 'Recognise a wide set of common words instantly.' },
    signature: { 1: '\\text{the}', 2: '\\text{because}', 3: '\\text{thought}' },
    strand: 'Reading: high-frequency words',
  },
  {
    key: 'spelling',
    topicId: 'hl-words',
    name: 'Spell words',
    grades: g123,
    outcome: { 1: 'Build three-letter words from their sounds.', 2: 'Spell words with blends and two-letter sounds.', 3: 'Spell words with vowel teams.' },
    signature: { 1: '\\text{d o g}', 2: '\\text{f i sh}', 3: '\\text{b oa t}' },
    strand: 'Writing: spelling',
  },
  {
    key: 'sentences',
    topicId: 'hl-reading',
    name: 'Read sentences',
    grades: g123,
    outcome: { 1: 'Read a short sentence and match it to a picture.', 2: 'Read sentences and put words in order to make sense.', 3: 'Read longer sentences with detail.' },
    signature: { 1: '\\text{The cat is on the mat.}', 2: '\\text{The dog ran to the gate.}', 3: '\\text{...}' },
    strand: 'Reading: sentences',
  },
  {
    key: 'comprehension',
    topicId: 'hl-reading',
    name: 'Stories',
    grades: g123,
    outcome: { 1: 'Listen to a short story and answer questions about it.', 2: 'Read a short story and answer who, what and where.', 3: 'Read a story; answer why and what-happened-next questions.' },
    signature: { 1: '\\text{who?}', 2: '\\text{where?}', 3: '\\text{why?}' },
    strand: 'Reading comprehension',
  },
  {
    key: 'language',
    topicId: 'hl-language',
    name: 'Language use',
    grades: g123,
    outcome: { 1: 'Know capital letters, full stops and opposites.', 2: 'Use plurals, question marks and naming and doing words.', 3: 'Use past tense, joining words and describing words.' },
    signature: { 1: '\\text{big — small}', 2: '\\text{cat — cats}', 3: '\\text{jump — jumped}' },
    strand: 'Language structure and use',
  },
  // ---------------- English First Additional Language ----------------
  {
    key: 'fal-vocabulary',
    topicId: 'fal-words',
    name: 'Words and pictures',
    grades: g123,
    outcome: { 1: 'Understand everyday English words: body, family, food, colours, classroom.', 2: 'Understand more English words: animals, clothes, weather, places.', 3: 'Understand English words for actions, feelings and the community.' },
    signature: { 1: '\\text{red, cup, hand}', 2: '\\text{jersey, rain}', 3: '\\text{happy, nurse}' },
    strand: 'Listening and speaking: vocabulary',
  },
  {
    key: 'fal-instructions',
    topicId: 'fal-words',
    name: 'Listen and do',
    grades: g123,
    outcome: { 1: 'Follow a simple spoken instruction in English.', 2: 'Follow an instruction with two parts.', 3: 'Follow instructions with position and colour words.' },
    signature: { 1: '\\text{Tap the ball.}', 2: '\\text{Tap the red cup.}', 3: '\\text{...under the table.}' },
    strand: 'Listening: following instructions',
  },
  {
    key: 'fal-phonics',
    topicId: 'fal-reading',
    name: 'Sounds in English',
    grades: g23,
    outcome: { 1: '', 2: 'Hear the first sound of English words and match the letter.', 3: 'Hear English sounds like sh, ch and ee.' },
    signature: { 1: '', 2: '\\text{b — ball}', 3: '\\text{ch — chair}' },
    strand: 'Phonics in the additional language',
  },
  {
    key: 'fal-reading',
    topicId: 'fal-reading',
    name: 'Read in English',
    grades: g23,
    outcome: { 1: '', 2: 'Read simple English words and short sentences.', 3: 'Read short English sentences and match them to pictures.' },
    signature: { 1: '', 2: '\\text{I see a dog.}', 3: '\\text{The boy has a red bag.}' },
    strand: 'Reading in the additional language',
  },
  // ---------------- Life Skills (Beginning Knowledge, Personal & Social Well-being) ----------------
  {
    key: 'my-body',
    topicId: 'ls-me',
    name: 'My body and senses',
    grades: g123,
    outcome: { 1: 'Name body parts and the five senses.', 2: 'Say which sense we use and how to care for our body.', 3: 'Know what parts of the body do.' },
    signature: { 1: '\\text{eyes — see}', 2: '\\text{ears — hear}', 3: '\\text{heart}' },
    strand: 'My body',
  },
  {
    key: 'healthy',
    topicId: 'ls-me',
    name: 'Healthy habits and food',
    grades: g123,
    outcome: { 1: 'Know healthy habits: washing hands, brushing teeth, sleep.', 2: 'Sort everyday food into healthy choices and treats.', 3: 'Plan a healthy meal and know why we need water and exercise.' },
    signature: { 1: '\\text{wash hands}', 2: '\\text{fruit, vegetables}', 3: '\\text{balanced meal}' },
    strand: 'Healthy habits',
  },
  {
    key: 'safety',
    topicId: 'ls-safe',
    name: 'Safety at home and on the road',
    grades: g123,
    outcome: { 1: 'Spot dangers at home and at school.', 2: 'Cross the road safely and stay safe with medicines and electricity.', 3: 'Know fire safety and basic first aid.' },
    signature: { 1: '\\text{hot, sharp}', 2: '\\text{stop, look, listen}', 3: '\\text{stop, drop, roll}' },
    strand: 'Safety',
  },
  {
    key: 'plants',
    topicId: 'ls-world',
    name: 'Plants and seeds',
    grades: g123,
    outcome: { 1: 'Know what plants need and how a seed grows.', 2: 'Name the parts of a plant and what we get from plants.', 3: 'Know how plants grow, spread and are useful.' },
    signature: { 1: '\\text{seed} \\rightarrow \\text{plant}', 2: '\\text{roots, stem, leaves}', 3: '\\text{seeds spread}' },
    strand: 'Plants',
  },
  {
    key: 'animals',
    topicId: 'ls-world',
    name: 'Animals',
    grades: g123,
    outcome: { 1: 'Know pets and what they need.', 2: 'Sort wild and farm animals; match animals and their homes.', 3: 'Order animal life cycles; know what animals eat.' },
    signature: { 1: '\\text{pets}', 2: '\\text{wild, farm}', 3: '\\text{egg} \\rightarrow \\text{frog}' },
    strand: 'Animals',
  },
  {
    key: 'weather',
    topicId: 'ls-sky',
    name: 'Weather and seasons',
    grades: g123,
    outcome: { 1: 'Name kinds of weather and dress for it.', 2: 'Know the four seasons in South Africa.', 3: 'Read weather symbols and know how weather affects us.' },
    signature: { 1: '\\text{sunny, rainy}', 2: '\\text{summer, winter}', 3: '\\text{weather chart}' },
    strand: 'Weather and seasons',
  },
  {
    key: 'water-sky',
    topicId: 'ls-sky',
    name: 'Water and the sky',
    grades: g123,
    outcome: { 1: 'Know how we use water and what we see in the sky.', 2: 'Know why we save water; day and night.', 3: 'Predict what floats or sinks; the sun, moon and shadows.' },
    signature: { 1: '\\text{sun, moon, stars}', 2: '\\text{save water}', 3: '\\text{float or sink?}' },
    strand: 'Water and the sky',
  },
  {
    key: 'feelings',
    topicId: 'ls-people',
    name: 'Feelings and manners',
    grades: g123,
    outcome: { 1: 'Name feelings and good manners.', 2: 'Understand how others feel and how to help.', 3: 'Express feelings well; rights and responsibilities.' },
    signature: { 1: '\\text{happy, sad}', 2: '\\text{kind}', 3: '\\text{rights}' },
    strand: 'Feelings and social skills',
  },
  {
    key: 'community',
    topicId: 'ls-people',
    name: 'Family, homes and community',
    grades: g123,
    outcome: { 1: 'Know family members, homes and community helpers.', 2: 'Know kinds of transport and how people help us.', 3: 'Know jobs in the community and how to care for the environment.' },
    signature: { 1: '\\text{family}', 2: '\\text{bus, train}', 3: '\\text{reduce, reuse}' },
    strand: 'Family and community',
  },
];

const grName = (g: number) => `Grade ${g}`;

export const FOUNDATION_SKILLS: Skill[] = SPECS.flatMap((spec) =>
  spec.grades.map((g, i) => {
    const prev = i > 0 ? spec.grades[i - 1] : undefined;
    return {
      id: `fp-${spec.key}-g${g}`,
      topicId: spec.topicId,
      name: spec.name,
      outcome: spec.outcome[g],
      signature: spec.signature[g],
      grade: g,
      prerequisites: prev ? [`fp-${spec.key}-g${prev}`] : [],
      templateId: `fp-${spec.key}-g${g}`,
      lessonId: '',
      phase: 'foundation' as const,
      mappings: { 'za-caps': { grade: g, strand: spec.strand }, intl: { grade: g, strand: spec.strand } },
    } satisfies Skill;
  }),
);

/** "Count objects (Grade 2)" for adult-facing lists. */
export const foundationSkillLabel = (s: Skill): string => `${s.name} (${grName(s.grade)})`;
/** The key shared by the same skill across grades, e.g. "count-objects". */
export const foundationKey = (skillId: string): string => skillId.replace(/^fp-/, '').replace(/-g\d$/, '');
