import { Lead } from '../../domain/entities/Lead';
import { LeadRepository } from '../../domain/repositories/LeadRepository';

/**
 * In-memory implementation of the LeadRepository.
 *
 * Leads are keyed by their phone number, which the domain has already
 * normalized. This adapter stores and matches the string it is given.
 */
export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads = new Map<string, Lead>();

  async save(lead: Lead): Promise<void> {
    this.leads.set(lead.phone, lead);
  }

  async findByPhone(phone: string): Promise<Lead | null> {
    return this.leads.get(phone) ?? null;
  }

  async findByStage(stageId: string): Promise<Lead[]> {
    return [...this.leads.values()].filter((lead) => lead.stageId === stageId);
  }
}
