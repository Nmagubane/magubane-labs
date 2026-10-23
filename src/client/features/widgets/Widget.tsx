import type { WidgetSpec } from '../../../shared/content/types.ts';
import { EquationBalancer } from './EquationBalancer.tsx';
import { NumberLine, FractionBars, AreaModel, TwoPointGradient, LineExplorer, ParabolaRoots } from './MathWidgets.tsx';
import { ForceCart, ProjectileLab, CircuitLab, AtomBuilder, ChemBalancer, CellExplorer, PunnettSquare } from './ScienceWidgets.tsx';

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
  }
}
