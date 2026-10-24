import type { WidgetSpec } from '../../../shared/content/types.ts';
import { EquationBalancer } from './EquationBalancer.tsx';
import { NumberLine, FractionBars, AreaModel, TwoPointGradient, LineExplorer, ParabolaRoots } from './MathWidgets.tsx';
import { ForceCart, ProjectileLab, CircuitLab, AtomBuilder, ChemBalancer, CellExplorer, PunnettSquare } from './ScienceWidgets.tsx';
import { ParticleLab, FloatTank, PhLab, ConductionRace, EnergyDrop, ParallelLab } from './PhysicalLabs.tsx';
import { KeyExplorer, EnergyPyramid, PondweedLab, HeartPath, MitosisLab } from './LifeLabs.tsx';
import { LivingSort, BeanLab, LifeCycleLab, StatesLab, MaterialBench, SeparationLab } from './NstLabs.tsx';
import { SoundLab, CircuitBuilder, MoonLab, PlanetStrip, BridgeLab } from './NstLabs2.tsx';
import { PlaceValueChart, ArrayModel, FractionOfSet, DecimalGrid, RectangleLab } from './MathLabs2.tsx';
import { ExponentLadder, DiscriminantLab, SequencePlotter, TriangleTrig, SavingsGrowth, TangentLab } from './MathLabs3.tsx';

export function Widget({ spec }: { spec: WidgetSpec }) {
  switch (spec.type) {
    case 'equation-balancer':
      return <EquationBalancer a={spec.a} b={spec.b} c={spec.c} d={spec.d} />;
    case 'number-line':
      return <NumberLine start={spec.start} change={spec.change} />;
    case 'fraction-bars':
      return <FractionBars a={spec.a} b={spec.b} />;
    case 'area-model':
      return <AreaModel p={spec.p} q={spec.q} {...(spec.target ? { target: spec.target } : {})} />;
    case 'two-point-gradient':
      return <TwoPointGradient a={spec.a} b={spec.b} />;
    case 'line-explorer':
      return <LineExplorer m={spec.m} c={spec.c} />;
    case 'parabola-roots':
      return <ParabolaRoots p={spec.p} q={spec.q} />;
    case 'force-cart':
      return <ForceCart mass={spec.mass} force={spec.force} friction={spec.friction} />;
    case 'projectile-lab':
      return <ProjectileLab />;
    case 'circuit-lab':
      return <CircuitLab voltage={spec.voltage} r1={spec.r1} r2={spec.r2} />;
    case 'atom-builder':
      return <AtomBuilder protons={spec.protons} neutrons={spec.neutrons} electrons={spec.electrons} />;
    case 'chem-balancer':
      return <ChemBalancer level={spec.level} index={spec.index} />;
    case 'cell-explorer':
      return <CellExplorer />;
    case 'punnett':
      return <PunnettSquare parentA={spec.parentA} parentB={spec.parentB} />;
    case 'particle-lab':
      return <ParticleLab substance={spec.substance} />;
    case 'float-tank':
      return <FloatTank />;
    case 'ph-lab':
      return <PhLab />;
    case 'conduction-race':
      return <ConductionRace />;
    case 'energy-drop':
      return <EnergyDrop />;
    case 'parallel-lab':
      return <ParallelLab />;
    case 'key-explorer':
      return <KeyExplorer />;
    case 'energy-pyramid':
      return <EnergyPyramid />;
    case 'pondweed-lab':
      return <PondweedLab />;
    case 'heart-path':
      return <HeartPath />;
    case 'mitosis-lab':
      return <MitosisLab />;
    case 'living-sort':
      return <LivingSort />;
    case 'bean-lab':
      return <BeanLab />;
    case 'life-cycle-lab':
      return <LifeCycleLab />;
    case 'states-lab':
      return <StatesLab />;
    case 'material-bench':
      return <MaterialBench />;
    case 'separation-lab':
      return <SeparationLab />;
    case 'sound-lab':
      return <SoundLab />;
    case 'circuit-builder':
      return <CircuitBuilder />;
    case 'moon-lab':
      return <MoonLab />;
    case 'planet-strip':
      return <PlanetStrip />;
    case 'bridge-lab':
      return <BridgeLab />;
    case 'place-value-chart':
      return <PlaceValueChart start={spec.start} />;
    case 'array-model':
      return <ArrayModel rows={spec.rows} cols={spec.cols} />;
    case 'fraction-of-set':
      return <FractionOfSet />;
    case 'decimal-grid':
      return <DecimalGrid />;
    case 'rectangle-lab':
      return <RectangleLab target={spec.target} />;
    case 'exponent-ladder':
      return <ExponentLadder />;
    case 'discriminant-lab':
      return <DiscriminantLab />;
    case 'sequence-plotter':
      return <SequencePlotter />;
    case 'triangle-trig':
      return <TriangleTrig />;
    case 'savings-growth':
      return <SavingsGrowth />;
    case 'tangent-lab':
      return <TangentLab />;
  }
}
