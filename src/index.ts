import { Funnel } from './domain/entities/Funnel';
import { InMemoryLeadRepository } from './infrastructure/persistence/InMemoryLeadRepository';
import { AddLeadToFunnel } from './application/use-cases/AddLeadToFunnel';
import { MoveLeadToStage } from './application/use-cases/MoveLeadToStage';

/** Runs an operation that the funnel is expected to reject, and reports the rule that blocked it. */
async function expectRejected(label: string, operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
    console.log(`${label}\n   NOT REJECTED - the rule did not fire`);
  } catch (error) {
    const { name, message } = error as Error;
    console.log(`${label}\n   rejected by ${name}: ${message}`);
  }
}

/**
 * Simulation entry point.
 */
async function main(): Promise<void> {
  const funnel = new Funnel('funnel-1', [
    { id: 'new', name: 'New' },
    { id: 'contacted', name: 'Contacted' },
    { id: 'qualified', name: 'Qualified', capacity: 2 },
    { id: 'closed', name: 'Closed' },
  ]);

  const repository = new InMemoryLeadRepository();
  const addLead = new AddLeadToFunnel(repository, funnel);
  const moveLead = new MoveLeadToStage(repository, funnel);

  console.log('1. Add a lead');
  await addLead.execute({ phone: '+52 55 1234 5678', name: 'Ana' });
  const ana = await repository.findByPhone('525512345678');
  console.log(`   added ${ana?.name} as ${ana?.phone}, in stage "${ana?.stageId}"`);

  console.log('\n2. Move that lead to another stage');
  await moveLead.execute({ phone: '+52 55 1234 5678', targetStageId: 'contacted' });
  console.log(`   Ana is now in stage "${(await repository.findByPhone('525512345678'))?.stageId}"`);

  await expectRejected('\n3. Add the same phone again, written differently', () =>
    addLead.execute({ phone: '52-55-1234-5678', name: 'Ana (again)' })
  );

  await expectRejected('\n4. Move a lead to the stage it is already in', () =>
    moveLead.execute({ phone: '525512345678', targetStageId: 'contacted' })
  );

  await addLead.execute({ phone: '5522222222', name: 'Beto' });
  await addLead.execute({ phone: '5533333333', name: 'Caro' });
  await addLead.execute({ phone: '5544444444', name: 'Dani' });
  await moveLead.execute({ phone: '5522222222', targetStageId: 'qualified' });
  await moveLead.execute({ phone: '5533333333', targetStageId: 'qualified' });

  await expectRejected(
    '\n5. Move a third lead into "qualified", which holds 2 of 2',
    () => moveLead.execute({ phone: '5544444444', targetStageId: 'qualified' })
  );

  console.log('\nFunnel:');
  for (const stage of funnel.stages) {
    const leads = await repository.findByStage(stage.id);
    const limit = stage.capacity === undefined ? 'no limit' : `${leads.length}/${stage.capacity}`;
    console.log(`   ${stage.name} (${limit}): ${leads.map((lead) => lead.name).join(', ') || '-'}`);
  }
}

main().catch(console.error);
