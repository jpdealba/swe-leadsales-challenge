import { Funnel } from '../src/domain/entities/Funnel';
import { InMemoryLeadRepository } from '../src/infrastructure/persistence/InMemoryLeadRepository';
import { AddLeadToFunnel } from '../src/application/use-cases/AddLeadToFunnel';
import { DuplicateLeadError } from '../src/domain/errors/DuplicateLeadError';
import { StageCapacityExceededError } from '../src/domain/errors/StageCapacityExceededError';

describe('adding a lead', () => {
  it('rejects a phone that is already in the funnel, however it is written', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New' },
      { id: 'contacted', name: 'Contacted' },
    ]);
    const addLead = new AddLeadToFunnel(new InMemoryLeadRepository(), funnel);

    await addLead.execute({ phone: '+52 55 1234 5678', name: 'Ana' });

    await expect(
      addLead.execute({ phone: '525512345678', name: 'Ana again' })
    ).rejects.toThrow(DuplicateLeadError);
  });

  it('rejects a lead when the first stage is full', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New', capacity: 1 },
      { id: 'contacted', name: 'Contacted' },
    ]);
    const addLead = new AddLeadToFunnel(new InMemoryLeadRepository(), funnel);

    await addLead.execute({ phone: '5511111111', name: 'Ana' });

    await expect(
      addLead.execute({ phone: '5522222222', name: 'Beto' })
    ).rejects.toThrow(StageCapacityExceededError);
  });

  it('accepts no lead at all when the first stage has a capacity of zero', async () => {
    const funnel = new Funnel('funnel-1', [
      { id: 'new', name: 'New', capacity: 0 },
      { id: 'contacted', name: 'Contacted' },
    ]);
    const addLead = new AddLeadToFunnel(new InMemoryLeadRepository(), funnel);

    await expect(addLead.execute({ phone: '5511111111', name: 'Ana' })).rejects.toThrow(
      StageCapacityExceededError
    );
  });
});
