# Implementation plan

Ordered by technical dependency: each step compiles and is checkable on its own, and depends only on
steps above it. Decisions come from `ANALYSIS.md` §0; vocabulary from `CONTEXT.md`.

Tests come first. Step 1 writes one end-to-end happy-path test and watches it fail; every step after
that adds its own negative tests **in the same step as the behavior they pin**. Manual validation is
therefore `npm test` throughout, plus `npm start` at step 8. `npm run build` must stay clean after
every step.

The happy-path test stays red from step 1 until step 7. That is the point of writing it first: it is
the definition of done, and the first time it passes, the graded core is finished.

---

## 1. `tests/funnel.test.ts` — the happy path, red

**Behavior.** Jest's `roots` already points at `<rootDir>/tests`, which does not exist, so `npm test`
passes vacuously today. Create the directory and one test that walks the whole flow against the
README's fixture: add a lead, assert it lands in the first stage, move it to `contacted`, assert it
is there and no longer in `new`.

Nothing is implemented yet, so the stubs throw `Not implemented` and the test fails. Imports resolve
because every file already exists.

**Depends on.** Nothing.

**Validate.** `npm test` — one failing test, and the count must be **non-zero**. `--passWithNoTests`
reports green on an empty run, so "0 tests, passed" means the directory or `testMatch` is wrong, not
that you are done.

---

## 2. `src/domain/errors/LeadNotFoundError.ts` (new file)

**Behavior.** Fifth error class, shaped exactly like the other four: `constructor(phone: string)`,
canned message, `this.name = 'LeadNotFoundError'`.

**Depends on.** Nothing. Early because every later step imports errors.

**Validate.** No test of its own — an error class with no logic does not earn one. It gets exercised
by step 7's negative tests. Just confirm `npm run build` stays clean.

---

## 3. `src/domain/entities/Lead.ts`

**Behavior.**

- `static normalizePhone(phone: string): string` — strips everything that is not a digit.
- Constructor normalizes `phone` first, **then** rejects an empty result; rejects blank/whitespace
  `name`; rejects blank `stageId`. Plain `Error` for all three.
- `phone` and `name` stay `readonly`; `stageId` stays public and mutable.

**Depends on.** Nothing.

**Negative tests, this step** (`tests/lead.test.ts`):

- `new Lead('+52 55 1234 5678', ...)` stores `525512345678`.
- `'abc'` and `'+++'` are rejected. These are the ones that matter — they prove normalization runs
  *before* the empty check. If they pass instead of throwing, junk input becomes a stored lead that
  every later junk input then collides with as a "duplicate".
- `''` is rejected; a blank `name` is rejected.
- `Lead.normalizePhone('55-12-34') === '551234'`.

**Validate.** `npm test` — `lead.test.ts` green, `funnel.test.ts` still red.

---

## 4. `src/domain/entities/Funnel.ts`

**Behavior.**

- Constructor rejects: empty `stages`, duplicate stage ids, blank `id` / `stage.id` / `stage.name`,
  and any `capacity` that is negative or not an integer. Plain `Error`.
- `firstStage(): Stage` — the head of `stages`.
- `findStage(stageId: string): Stage | undefined`.
- `hasRoom(stage: Stage, occupancy: number): boolean` — `true` when `capacity` is `undefined`,
  otherwise `occupancy < capacity`. Keeps rule 3 in the domain rather than in the use cases.

**Depends on.** Nothing — `Stage` already lives in this file.

**Negative tests, this step** (`tests/funnel-entity.test.ts`):

- Rejected at construction: `[]`, duplicate stage ids, `capacity: -1`, `capacity: 2.5`, blank
  `stage.id`, blank `stage.name`, blank funnel `id`.
- `capacity: 0` **constructs**, and `hasRoom(stage, 0)` is `false` — permanently full, not unbounded.
  This is the pair that distinguishes the two readings of zero.
- `hasRoom` at the boundary: with `capacity: 2`, `true` at occupancy 1 and `false` at 2. That is the
  `count >= capacity` rule.
- `hasRoom` is `true` at occupancy 9999 for a stage with no `capacity`.

**Validate.** `npm test` — `funnel-entity.test.ts` green.

---

## 5. `src/infrastructure/persistence/InMemoryLeadRepository.ts`

**Behavior.** A `Map<string, Lead>` keyed by `lead.phone`, already normalized by step 3.

- `save` — `set`, so it upserts.
- `findByPhone` — `get(phone) ?? null`, matching the given string verbatim, **no normalization here**.
- `findByStage` — every lead whose `stageId` matches, in insertion order.

**Depends on.** Step 3.

**Negative tests, this step** (`tests/repository.test.ts`):

- `findByPhone('525512345678')` finds a lead saved as `'+52 55 1234 5678'`; `findByPhone('+52 55 1234 5678')`
  returns `null`. The second assertion is the point of the step — the adapter does not normalize,
  because every caller hands it an already-normalized phone.
- `findByPhone` on an unknown phone returns `null`, not `undefined`.
- Saving the same lead twice leaves one entry — `save` upserts.
- After mutating `stageId` and saving, `findByStage` reflects the move in both stages.

**Validate.** `npm test` — `repository.test.ts` green.

---

## 6. `src/application/use-cases/AddLeadToFunnel.ts`

**Behavior.** Construct the `Lead` on the funnel's first stage first, then:

1. `findByPhone(lead.phone)` returns non-null → `DuplicateLeadError`.
2. `hasRoom(firstStage, (await findByStage(firstStage.id)).length)` is false → `StageCapacityExceededError`.
3. `save(lead)`.

**Depends on.** Steps 3, 4, 5.

**Negative tests, this step** (`tests/add-lead.test.ts`):

- Adding `+52 55 1234 5678` then `525512345678` throws `DuplicateLeadError`. Two spellings, one lead —
  this is rule 1 plus the normalization decision in one assertion.
- On a funnel whose first stage has `capacity: 1`, a second *different* lead throws
  `StageCapacityExceededError`.
- On a funnel whose first stage has `capacity: 0`, the very first add throws — intake paused.
- A blank name is rejected before the duplicate check, so adding an existing phone with a blank name
  reports the blank name. That precedence is a decision, not an accident.

**Validate.** `npm test` — `add-lead.test.ts` green; the happy path's add half now works.

---

## 7. `src/application/use-cases/MoveLeadToStage.ts`

**Behavior.** In this order, first failure wins:

1. `findByPhone(Lead.normalizePhone(data.phone))` returns null → `LeadNotFoundError`.
2. `findStage(targetStageId)` returns undefined → `StageNotFoundError`.
3. `lead.stageId === targetStageId` → `InvalidStageTransitionError`.
4. `hasRoom(target, occupancy)` is false → `StageCapacityExceededError`.
5. `lead.stageId = targetStageId`, then `save(lead)`.

**Depends on.** Steps 2–5.

**Negative tests, this step** (`tests/move-lead.test.ts`). Order is what needs pinning, not the happy
path:

- A lead sitting in a full `qualified`, moved to `qualified`, throws `InvalidStageTransitionError` —
  **not** `StageCapacityExceededError`. One assertion, and it locks the whole ordering decision.
- An unknown phone with a misspelled target stage throws `LeadNotFoundError`, not `StageNotFoundError`.
- A move addressed with a differently formatted phone still finds the lead.
- A backward move `closed` → `new` succeeds, and so does skipping `new` → `closed`.
- Filling `qualified` to 2 and moving a third lead in throws `StageCapacityExceededError`.

**Validate.** `npm test` — everything green, **including `funnel.test.ts` from step 1 for the first
time.** That is the graded core done.

---

## 8. `src/index.ts`

**Behavior.** Replace the TODO with the four scenarios the README names — one add, one valid move, one
duplicate rejected, one invalid move rejected — each in its own `try/catch` printing the error's
`name` and `message`, so a rejection reads as a rejection and not as a crash. Keep the given funnel
fixture: `qualified`'s `capacity: 2` is what makes a capacity rejection reachable, so add a fifth
scenario for it.

**Depends on.** Steps 2–7.

**Validate.** `npm start` — one success line, one move line, three labelled rejections, exit code 0.
`npm run build` clean.

---

## 9. `src/infrastructure/http/` (bonus — JSON in / JSON out)

**Behavior.** One function taking `{ action, phone, name?, targetStageId? }`: validate request shape,
call the matching use case, return `{ status, body }`. `LeadNotFoundError` and `StageNotFoundError` →
404; `DuplicateLeadError`, `StageCapacityExceededError`, `InvalidStageTransitionError` → 409; bad
shape → 400 at the boundary; anything else → 500.

**Depends on.** Steps 2–7. No framework, no new dependency.

**Validate.** A duplicate add returns `409`; an unknown phone returns `404`.

---

# Critique of this plan

## Where it over-engineers for a two-hour test

- **`hasRoom` as a method.** It is one comparison. Inlining it in the two use cases costs nothing and
  removes a method. Keeping it is a judgement about where rule 3 belongs, not a functional need — and
  it is the one item here I would still call genuinely arguable.
- **Five test files.** `lead`, `funnel-entity`, `repository`, `add-lead`, `move-lead` plus the
  end-to-end one is more structure than a two-hour submission needs. Collapsing the entity and
  repository tests into one file would lose nothing; I split them so each step has an obvious place to
  write into, which matters more while building than after.
- **Step 9's status-code mapping.** The README asks to *simulate* HTTP request handling, not to model
  a status taxonomy. Half that mapping exists to justify step 2's error class rather than because the
  bonus needs it.
- **Step 8 overlaps step 1.** By the time `index.ts` is written, the tests already prove every
  scenario it prints. It stays because the README explicitly asks for the simulation, but it is
  demonstration, not verification.

## What I would skip

**Step 9, the HTTP bonus — and nothing else.** The README files it under "Bonus", so skipping it
forfeits nothing on the Part 1 checklist, and it is the most time-expensive step left once the core
works. Skip it unless steps 1–8 are done with real time to spare.

Tests are no longer skippable, and that is a consequence of the reordering rather than a judgement
about their value: they are step 1, so skipping them means having no way to run anything until step 8.
That is the right trade — the review asks you to explain and modify this code without the agent, and
Part 2 §1 asks what breaks under concurrency. Both are much easier to answer with tests pinning the
boundaries.

**On cutting `Funnel`'s structural validations:** `ANALYSIS.md` §0 commits to rejecting duplicate
stage ids and blank names, so they stay. If you later decide they are not worth the lines, edit the
"Malformed funnel" bullet in the same change — a plan that quietly contradicts the recorded decision
is worse than either choice on its own, and it is exactly the kind of inconsistency a reviewer reads
as not knowing your own design.

## Time budget

Steps 1–8 are the graded core plus its tests: roughly 70–80 minutes, with the tests folded into each
step rather than bolted on at the end. Step 9 only with time to spare. `ANALYSIS.md` §§1–4 still needs
its ~30 minutes, and §0's `_TODO: actual hours._` still needs a number.
