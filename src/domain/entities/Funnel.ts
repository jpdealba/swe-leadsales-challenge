/**
 * Funnel entity.
 *
 * A funnel is an ordered list of stages. Each stage may define an
 * optional capacity limit (maximum number of leads it can hold).
 */
export interface Stage {
  id: string;
  name: string;
  capacity?: number;
}

export class Funnel {
  constructor(
    public readonly id: string,
    public readonly stages: Stage[]
  ) {}

  /** The stage every lead enters when it is added to the funnel. */
  firstStage(): Stage {
    return this.stages[0];
  }
}
