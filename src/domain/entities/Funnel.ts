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
  ) {
    if (id.trim() === '') {
      throw new Error('A funnel needs an id');
    }

    if (stages.length === 0) {
      throw new Error(`Funnel ${id} needs at least one stage`);
    }

    for (const stage of stages) {
      if (stage.id.trim() === '' || stage.name.trim() === '') {
        throw new Error(`Funnel ${id} has a stage with a blank id or name`);
      }

      if (stage.capacity !== undefined && (!Number.isInteger(stage.capacity) || stage.capacity < 0)) {
        throw new Error(
          `Stage ${stage.id} has an invalid capacity of ${stage.capacity}`
        );
      }
    }

    if (new Set(stages.map((stage) => stage.id)).size !== stages.length) {
      throw new Error(`Funnel ${id} has two stages sharing an id`);
    }
  }

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
