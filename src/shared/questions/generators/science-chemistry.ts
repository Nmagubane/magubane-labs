import type { QuestionTemplate, Misconception, AnswerSpec, Difficulty } from '../types.ts';
import { fmt, round, chem, parseFormula } from '../tex.ts';

export interface Element {
  z: number;
  symbol: string;
  name: string;
  /** Mass number of the most common isotope. */
  a: number;
  /** Relative atomic mass used in calculations (CAPS data-sheet style). */
  mass: number;
  /** Charge of the common monatomic ion, if it forms one. */
  ion?: number;
}

export const ELEMENTS: Element[] = [
  { z: 1, symbol: 'H', name: 'hydrogen', a: 1, mass: 1, ion: 1 },
  { z: 2, symbol: 'He', name: 'helium', a: 4, mass: 4 },
  { z: 3, symbol: 'Li', name: 'lithium', a: 7, mass: 7, ion: 1 },
  { z: 4, symbol: 'Be', name: 'beryllium', a: 9, mass: 9, ion: 2 },
  { z: 5, symbol: 'B', name: 'boron', a: 11, mass: 11 },
  { z: 6, symbol: 'C', name: 'carbon', a: 12, mass: 12 },
  { z: 7, symbol: 'N', name: 'nitrogen', a: 14, mass: 14, ion: -3 },
  { z: 8, symbol: 'O', name: 'oxygen', a: 16, mass: 16, ion: -2 },
  { z: 9, symbol: 'F', name: 'fluorine', a: 19, mass: 19, ion: -1 },
  { z: 10, symbol: 'Ne', name: 'neon', a: 20, mass: 20 },
  { z: 11, symbol: 'Na', name: 'sodium', a: 23, mass: 23, ion: 1 },
  { z: 12, symbol: 'Mg', name: 'magnesium', a: 24, mass: 24, ion: 2 },
  { z: 13, symbol: 'Al', name: 'aluminium', a: 27, mass: 27, ion: 3 },
  { z: 14, symbol: 'Si', name: 'silicon', a: 28, mass: 28 },
  { z: 15, symbol: 'P', name: 'phosphorus', a: 31, mass: 31 },
  { z: 16, symbol: 'S', name: 'sulfur', a: 32, mass: 32, ion: -2 },
  { z: 17, symbol: 'Cl', name: 'chlorine', a: 35, mass: 35.5, ion: -1 },
  { z: 18, symbol: 'Ar', name: 'argon', a: 40, mass: 40 },
  { z: 19, symbol: 'K', name: 'potassium', a: 39, mass: 39, ion: 1 },
  { z: 20, symbol: 'Ca', name: 'calcium', a: 40, mass: 40, ion: 2 },
  { z: 26, symbol: 'Fe', name: 'iron', a: 56, mass: 56 },
  { z: 29, symbol: 'Cu', name: 'copper', a: 64, mass: 63.5 },
  { z: 30, symbol: 'Zn', name: 'zinc', a: 65, mass: 65, ion: 2 },
];

export const elementBySymbol = new Map(ELEMENTS.map((e) => [e.symbol, e]));
export const elementByZ = new Map(ELEMENTS.map((e) => [e.z, e]));

const ISOTOPES: { symbol: string; a: number; note: string }[] = [
  { symbol: 'C', a: 14, note: 'carbon-14, used to date ancient remains' },
  { symbol: 'H', a: 2, note: 'deuterium, "heavy hydrogen"' },
  { symbol: 'Cl', a: 37, note: 'chlorine-37' },
  { symbol: 'O', a: 18, note: 'oxygen-18, used in climate research' },
  { symbol: 'U', a: 235, note: 'uranium-235, the fuel in Koeberg nuclear power station' },
  { symbol: 'U', a: 238, note: 'uranium-238, the most common uranium isotope' },
  { symbol: 'C', a: 13, note: 'carbon-13' },
  { symbol: 'N', a: 15, note: 'nitrogen-15, used to trace fertiliser in soil' },
  { symbol: 'Mg', a: 26, note: 'magnesium-26' },
  { symbol: 'K', a: 40, note: 'potassium-40, found naturally in bananas' },
  { symbol: 'Ca', a: 44, note: 'calcium-44' },
  { symbol: 'Fe', a: 54, note: 'iron-54' },
];
const URANIUM = { z: 92, symbol: 'U', name: 'uranium' };

const exact = (value: number): AnswerSpec => ({ kind: 'numeric', value, tolerance: 0 });
const num = (value: number, rel = 0.01): AnswerSpec => ({ kind: 'numeric', value, tolerance: rel, relative: true });

function keepNum(ms: Misconception[], correct: number): Misconception[] {
  const seen = [correct];
  return ms.filter((m) => {
    if (m.answer.kind !== 'numeric') return false;
    const v = m.answer.value;
    if (!Number.isFinite(v) || seen.some((s) => Math.abs(s - v) < 1e-6)) return false;
    seen.push(v);
    return true;
  });
}

const nuclide = (sym: string, a: number, z: number, charge = 0) =>
  `{}^{${a}}_{${z}}\\text{${sym}}${charge ? `^{${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}}` : ''}`;

// ---------------------------------------------------------------------------
export const atomicStructure: QuestionTemplate = {
  id: 'atomic-structure',
  skillId: 'atomic-structure',
  generate(rng, level) {
    const common = ELEMENTS.filter((e) => e.z > 1);
    if (level === 1) {
      const e = rng.pick(common);
      const ask = rng.pick(['protons', 'electrons'] as const);
      return {
        prompt: `How many ${ask} are in a neutral atom of ${e.name}, $${nuclide(e.symbol, e.a, e.z)}$?`,
        input: { kind: 'numeric' },
        answer: exact(e.z),
        answerDisplay: `${e.z}`,
        hints: ['The bottom number is the atomic number: the number of protons.', ...(ask === 'electrons' ? ['A neutral atom has as many electrons as protons.'] : [])],
        solution: [`Atomic number $Z = ${e.z}$, so there are ${e.z} protons.`, ...(ask === 'electrons' ? [`Neutral atom: electrons = protons = ${e.z}.`] : [])],
        misconceptions: keepNum([{ code: 'neutrons-mass-number', answer: exact(e.a), feedback: `${e.a} is the mass number (protons + neutrons). The atomic number gives the ${ask}.` }], e.z),
      };
    }
    if (level === 2 || level === 3) {
      let sym: string, a: number, z: number, name: string, note = '';
      if (level === 2) {
        const e = rng.pick(common);
        sym = e.symbol;
        a = e.a;
        z = e.z;
        name = e.name;
      } else {
        const iso = rng.pick(ISOTOPES);
        const e = iso.symbol === 'U' ? URANIUM : (elementBySymbol.get(iso.symbol) as Element);
        sym = iso.symbol;
        a = iso.a;
        z = e.z;
        name = e.name;
        note = ` (${iso.note})`;
      }
      const n = a - z;
      return {
        prompt: `How many neutrons are in an atom of $${nuclide(sym, a, z)}$${note}?`,
        input: { kind: 'numeric' },
        answer: exact(n),
        answerDisplay: `${n}`,
        hints: ['The top number (mass number) counts protons + neutrons.', 'Neutrons = mass number − atomic number.'],
        solution: [`Mass number $A = ${a}$, atomic number $Z = ${z}$.`, `Neutrons $= ${a} - ${z} = ${n}$.`],
        misconceptions: keepNum(
          [
            { code: 'neutrons-mass-number', answer: exact(a), feedback: `${a} is the mass number, protons and neutrons together. Subtract the ${z} protons.` },
            { code: 'neutrons-mass-number', answer: exact(a + z), feedback: 'Subtract the atomic number from the mass number. Don\'t add it.' },
          ],
          n,
        ),
      };
    }
    const ions = ELEMENTS.filter((e) => e.ion !== undefined && e.z > 1);
    const e = rng.pick(ions);
    const q = e.ion as number;
    const electrons = e.z - q;
    if (level === 4) {
      return {
        prompt: `How many electrons does the ion $${nuclide(e.symbol, e.a, e.z, q)}$ have?`,
        input: { kind: 'numeric' },
        answer: exact(electrons),
        answerDisplay: `${electrons}`,
        hints: ['A neutral atom has as many electrons as protons.', q > 0 ? `A ${q}+ charge means ${q} electron${q > 1 ? 's were' : ' was'} lost.` : `A ${-q}− charge means ${-q} electron${-q > 1 ? 's were' : ' was'} gained.`],
        solution: [`Protons: ${e.z}.`, `Charge ${q > 0 ? `+${q}` : q}: electrons $= ${e.z} ${q > 0 ? '-' : '+'} ${Math.abs(q)} = ${electrons}$.`],
        misconceptions: keepNum(
          [
            { code: 'ion-electrons', answer: exact(e.z + q), feedback: q > 0 ? 'A positive ion has **lost** electrons, so it has fewer than the protons.' : 'A negative ion has **gained** electrons, so it has more than the protons.' },
            { code: 'ion-electrons', answer: exact(e.z), feedback: 'That would be a neutral atom. The charge tells you electrons were lost or gained.' },
          ],
          electrons,
        ),
      };
    }
    return {
      prompt: `An ion has ${electrons} electrons and a charge of $${q > 0 ? '+' : '-'}${Math.abs(q)}$. How many protons does it have?`,
      input: { kind: 'numeric' },
      answer: exact(e.z),
      answerDisplay: `${e.z} (it is ${e.name}, ${e.symbol})`,
      hints: ['Charge = protons − electrons.', `So protons = electrons + charge.`],
      solution: [`Protons $= ${electrons} ${q > 0 ? '+' : '-'} ${Math.abs(q)} = ${e.z}$.`, `Atomic number ${e.z} is ${e.name}, so this is the ion $\\text{${e.symbol}}^{${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '-'}}$.`],
      misconceptions: keepNum([{ code: 'ion-electrons', answer: exact(electrons - q), feedback: q > 0 ? 'A positive ion has more protons than electrons.' : 'A negative ion has fewer protons than electrons.' }], e.z),
    };
  },
};

// ---------------------------------------------------------------------------
export function molarMass(formula: string): number {
  const counts = parseFormula(formula);
  return round(
    Object.entries(counts).reduce((s, [el, n]) => s + (elementBySymbol.get(el)?.mass ?? NaN) * n, 0),
    2,
  );
}

const COMPOUNDS: { formula: string; name: string }[] = [
  { formula: 'H2O', name: 'water' },
  { formula: 'CO2', name: 'carbon dioxide' },
  { formula: 'NaCl', name: 'sodium chloride (table salt)' },
  { formula: 'CaCO3', name: 'calcium carbonate (limestone)' },
  { formula: 'NH3', name: 'ammonia' },
  { formula: 'CH4', name: 'methane' },
  { formula: 'MgO', name: 'magnesium oxide' },
  { formula: 'NaOH', name: 'sodium hydroxide' },
  { formula: 'H2SO4', name: 'sulfuric acid' },
  { formula: 'C6H12O6', name: 'glucose' },
];

export const moles: QuestionTemplate = {
  id: 'moles',
  skillId: 'moles',
  generate(rng, level) {
    if (level === 1) {
      const e = rng.pick(ELEMENTS.filter((x) => Number.isInteger(x.mass) && x.z > 2));
      const n = rng.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
      const m = round(n * e.mass, 2);
      return {
        prompt: `How many moles of ${e.name} atoms are in ${fmt(m)} g of ${e.name}? ($M = ${e.mass}$ g/mol)`,
        input: { kind: 'numeric', unit: 'mol' },
        answer: num(n),
        answerDisplay: `${fmt(n)} mol`,
        hints: ['$n = \\dfrac{m}{M}$: mass divided by molar mass.'],
        solution: [`$n = \\dfrac{m}{M} = \\dfrac{${fmt(m)}}{${e.mass}} = ${fmt(n)}$ mol.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(e.mass / m), feedback: 'You divided molar mass by mass. It is mass ÷ molar mass.' }], n),
      };
    }
    const c = rng.pick(COMPOUNDS);
    const M = molarMass(c.formula);
    const n = rng.pick([0.1, 0.2, 0.25, 0.5, 1.5, 2, 3]);
    const m = round(n * M, 2);
    const ftex = chem(c.formula);
    if (level === 2 || level === 3) {
      const given = level === 2 ? ` ($M = ${fmt(M)}$ g/mol)` : '';
      const counts = parseFormula(c.formula);
      return {
        prompt: `How many moles are in ${fmt(m)} g of ${c.name}, $${ftex}$?${given}${level === 3 ? ' Use the relative atomic masses on your data sheet.' : ''}`,
        input: { kind: 'numeric', unit: 'mol' },
        answer: num(n),
        answerDisplay: `${fmt(n)} mol`,
        hints:
          level === 3
            ? ['First work out the molar mass $M$ by adding up the atomic masses.', `$M(${ftex}) = ${Object.entries(counts).map(([el, k]) => `${k > 1 ? `${k} \\times ` : ''}${elementBySymbol.get(el)?.mass}`).join(' + ')}$.`, 'Then $n = \\dfrac{m}{M}$.']
            : ['$n = \\dfrac{m}{M}$.'],
        solution: [
          ...(level === 3 ? [`$M = ${Object.entries(counts).map(([el, k]) => `${k > 1 ? `${k}(${elementBySymbol.get(el)?.mass})` : elementBySymbol.get(el)?.mass}`).join(' + ')} = ${fmt(M)}$ g/mol.`] : []),
          `$n = \\dfrac{${fmt(m)}}{${fmt(M)}} = ${fmt(n)}$ mol.`,
        ],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(M / m), feedback: 'Upside down: $n = \\dfrac{m}{M}$.' }, { code: 'formula-rearranged-wrongly', answer: num(m * M), feedback: 'You multiplied. To get moles from mass, divide by the molar mass.' }], n),
      };
    }
    if (level === 4) {
      return {
        prompt: `What is the mass of ${fmt(n)} mol of ${c.name}, $${ftex}$? ($M = ${fmt(M)}$ g/mol)`,
        input: { kind: 'numeric', unit: 'g' },
        answer: num(m),
        answerDisplay: `${fmt(m)} g`,
        hints: ['Rearrange $n = \\dfrac{m}{M}$ to make $m$ the subject.', '$m = nM$.'],
        solution: [`$m = nM = ${fmt(n)} \\times ${fmt(M)} = ${fmt(m)}$ g.`],
        misconceptions: keepNum([{ code: 'formula-rearranged-wrongly', answer: num(M / n), feedback: 'Mass = moles × molar mass.' }, { code: 'formula-rearranged-wrongly', answer: num(n / M), feedback: 'Mass = moles × molar mass. You divided.' }], m),
      };
    }
    const withO = COMPOUNDS.filter((x) => (parseFormula(x.formula).O ?? 0) >= 2);
    const cc = rng.pick(withO);
    const MM = molarMass(cc.formula);
    const k = parseFormula(cc.formula).O as number;
    const nn = rng.pick([0.1, 0.2, 0.5, 1, 2]);
    const mm = round(nn * MM, 2);
    return {
      prompt: `How many moles of oxygen **atoms** are in ${fmt(mm)} g of $${chem(cc.formula)}$? ($M = ${fmt(MM)}$ g/mol)`,
      input: { kind: 'numeric', unit: 'mol' },
      answer: num(nn * k),
      answerDisplay: `${fmt(nn * k)} mol of O atoms`,
      hints: [`First find the moles of $${chem(cc.formula)}$.`, `Each formula unit contains ${k} O atoms.`],
      solution: [`$n(${chem(cc.formula)}) = \\dfrac{${fmt(mm)}}{${fmt(MM)}} = ${fmt(nn)}$ mol.`, `$n(\\text{O}) = ${k} \\times ${fmt(nn)} = ${fmt(nn * k)}$ mol.`],
      misconceptions: keepNum([{ code: 'atoms-per-formula', answer: num(nn), feedback: `That is the moles of $${chem(cc.formula)}$. Each one contains ${k} oxygen atoms.` }], nn * k),
    };
  },
};

// ---------------------------------------------------------------------------
export interface ChemEquation {
  reactants: string[];
  products: string[];
  coefficients: number[];
  name: string;
}

export const EQUATIONS: Record<Difficulty, ChemEquation[]> = {
  1: [
    { reactants: ['H2', 'O2'], products: ['H2O'], coefficients: [2, 1, 2], name: 'Hydrogen burning to form water' },
    { reactants: ['N2', 'H2'], products: ['NH3'], coefficients: [1, 3, 2], name: 'The Haber process (making ammonia)' },
    { reactants: ['Na', 'Cl2'], products: ['NaCl'], coefficients: [2, 1, 2], name: 'Making table salt' },
    { reactants: ['Mg', 'O2'], products: ['MgO'], coefficients: [2, 1, 2], name: 'Magnesium burning' },
    { reactants: ['H2', 'Cl2'], products: ['HCl'], coefficients: [1, 1, 2], name: 'Making hydrogen chloride' },
  ],
  2: [
    { reactants: ['CH4', 'O2'], products: ['CO2', 'H2O'], coefficients: [1, 2, 1, 2], name: 'Methane burning' },
    { reactants: ['K', 'H2O'], products: ['KOH', 'H2'], coefficients: [2, 2, 2, 1], name: 'Potassium in water' },
    { reactants: ['Ca', 'H2O'], products: ['Ca(OH)2', 'H2'], coefficients: [1, 2, 1, 1], name: 'Calcium in water' },
    { reactants: ['Zn', 'HCl'], products: ['ZnCl2', 'H2'], coefficients: [1, 2, 1, 1], name: 'Zinc and hydrochloric acid' },
  ],
  3: [
    { reactants: ['Al', 'O2'], products: ['Al2O3'], coefficients: [4, 3, 2], name: 'Aluminium oxidising' },
    { reactants: ['Fe', 'O2'], products: ['Fe2O3'], coefficients: [4, 3, 2], name: 'Iron rusting (simplified)' },
    { reactants: ['NaOH', 'H2SO4'], products: ['Na2SO4', 'H2O'], coefficients: [2, 1, 1, 2], name: 'Neutralisation' },
    { reactants: ['CaCO3', 'HCl'], products: ['CaCl2', 'H2O', 'CO2'], coefficients: [1, 2, 1, 1, 1], name: 'Limestone and acid' },
  ],
  4: [
    { reactants: ['C3H8', 'O2'], products: ['CO2', 'H2O'], coefficients: [1, 5, 3, 4], name: 'Propane (gas braai) burning' },
    { reactants: ['Al', 'HCl'], products: ['AlCl3', 'H2'], coefficients: [2, 6, 2, 3], name: 'Aluminium and hydrochloric acid' },
    { reactants: ['Fe2O3', 'CO'], products: ['Fe', 'CO2'], coefficients: [1, 3, 2, 3], name: 'Extracting iron in a blast furnace' },
  ],
  5: [
    { reactants: ['C2H6', 'O2'], products: ['CO2', 'H2O'], coefficients: [2, 7, 4, 6], name: 'Ethane burning' },
    { reactants: ['C4H10', 'O2'], products: ['CO2', 'H2O'], coefficients: [2, 13, 8, 10], name: 'Butane burning' },
    { reactants: ['C6H12O6', 'O2'], products: ['CO2', 'H2O'], coefficients: [1, 6, 6, 6], name: 'Cellular respiration' },
  ],
};

export function equationTex(eq: ChemEquation, coefficients?: (number | null)[]): string {
  const species = [...eq.reactants, ...eq.products];
  const parts = species.map((s, i) => {
    const c = coefficients?.[i];
    return `${c && c > 1 ? c : coefficients ? '\\square\\,' : ''}${chem(s)}`;
  });
  return `${parts.slice(0, eq.reactants.length).join(' + ')} \\rightarrow ${parts.slice(eq.reactants.length).join(' + ')}`;
}

export const balancingEquations: QuestionTemplate = {
  id: 'balancing-equations',
  skillId: 'balancing-equations',
  generate(rng, level) {
    const eq = rng.pick(EQUATIONS[level]);
    const species = [...eq.reactants, ...eq.products];
    const balanced = equationTex(eq, eq.coefficients);
    return {
      prompt: `${eq.name}. Balance the equation: $${equationTex(eq)}$`,
      input: { kind: 'coefficients', species, arrowAfter: eq.reactants.length },
      answer: { kind: 'coefficients', values: eq.coefficients },
      answerDisplay: `$${balanced}$`,
      hints: [
        'Count the atoms of each element on both sides.',
        'Change only the coefficients in front of each formula. Never change the small numbers inside a formula.',
        level >= 4 ? 'Balance C first, then H, and leave O until last. If O comes out odd, double everything.' : 'Start with the element that appears in the fewest formulas.',
      ],
      solution: [
        `Balanced: $${balanced}$.`,
        `Check: ${Object.keys(parseFormula(species.join(''))).map((el) => {
          const left = eq.reactants.reduce((s, sp, i) => s + (parseFormula(sp)[el] ?? 0) * (eq.coefficients[i] as number), 0);
          return `${el}: ${left} on each side`;
        }).join('; ')}.`,
      ],
      misconceptions: [],
    };
  },
};
