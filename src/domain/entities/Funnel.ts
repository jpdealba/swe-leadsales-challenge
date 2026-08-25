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

  findStage(stageId: string): Stage | undefined {
    return this.stages.find((stage) => stage.id === stageId);
  }

  /**
   * Whether a stage can hold one more lead. A stage without a capacity is
   * unbounded; a capacity of zero makes it permanently full.
   */
  hasRoom(stage: Stage, occupancy: number): boolean {
    return stage.capacity === undefined || occupancy < stage.capacity;
  }
}
