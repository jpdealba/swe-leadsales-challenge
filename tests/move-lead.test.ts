import { Funnel, Stage } from '../src/domain/entities/Funnel';
import { InMemoryLeadRepository } from '../src/infrastructure/persistence/InMemoryLeadRepository';
import { AddLeadToFunnel } from '../src/application/use-cases/AddLeadToFunnel';
import { MoveLeadToStage } from '../src/application/use-cases/MoveLeadToStage';
import { LeadNotFoundError } from '../src/domain/errors/LeadNotFoundError';
import { StageNotFoundError } from '../src/domain/errors/StageNotFoundError';
import { InvalidStageTransitionError } from '../src/domain/errors/InvalidStageTransitionError';
import { StageCapacityExceededError } from '../src/domain/errors/StageCapacityExceededError';

function buildFunnel(
  stages: Stage[] = [
    { id: 'new', name: 'New' },
    { id: 'contacted', name: 'Contacted' },
  ]
) {
  const funnel = new Funnel('funnel-1', stages);
  const repository = new InMemoryLeadRepository();

  return {
    repository,
    addLead: new AddLeadToFunnel(repository, funnel),
    moveLead: new MoveLeadToStage(repository, funnel),
  };
}

describe('moving a lead', () => {
  it('rejects a move for a phone that is not in the funnel', async () => {
    const { moveLead } = buildFunnel();

    await expect(
      moveLead.execute({ phone: '525599999999', targetStageId: 'contacted' })
    ).rejects.toThrow(LeadNotFoundError);
  });

  it('rejects a move to a stage that does not exist in the funnel', async () => {
    const { addLead, moveLead } = buildFunnel();

    await addLead.execute({ phone: '5512345678', name: 'Ana' });

    await expect(
      moveLead.execute({ phone: '5512345678', targetStageId: 'nope' })
    ).rejects.toThrow(StageNotFoundError);
  });

  it('rejects a move to the stage the lead is already in', async () => {
    const { addLead, moveLead } = buildFunnel();

    await addLead.execute({ phone: '5512345678', name: 'Ana' });

    await expect(
      moveLead.execute({ phone: '5512345678', targetStageId: 'new' })
    ).rejects.toThrow(InvalidStageTransitionError);
  });

  it('rejects a move into a stage that is already at capacity', async () => {
    const { addLead, moveLead } = buildFunnel([
      { id: 'new', name: 'New' },
      { id: 'qualified', name: 'Qualified', capacity: 2 },
    ]);

    for (const phone of ['5511111111', '5522222222', '5533333333']) {
      await addLead.execute({ phone, name: 'Ana' });
    }
    await moveLead.execute({ phone: '5511111111', targetStageId: 'qualified' });
    await moveLead.execute({ phone: '5522222222', targetStageId: 'qualified' });

    await expect(
      moveLead.execute({ phone: '5533333333', targetStageId: 'qualified' })
    ).rejects.toThrow(StageCapacityExceededError);
  });

  it('tells a lead in a full stage that it is already there, rather than that the stage is full', async () => {
    const { addLead, moveLead } = buildFunnel([
      { id: 'new', name: 'New' },
      { id: 'qualified', name: 'Qualified', capacity: 2 },
    ]);

    for (const phone of ['5511111111', '5522222222']) {
      await addLead.execute({ phone, name: 'Ana' });
      await moveLead.execute({ phone, targetStageId: 'qualified' });
    }

    await expect(
      moveLead.execute({ phone: '5511111111', targetStageId: 'qualified' })
    ).rejects.toThrow(InvalidStageTransitionError);
  });
});
