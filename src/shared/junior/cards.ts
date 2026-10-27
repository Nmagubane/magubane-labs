/**
 * Adult-led activity cards for the parts of Foundation Phase Life Skills an app cannot teach or assess
 * honestly: Physical Education (Move), Creative Arts (Make), and sensitive Personal & Social Well-being
 * topics that belong in a conversation with a trusted adult (Talk).
 *
 * The app shows the card to the adult, the adult does it with the child, and ticks "We did this".
 * Nothing here is scored. Where a card links to a maths or reading skill, it says so: CAPS asks for
 * integration across subjects in the Foundation Phase.
 */
export type CardKind = 'move' | 'make' | 'talk';

export interface ActivityCard {
  id: string;
  kind: CardKind;
  grades: (1 | 2 | 3)[];
  title: string;
  minutes: number;
  needs: string[];
  steps: string[];
  /** What the adult should notice: the learning, not the performance. */
  lookFor: string;
  /** Which CAPS focus area it belongs to. */
  caps: string;
  /** Optional link to another subject. */
  links?: string;
}

export const CARDS: ActivityCard[] = [
  // ---------------- Move (Physical Education) ----------------
  {
    id: 'animal-walks',
    kind: 'move',
    grades: [1, 2, 3],
    title: 'Animal walks',
    minutes: 10,
    needs: ['Space to move'],
    steps: ['Call out an animal and move like it together: hop like a frog, stretch tall like a giraffe, waddle like a penguin, stomp like an elephant.', 'Let your child choose the next animal.', 'End slowly: creep like a tortoise, then lie still like a sleeping lion.'],
    lookFor: 'Moving in different ways (hopping, stretching, crawling), and stopping when asked.',
    caps: 'Physical Education: locomotor movement',
  },
  {
    id: 'balance-count',
    kind: 'move',
    grades: [1, 2, 3],
    title: 'Balance and count',
    minutes: 8,
    needs: ['Space to move'],
    steps: ['Stand on one leg while counting together to 10. Swap legs.', 'Try it with arms out like a plane, then with eyes closed.', 'Walk along a line on the floor, heel to toe, counting your steps.'],
    lookFor: 'Holding a balance a little longer each time. Counting steady and in order.',
    caps: 'Physical Education: balance',
    links: 'Maths: counting',
  },
  {
    id: 'throw-catch',
    kind: 'move',
    grades: [1, 2, 3],
    title: 'Throw and catch',
    minutes: 10,
    needs: ['A soft ball or rolled-up socks'],
    steps: ['Stand close and throw underarm to each other. Count the catches.', 'Take one step back after every 3 catches.', 'Try catching with two hands, then one hand.'],
    lookFor: 'Watching the ball, hands ready, and a gentle aimed throw.',
    caps: 'Physical Education: coordination',
  },
  {
    id: 'clap-patterns',
    kind: 'move',
    grades: [1, 2, 3],
    title: 'Clap, stomp, pattern',
    minutes: 8,
    needs: ['Nothing'],
    steps: ['Make a body-percussion pattern: clap, clap, stomp. Repeat it together.', 'Change it: clap, stomp, stomp. Let your child copy, then make one up.', 'Grade 2 and 3: make a pattern with three actions (clap, stomp, click) and keep it going.'],
    lookFor: 'Finding the part that repeats and keeping the rhythm.',
    caps: 'Physical Education: rhythm',
    links: 'Maths: patterns',
  },
  {
    id: 'left-right',
    kind: 'move',
    grades: [1, 2],
    title: 'Simon says: left and right',
    minutes: 8,
    needs: ['Space to move'],
    steps: ['Play Simon says with left and right: "Simon says touch your left ear."', 'Add jumps: "Simon says jump to the right."', 'Swap: your child gives the instructions.'],
    lookFor: 'Knowing left from right without checking every time.',
    caps: 'Physical Education: laterality',
    links: 'Maths: position and direction',
  },
  {
    id: 'skip-hop',
    kind: 'move',
    grades: [2, 3],
    title: 'Skipping and hopping race',
    minutes: 12,
    needs: ['Space outside', 'Something to mark a start and finish'],
    steps: ['Mark a start and finish about 10 big steps apart.', 'Race there and back: walking, then hopping, then skipping.', 'Time it by counting together. Try to beat your own count.'],
    lookFor: 'Skipping with a smooth rhythm, and trying to improve on their own best.',
    caps: 'Physical Education: locomotor movement, sports and games',
  },
  {
    id: 'traditional-games',
    kind: 'move',
    grades: [1, 2, 3],
    title: 'Play a traditional game',
    minutes: 15,
    needs: ['Stones or a ball, depending on the game'],
    steps: ['Teach a game you played as a child: diketo, kgati (skipping rope), morabaraba or hopscotch.', 'Explain the rules simply, then play a few rounds.', 'Ask your child to explain the rules back to you.'],
    lookFor: 'Following rules, taking turns and being a good winner or loser.',
    caps: 'Physical Education: sports and games',
  },
  {
    id: 'spatial-maze',
    kind: 'move',
    grades: [3],
    title: 'Obstacle course',
    minutes: 15,
    needs: ['Chairs, cushions, a broom or rope'],
    steps: ['Build a short course: under the table, over a cushion, around a chair, along a rope.', 'Your child goes through while you describe it: "under, over, around, along".', 'Then your child describes the route while you go through.'],
    lookFor: 'Using position words correctly and moving with control.',
    caps: 'Physical Education: spatial orientation',
    links: 'Maths: position and direction',
  },
  // ---------------- Make (Creative Arts) ----------------
  {
    id: 'draw-family',
    kind: 'make',
    grades: [1, 2, 3],
    title: 'Draw my family',
    minutes: 15,
    needs: ['Paper', 'Crayons or pencils'],
    steps: ['Ask your child to draw everyone who lives in your home.', 'Talk about it: who is tallest? Who is youngest?', 'Write each name under the drawing together.'],
    lookFor: 'Detail in the drawing, and words for family members.',
    caps: 'Creative Arts: create in 2D',
    links: 'Life Skills: my family',
  },
  {
    id: 'box-build',
    kind: 'make',
    grades: [1, 2, 3],
    title: 'Build with boxes and tins',
    minutes: 20,
    needs: ['Empty boxes, tins, toilet rolls', 'Tape or glue'],
    steps: ['Build a house, a car or a robot from boxes and tins.', 'Name the shapes you use: box, cylinder, ball, cone.', 'Count how many of each shape you used.'],
    lookFor: 'Naming 3-D objects and noticing which ones roll and which stack.',
    caps: 'Creative Arts: create in 3D',
    links: 'Maths: 3-D objects',
  },
  {
    id: 'clay-animals',
    kind: 'make',
    grades: [1, 2, 3],
    title: 'Model an animal',
    minutes: 20,
    needs: ['Play dough, clay or mud'],
    steps: ['Choose an animal together and model it.', 'Talk about its body parts and what it eats.', 'Grade 3: model its life cycle in three or four small models.'],
    lookFor: 'Shaping with care, and what they know about the animal.',
    caps: 'Creative Arts: create in 3D (modelling)',
    links: 'Life Skills: animals',
  },
  {
    id: 'symmetry-print',
    kind: 'make',
    grades: [1, 2, 3],
    title: 'Butterfly print',
    minutes: 15,
    needs: ['Paper', 'Paint (or wet crayon)'],
    steps: ['Fold paper in half and open it.', 'Paint blobs on one side only, then fold and press.', 'Open it: both halves match. That fold is a line of symmetry.'],
    lookFor: 'Seeing that the two halves match.',
    caps: 'Creative Arts: create in 2D',
    links: 'Maths: symmetry',
  },
  {
    id: 'puppet-story',
    kind: 'make',
    grades: [1, 2, 3],
    title: 'Sock puppet story',
    minutes: 20,
    needs: ['An old sock', 'Buttons, paper or markers for eyes'],
    steps: ['Make a puppet together.', 'Your child tells a short story with the puppet: a beginning, a middle and an end.', 'Ask: who was in the story? What happened first?'],
    lookFor: 'Telling events in order and using a different voice for the character.',
    caps: 'Creative Arts: improvise and interpret',
    links: 'Home Language: stories',
  },
  {
    id: 'sing-actions',
    kind: 'make',
    grades: [1, 2],
    title: 'Action song',
    minutes: 8,
    needs: ['Nothing'],
    steps: ['Sing a song with actions you both know, in your home language.', 'Change one action each time you sing it.', 'Let your child lead and choose the actions.'],
    lookFor: 'Joining in, remembering words and actions, and confidence.',
    caps: 'Creative Arts: performing arts',
  },
  {
    id: 'weather-chart',
    kind: 'make',
    grades: [2, 3],
    title: 'Make a weather chart',
    minutes: 10,
    needs: ['Paper', 'Crayons'],
    steps: ['Draw a table with the days of the week.', 'Each day, your child draws the weather: sun, cloud, rain or wind.', 'At the end of the week, count: which weather did we have most?'],
    lookFor: 'Recording carefully every day and reading the chart at the end.',
    caps: 'Creative Arts: create in 2D',
    links: 'Life Skills: weather; Maths: data',
  },
  // ---------------- Talk (sensitive Personal & Social Well-being) ----------------
  {
    id: 'body-safe',
    kind: 'talk',
    grades: [1, 2, 3],
    title: 'My body belongs to me',
    minutes: 10,
    needs: ['A quiet, calm moment'],
    steps: [
      'Say: "Your body belongs to you. Nobody may touch you in a way that feels wrong or makes you uncomfortable."',
      'Name the parts covered by a swimming costume as private. Use the correct names.',
      'Teach the rule: say NO, get AWAY, and TELL a grown-up you trust. Keep telling until someone listens.',
      'Say: "You will never be in trouble for telling me. Secrets that make you feel bad must be told."',
      'Together, name three grown-ups your child could tell.',
    ],
    lookFor: 'Your child can say the rule and name trusted adults. Come back to this often, calmly.',
    caps: 'Personal and Social Well-being: keeping my body safe',
  },
  {
    id: 'feelings-talk',
    kind: 'talk',
    grades: [1, 2, 3],
    title: 'Feelings check-in',
    minutes: 5,
    needs: ['Nothing'],
    steps: ['Ask: "What made you happy today? Did anything make you sad or worried?"', 'Share one of your own feelings from today.', 'If something worried them, ask what would help.'],
    lookFor: 'Naming feelings with words, and knowing it is safe to share them.',
    caps: 'Personal and Social Well-being: feelings',
  },
  {
    id: 'my-story',
    kind: 'talk',
    grades: [3],
    title: 'My timeline',
    minutes: 15,
    needs: ['Paper', 'A few family photos if you have them'],
    steps: ['Draw a line across the page. Mark: born, first steps, started school, today.', 'Tell your child a short story about each one.', 'Your child adds one more event they remember.'],
    lookFor: 'Putting events in time order and asking questions about the past.',
    caps: 'Beginning Knowledge: about me (time and change)',
    links: 'Maths: ordering',
  },
  {
    id: 'trusted-adults',
    kind: 'talk',
    grades: [1, 2, 3],
    title: 'Who can help me?',
    minutes: 8,
    needs: ['Paper and a pencil'],
    steps: ['Draw your child’s hand. On each finger, write a grown-up they can go to for help.', 'Practise saying their home address or a parent’s phone number.', 'Talk about what to do if they get lost: stay where you are and ask a police officer or a mother with children.'],
    lookFor: 'Knowing who to go to, and their address or a phone number.',
    caps: 'Personal and Social Well-being: safety',
  },
];

export const cardsForGrade = (grade: number): ActivityCard[] => CARDS.filter((c) => c.grades.includes(grade as 1 | 2 | 3));
export const getCard = (id: string): ActivityCard | undefined => CARDS.find((c) => c.id === id);
