import { Funnel } from '../src/domain/entities/Funnel';
import { InMemoryLeadRepository } from '../src/infrastructure/persistence/InMemoryLeadRepository';
import { AddLeadToFunnel } from '../src/application/use-cases/AddLeadToFunnel';
import { MoveLeadToStage } from '../src/application/use-cases/MoveLeadToStage';
import { LeadNotFoundError } from '../src/domain/errors/LeadNotFoundError';
import { StageNotFoundError } from '../src/domain/errors/StageNotFoundError';

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

  it('rejects a move to a stage that does not exist in the funnel', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New' },
      { id: 'contacted', name: 'Contacted' },
    ]);
    const repository = new InMemoryLeadRepository();
    const addLead = new AddLeadToFunnel(repository, funnel);
    const moveLead = new MoveLeadToStage(repository, funnel);

    await addLead.execute({ phone: '5512345678', name: 'Ana' });

    await expect(
      moveLead.execute({ phone: '5512345678', targetStageId: 'nope' })
    ).rejects.toThrow(StageNotFoundError);
  });
});
