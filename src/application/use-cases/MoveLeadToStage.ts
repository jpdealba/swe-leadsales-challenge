import { Funnel } from '../../domain/entities/Funnel';
import { Lead } from '../../domain/entities/Lead';
import { LeadRepository } from '../../domain/repositories/LeadRepository';
import { LeadNotFoundError } from '../../domain/errors/LeadNotFoundError';
import { StageNotFoundError } from '../../domain/errors/StageNotFoundError';
import { InvalidStageTransitionError } from '../../domain/errors/InvalidStageTransitionError';
import { StageCapacityExceededError } from '../../domain/errors/StageCapacityExceededError';

export interface MoveLeadToStageData {
  phone: string;
  targetStageId: string;
}

/**
 * Use case: move an existing lead to another stage of the funnel.
 *
 * Rules:
 * - The lead must exist in the funnel.
 * - The target stage must exist in the funnel.
 * - The target stage must have capacity available.
 * - Moving a lead to the stage it is already in is not a valid transition.
 */
export class MoveLeadToStage {
  constructor(
    private readonly repository: LeadRepository,
    private readonly funnel: Funnel
  ) {}

  async execute(data: MoveLeadToStageData): Promise<void> {
    const phone = Lead.normalizePhone(data.phone);
    const lead = await this.repository.findByPhone(phone);

    if (lead === null) {
      throw new LeadNotFoundError(phone);
    }

    const targetStage = this.funnel.findStage(data.targetStageId);

    if (targetStage === undefined) {
      throw new StageNotFoundError(data.targetStageId);
    }

    if (lead.stageId === data.targetStageId) {
      throw new InvalidStageTransitionError(
        `Lead ${phone} is already in stage ${data.targetStageId}`
      );
    }

    const occupancy = (await this.repository.findByStage(data.targetStageId)).length;

    if (!this.funnel.hasRoom(targetStage, occupancy)) {
      throw new StageCapacityExceededError(data.targetStageId);
    }

    lead.stageId = data.targetStageId;

    await this.repository.save(lead);
  }
}
