import { Funnel, Stage } from '../src/domain/entities/Funnel';

describe('a funnel', () => {
  it('rejects a funnel with no stages', () => {
    expect(() => new Funnel('funnel-1', [])).toThrow();
  });

  it('rejects two stages sharing an id', () => {
    expect(
      () =>
        new Funnel('funnel-1', [
          { id: 'new', name: 'New' },
          { id: 'new', name: 'Also New' },
        ])
    ).toThrow();
  });

  it('rejects a capacity that is negative or fractional', () => {
    for (const capacity of [-1, 2.5]) {
      expect(() => new Funnel('funnel-1', [{ id: 'new', name: 'New', capacity }])).toThrow();
    }
  });

  it('rejects blank ids and names', () => {
    const blanks: Stage[][] = [
      [{ id: '', name: 'New' }],
      [{ id: 'new', name: '  ' }],
    ];

    for (const stages of blanks) {
      expect(() => new Funnel('funnel-1', stages)).toThrow();
    }
    expect(() => new Funnel('  ', [{ id: 'new', name: 'New' }])).toThrow();
  });

  it('accepts a stage with a capacity of zero, and holds no lead in it', () => {
    const funnel = new Funnel('funnel-1', [{ id: 'new', name: 'New', capacity: 0 }]);

    expect(funnel.hasRoom(funnel.firstStage(), 0)).toBe(false);
  });
});
