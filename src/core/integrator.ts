import { PHYSICS_DT, MAX_SUBSTEPS } from '../utils/constants';
import { rk4Step, PendulumParams, State } from './physics';

/**
 * Fixed-timestep accumulator. Render frames at any rate; physics advances
 * deterministically at PHYSICS_DT, with leftover time interpolated visually.
 */
export class FixedStepIntegrator {
  accumulator = 0;
  alpha = 0;

  step(state: State, params: PendulumParams, frameDt: number): number {
    this.accumulator += Math.min(frameDt, 0.1);
    let steps = 0;
    while (this.accumulator >= PHYSICS_DT && steps < MAX_SUBSTEPS) {
      rk4Step(state, params, PHYSICS_DT);
      this.accumulator -= PHYSICS_DT;
      steps++;
    }
    this.alpha = this.accumulator / PHYSICS_DT;
    return steps;
  }

  reset() {
    this.accumulator = 0;
    this.alpha = 0;
  }
}
