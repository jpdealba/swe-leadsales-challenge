# Part 2 — Systems Analysis

Answer the four questions from the README here. Bullet points are fine; be concrete.

## 0. Assumptions & time spent

**AI usage:** built with Claude Code; full transcript in `ai-session/`.
**Time spent:** _TODO: actual hours._

Each bullet: what the rules left open → what I decided → why.

### Identity

- **Phone formatting** — rule 1 never says when two spellings are the same phone → normalize to digits, the normalized form is the identity → `+52 55 1234 5678` and `5512345678` are one number to an agent, so one lead.
- **Raw input** — unclear if the number as typed must be kept → store only the normalized form → `Lead.phone` is a single field and display formatting belongs to the board.
- **Country codes** — digits-only leaves `5512345678` and `525512345678` distinct → accept the collision, compare verbatim → doing it right needs E.164 parsing and a per-workspace default region, and neither exists here. A wrong merge is unrecoverable; a visible duplicate is not.
- **Where normalization lives** — both writing and looking up must normalize or rule 1 misses duplicates → one `Lead.normalizePhone`, called by the constructor and `MoveLeadToStage`, never by the repository → identity is a domain rule, and in an adapter every future adapter has to remember it.
- **Duplicate check order** — `AddLeadToFunnel` both constructs and queries, in no stated order → construct first, query with `lead.phone` → the entity is the only thing that knows how a phone becomes an identity.

### Rules and behaviour

- **Moving a lead that does not exist** — the JSDoc requires it, the README lists three validations and ships no such error → add `LeadNotFoundError`, checked first → a missing lead is a 404, not a conflict, and reusing `InvalidStageTransitionError` loses that distinction at the boundary.
- **Validation order** — rules 2–4 are listed but not ordered → lead, stage, rule 4, capacity; first failure wins → existence before state, identity before counting, so a lead in a full stage moved to that same stage is told it is already there. It also makes self-counting unreachable: by the time capacity is read, source and target can never be equal.
- **Malformed lead input** — no rule covers a blank name, and normalization turns `abc` into an empty string → normalize then reject empty phone, reject blank name, plain `Error`s, no length or format rule → any threshold rejects real numbers, and shape validation belongs at the HTTP boundary.
- **Malformed funnel** — nothing forbids an empty stage list, duplicate stage ids, or blank ids and names → all rejected in the `Funnel` constructor with a plain `Error` → `noUncheckedIndexedAccess` is off, so `stages[0]` typechecks on an empty funnel and dies far from the mistake.
- **`capacity: 0`** — zero reads as either "no limit" or "holds nothing" → permanently full, and a stage is full at `count >= capacity` → `undefined` already spells unbounded, leaving no other way to express a stage that accepts nothing.
- **Zero on the first stage** — it means no lead can ever enter the funnel → valid configuration → pausing intake is a real thing a sales team does, and the service should not second-guess the workspace.
- **Negative and fractional capacity** — `-1` and `2.5` typecheck → rejected in the `Funnel` constructor → `-1` behaves like zero and `2.5` holds three leads, so both fail as silent misbehavior rather than config errors.
- **Backward moves and skipping** — rule 4 forbids only the same-stage move → allow both, any stage but the current one → the README calls the funnel a board, and Part 2 asks how a workspace could forbid backward moves, which presumes they are allowed.
- **Applying a move** — the repository has no `update`, and it is unclear whether a lead is mutated or rebuilt → `save` is an upsert keyed by normalized phone; `MoveLeadToStage` mutates `stageId` and calls it → the scaffold makes `phone` and `name` readonly but leaves `stageId` public and mutable.
- **Funnel scope** — rule 1 says "in a funnel" but no repository method takes a funnel id → one repository instance is scoped to one funnel → both use cases already receive their `Funnel` at construction.

### Known limitations, accepted deliberately

- The in-memory repository holds object references, so a mutated lead is already stored whether or not `save` is called — a forgotten write fails against a real database, not here.
- `InvalidStageTransitionError` has one cause today; its free-form message is the extension point for per-workspace transition rules.
- `Lead.phone` stays a `string`, so the guarantee against un-normalized values is the constructor, not the compiler.

## 1. Concurrency

<!-- Your answer -->

## 2. Integration

<!-- Your answer -->

## 3. Scale

<!-- Your answer -->

## 4. Evolution

<!-- Your answer -->
