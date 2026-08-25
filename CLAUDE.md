# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. What this project is

A **take-home technical test** for Leadsales (2-hour budget): the *Lead Funnel Service*. A workspace organizes its leads in a **funnel** — a board of ordered **stages** (`New`, `Contacted`, `Qualified`, `Closed`). Leads enter the funnel and move between stages as the sales conversation progresses.

Two deliverables:

- **Part 1 — Implementation.** Fill in the `TODO`s across `src/`: the two use cases (`AddLeadToFunnel`, `MoveLeadToStage`), the `Lead` and `Funnel` entities, `InMemoryLeadRepository`, and a simulation in `src/index.ts` covering at least one lead added, one valid move, one duplicate rejected, one invalid move rejected.
- **Part 2 — Systems Analysis.** Written answers in `ANALYSIS.md` (concurrency, integration, scale, evolution) plus an **Assumptions & time spent** section. The business rules are deliberately incomplete: *every* assumption made while coding must be recorded there.

The repo scaffold is intentionally skeletal — the file layout, error classes, and repository interface are given; the behavior is not. Evaluation weighs *reasoning* as much as code, and the author must be able to explain and modify every line without an agent.

Bonus (only if the core is solid): a function simulating HTTP request handling (JSON in / JSON out), and unit tests for the funnel business rules.

## 2. The 4 business rules

1. A lead is identified by its **phone number**. The same phone number cannot exist twice in a funnel.
2. A lead can only be moved to a stage that **exists** in the funnel.
3. Each stage may define a **capacity limit** (max leads it can hold). Moving *or adding* a lead into a full stage must be rejected.
4. Moving a lead to the stage it is **already in** is not a valid transition.

Mapping to the given errors: 1 → `DuplicateLeadError`, 2 → `StageNotFoundError`, 3 → `StageCapacityExceededError`, 4 → `InvalidStageTransitionError`. Adding a lead always targets the funnel's **first stage**, and rule 3 applies there too. A stage with no `capacity` is unbounded.

Anything the four rules do not settle (missing lead on move, phone format, name validation, empty funnel, capacity `0`, ordering semantics) is **underspecified on purpose**: pick a defensible behavior, keep it minimal, and write the assumption into `ANALYSIS.md` §0.

## 3. Session constraints

These hold for the whole session, not just the first task.

**Architecture — hexagonal, as specified in the README.**
- `src/domain/` (entities, repository *interfaces*, errors) must not import from `application/` or `infrastructure/`, and must have zero framework/IO dependencies.
- `src/application/use-cases/` orchestrates: it depends on domain types and on the `LeadRepository` **interface**, never on `InMemoryLeadRepository`.
- `src/infrastructure/persistence/` implements the interface. Wiring happens only in `src/index.ts`.
- Dependencies are injected through constructors (both use cases already take `(repository, funnel)`). Do not reach for globals, singletons, or service locators.
- Invariants belong in the entities (`Funnel` knows its stages, its first stage, and whether a stage has room); the use cases coordinate and translate to errors. Do not push stage logic into the repository.

**Do not create new files unless necessary.** The scaffold already contains a file for every concept the test asks for; prefer completing a `TODO` over adding a module. Legitimately new files: `tests/*.test.ts` (Jest `roots` is `<rootDir>/tests`, which does not exist yet) and, if the HTTP bonus is attempted, one small adapter under `src/infrastructure/`. Nothing else without asking. Never create README-style summary docs, and never leave scratch files in the repo.

**Minimum code.**
- No speculative features, options, or configurability the README did not ask for — configurable per-workspace rules are a *Part 2 discussion question*, not something to build.
- No abstractions with a single call site: no base classes, no factories, no mappers, no DI container, no event bus, no `utils/` grab bag.
- No error handling for impossible states; no defensive re-validation of what an entity already guarantees.
- No new dependencies. The stack is TypeScript + ts-node + Jest, and it stays that way.
- If a solution runs long, rewrite it shorter before presenting it.

**Surgical edits.** Change only what the current request requires. Keep the existing style (explicit `public readonly` constructor params, `async` repository methods, one error class per file, JSDoc on public classes). Existing doc comments describe the target behavior — replace a `TODO` line, don't rewrite the surrounding comment. Do not reformat or "improve" untouched code.

**Modifying the given scaffold.** `LeadRepository` may be extended if a use case genuinely needs it (the file says so), but adding a method is a design decision — state the reason. Do not change the four error classes' constructor signatures or the `Stage` shape without flagging it.

**Verification.** `npm test` must pass (`jest --passWithNoTests` currently succeeds vacuously — that is not evidence). `npm run build` must typecheck under `strict`. `npm start` must run the simulation and print at least the four required scenarios. Run these before claiming a task is done; report real output, never a predicted one.

**Assumption discipline.** When a decision is not dictated by the four rules, surface it in the response *and* append it to `ANALYSIS.md` §0 as it is made — not in a batch at the end.

**Terminology.** Use the business's exact words (see `CONTEXT.md`): funnel, stage, lead, capacity, move, transition, workspace. Do not rename them to "pipeline", "column", "contact", "record", or "limit" in code, comments, or prose. Note that *workspace* and *sales agent* are vocabulary, not model: nothing in `src/` represents them, and nothing should start to.

## Commands

```bash
npm start              # run the simulation in src/index.ts (ts-node)
npm run dev            # same, in watch mode
npm run build          # tsc -> dist/ (strict typecheck)
npm test               # jest (tests live in tests/, matching **/*.test.ts)
npm run test:watch
npm run test:coverage
npx jest tests/Funnel.test.ts            # single test file
npx jest -t "rejects a duplicate phone"  # single test by name
```
