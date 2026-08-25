import { Funnel } from '../src/domain/entities/Funnel';
import { InMemoryLeadRepository } from '../src/infrastructure/persistence/InMemoryLeadRepository';
import { MoveLeadToStage } from '../src/application/use-cases/MoveLeadToStage';
import { LeadNotFoundError } from '../src/domain/errors/LeadNotFoundError';

describe('moving a lead', () => {
  it('rejects a move for a phone that is not in the funnel', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New' },
      { id: 'contacted', name: 'Contacted' },
    ]);
    const moveLead = new MoveLeadToStage(new InMemoryLeadRepository(), funnel);

    await expect(
      moveLead.execute({ phone: '525599999999', targetStageId: 'contacted' })
    ).rejects.toThrow(LeadNotFoundError);
  });
});
