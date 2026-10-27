/**
 * English First Additional Language: everyday vocabulary with pictures, by CAPS theme.
 * Grade 1 starts with the body, family, food, colours and the classroom; Grade 2 adds animals,
 * clothes, weather and places; Grade 3 adds actions, feelings and people in the community.
 */
export interface VocabWord {
  word: string;
  icon: string;
}

export const VOCAB: { theme: string; grade: 1 | 2 | 3; words: VocabWord[] }[] = [
  { theme: 'my body', grade: 1, words: [{ word: 'hand', icon: '✋' }, { word: 'foot', icon: '🦶' }, { word: 'eye', icon: '👁️' }, { word: 'ear', icon: '👂' }, { word: 'nose', icon: '👃' }, { word: 'mouth', icon: '👄' }, { word: 'leg', icon: '🦵' }, { word: 'tooth', icon: '🦷' }] },
  { theme: 'my family', grade: 1, words: [{ word: 'baby', icon: '👶' }, { word: 'girl', icon: '👧' }, { word: 'boy', icon: '👦' }, { word: 'grandmother', icon: '👵' }, { word: 'grandfather', icon: '👴' }, { word: 'man', icon: '👨' }, { word: 'woman', icon: '👩' }] },
  { theme: 'food', grade: 1, words: [{ word: 'bread', icon: '🍞' }, { word: 'milk', icon: '🥛' }, { word: 'egg', icon: '🥚' }, { word: 'apple', icon: '🍎' }, { word: 'banana', icon: '🍌' }, { word: 'rice', icon: '🍚' }, { word: 'carrot', icon: '🥕' }, { word: 'cake', icon: '🍰' }, { word: 'water', icon: '💧' }] },
  { theme: 'colours', grade: 1, words: [{ word: 'red', icon: 'color:red' }, { word: 'blue', icon: 'color:blue' }, { word: 'yellow', icon: 'color:yellow' }, { word: 'green', icon: 'color:green' }, { word: 'orange', icon: 'color:orange' }, { word: 'purple', icon: 'color:purple' }, { word: 'black', icon: 'color:black' }, { word: 'white', icon: 'color:white' }, { word: 'brown', icon: 'color:brown' }] },
  { theme: 'the classroom', grade: 1, words: [{ word: 'book', icon: '📖' }, { word: 'pencil', icon: '✏️' }, { word: 'chair', icon: '🪑' }, { word: 'school bag', icon: '🎒' }, { word: 'scissors', icon: '✂️' }, { word: 'ruler', icon: '📏' }, { word: 'clock', icon: '🕐' }, { word: 'crayon', icon: '🖍️' }] },
  { theme: 'animals', grade: 2, words: [{ word: 'dog', icon: '🐕' }, { word: 'cat', icon: '🐈' }, { word: 'cow', icon: '🐄' }, { word: 'horse', icon: '🐎' }, { word: 'sheep', icon: '🐑' }, { word: 'chicken', icon: '🐔' }, { word: 'lion', icon: '🦁' }, { word: 'elephant', icon: '🐘' }, { word: 'monkey', icon: '🐒' }, { word: 'giraffe', icon: '🦒' }, { word: 'zebra', icon: '🦓' }] },
  { theme: 'clothes', grade: 2, words: [{ word: 'shirt', icon: '👕' }, { word: 'dress', icon: '👗' }, { word: 'shoes', icon: '👟' }, { word: 'hat', icon: '🎩' }, { word: 'socks', icon: '🧦' }, { word: 'coat', icon: '🧥' }, { word: 'trousers', icon: '👖' }, { word: 'scarf', icon: '🧣' }] },
  { theme: 'weather', grade: 2, words: [{ word: 'sun', icon: '☀️' }, { word: 'rain', icon: '🌧️' }, { word: 'cloud', icon: '☁️' }, { word: 'wind', icon: '🌬️' }, { word: 'snow', icon: '❄️' }, { word: 'rainbow', icon: '🌈' }, { word: 'lightning', icon: '⚡' }] },
  { theme: 'places', grade: 2, words: [{ word: 'house', icon: '🏠' }, { word: 'school', icon: '🏫' }, { word: 'shop', icon: '🏪' }, { word: 'hospital', icon: '🏥' }, { word: 'church', icon: '⛪' }, { word: 'post office', icon: '🏤' }, { word: 'bank', icon: '🏦' }] },
  { theme: 'actions', grade: 3, words: [{ word: 'run', icon: '🏃' }, { word: 'swim', icon: '🏊' }, { word: 'sleep', icon: '😴' }, { word: 'read', icon: '📖' }, { word: 'write', icon: '✍️' }, { word: 'dance', icon: '💃' }, { word: 'sing', icon: '🎤' }, { word: 'eat', icon: '🍽️' }] },
  { theme: 'feelings', grade: 3, words: [{ word: 'happy', icon: '😀' }, { word: 'sad', icon: '😢' }, { word: 'angry', icon: '😠' }, { word: 'scared', icon: '😨' }, { word: 'tired', icon: '🥱' }, { word: 'surprised', icon: '😮' }] },
  { theme: 'people who help us', grade: 3, words: [{ word: 'nurse', icon: '👩‍⚕️' }, { word: 'police officer', icon: '👮' }, { word: 'firefighter', icon: '👩‍🚒' }, { word: 'farmer', icon: '👨‍🌾' }, { word: 'teacher', icon: '👩‍🏫' }, { word: 'cook', icon: '👩‍🍳' }, { word: 'builder', icon: '👷' }] },
];

export const COLOURS = ['red', 'blue', 'yellow', 'green', 'orange', 'purple'] as const;
export type Colour = (typeof COLOURS)[number];
