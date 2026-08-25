import { Funnel } from '../src/domain/entities/Funnel';
import { InMemoryLeadRepository } from '../src/infrastructure/persistence/InMemoryLeadRepository';
import { AddLeadToFunnel } from '../src/application/use-cases/AddLeadToFunnel';
import { MoveLeadToStage } from '../src/application/use-cases/MoveLeadToStage';

describe('lead funnel', () => {
  it('adds a lead to the first stage and moves it to another stage', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New' },
      { id: 'contacted', name: 'Contacted' },
      { id: 'qualified', name: 'Qualified', capacity: 2 },
      { id: 'closed', name: 'Closed' },
    ]);
    const repository = new InMemoryLeadRepository();
    const addLead = new AddLeadToFunnel(repository, funnel);
    const moveLead = new MoveLeadToStage(repository, funnel);

    await addLead.execute({ phone: '+52 55 1234 5678', name: 'Ana' });

    const added = await repository.findByPhone('525512345678');
    expect(added?.name).toBe('Ana');
    expect(added?.stageId).toBe('new');
    expect(await repository.findByStage('new')).toHaveLength(1);

    await moveLead.execute({ phone: '+52 55 1234 5678', targetStageId: 'contacted' });

    const moved = await repository.findByPhone('525512345678');
    expect(moved?.stageId).toBe('contacted');
    expect(await repository.findByStage('new')).toHaveLength(0);
    expect(await repository.findByStage('contacted')).toHaveLength(1);
  });
});
