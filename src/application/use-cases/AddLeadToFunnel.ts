import { Funnel } from '../../domain/entities/Funnel';
import { Lead } from '../../domain/entities/Lead';
import { LeadRepository } from '../../domain/repositories/LeadRepository';

export interface AddLeadToFunnelData {
  phone: string;
  name: string;
}

/**
 * Use case: add a new lead to the funnel.
 *
 * Rules:
 * - No lead with the same phone number may already exist in the funnel.
 * - New leads always enter the funnel's first stage.
 * - The first stage must have capacity available.
 */
export class AddLeadToFunnel {
  constructor(
    private readonly repository: LeadRepository,
    private readonly funnel: Funnel
  ) {}

  async execute(data: AddLeadToFunnelData): Promise<void> {
    const lead = new Lead(data.phone, data.name, this.funnel.firstStage().id);

    await this.repository.save(lead);
  }
}
