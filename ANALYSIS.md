# Part 2 — Systems Analysis

Answer the four questions from the README here. Bullet points are fine; be concrete.

## 0. Assumptions & time spent

**AI usage:** built with Claude Code; full transcript in `ai-session/`.
**Time spent:** 85 minutes — 65 on Part 1 (assumptions, TDD cycles, simulation) and 20 on Part 2.

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
- `capacity: 0` — zero reads as either "no limit" or "holds nothing" → permanently full, and a stage is full at `count >= capacity` → `undefined` already means unbounded, so there’d be no other way to express a stage that accepts nothing.
- **Zero on the first stage** — it means no lead can ever enter the funnel → valid configuration → pausing intake is a real thing a sales team does, and the service should not second-guess the workspace.
- **Negative and fractional capacity** — `-1` and `2.5` typecheck → rejected in the `Funnel` constructor → `-1` behaves like zero and `2.5` lets the stage hold three leads — both would fail silently instead of as a config error.
- **Backward moves and skipping** — rule 4 forbids only the same-stage move → allow both, any stage but the current one → the README calls the funnel a board, and Part 2 asks how a workspace could forbid backward moves, which presumes they are allowed.
- **Applying a move** — the repository has no `update`, and it is unclear whether a lead is mutated or rebuilt → `save` is an upsert keyed by normalized phone; `MoveLeadToStage` mutates `stageId` and calls it → the scaffold makes `phone` and `name` readonly but leaves `stageId` public and mutable.
- **Funnel scope** — rule 1 says "in a funnel" but no repository method takes a funnel id → one repository instance is scoped to one funnel → both use cases already receive their `Funnel` at construction.



### Known limitations, accepted deliberately

- The in-memory repository holds object references, so a mutated lead is already stored whether or not `save` is called — a forgotten write fails against a real database, not here.
- `InvalidStageTransitionError` has one cause today; its free-form message is the extension point for per-workspace transition rules.
- `Lead.phone` stays a `string`, so the guarantee against un-normalized values is the constructor, not the compiler.



## 1. Concurrency

> Two sales agents move the *same lead* to *different stages* at the same time, and a
> third agent moves *another lead* into a stage with one slot left. What can go wrong
> with your current design? Where would you enforce correctness if the repository were
> a real database?

- `MoveLeadToStage.ts:49` counts, `:51` decides, `:55–57` writes. The `await` on line 49 is a suspension point, so another execution runs there. Check-then-act with no atomicity.
- There are two ways this breaks. **Capacity**: two agents move different leads into `qualified`, both read an occupancy of 1, both pass, the stage ends holding 3. **Same lead, different targets**: both evaluate against the pre-move `stageId`, the last `save` wins, and **both agents are told the move succeeded**. Losing one of the writes is bad. Telling both agents it worked is worse, because nobody ever finds out.
- With a real database the rules don’t share one mechanism. Rule 1 is a `UNIQUE (funnel_id, phone)` constraint and that is the whole answer. Rule 3 **can’t be a constraint**  it’s a count over other rows  so it needs either a lock on the *stage* row or an occupancy counter updated inside the same transaction. Locking the lead does nothing here, since two leads are two different rows.
- The port can’t express any of that: `save` / `findByPhone` / `findByStage` has no transaction boundary. So fixing this means reshaping the port, not just swapping the adapter.



## 2. Integration

> When a lead changes stage, other Leadsales-like services need to react (e.g.
> analytics, notifications). How would you communicate the change without coupling this
> service to its consumers? What new failure modes does your choice introduce?

- A second port, the same inversion already used for persistence: `LeadEventPublisher` in `domain`, an adapter in `infrastructure`, injected through the constructor. The use case never learns who is listening.
- Two separate events, because entering the funnel isn’t a transition. The payload carries the origin stage, captured **before** line 55 overwrites it.
- Publish after the write commits. An event for a transaction that rolled back announces something that never happened.
- The new failure mode is a **dual write**: the write commits, the publish fails, and nothing reports the divergence. The honest guarantee is at-least-once, so every consumer has to be idempotent. The real fix is a transactional outbox.



## 3. Scale

> A funnel grows to 500,000 leads and the board UI needs "the first 50 leads of each
> stage, most recent first". What breaks first in your current design, and what would
> you change?

- `InMemoryLeadRepository.ts:22` walks **every** lead in the repository, not the stage's, and copies them into a new array before filtering.
- Its only two callers are the capacity checks, and both read `.length`. **The contents are never used.** Every move scans 500,000 objects to produce one number. It needs a `countByStage`.
- "Most recent first" can’t be answered today: `Lead` has no field to order by. And the right one is `enteredStageAt`, not `createdAt`. On a board, recent means arrived *in that stage*.
- With a real database: an index on stage and arrival time, so the 50 rows come straight off it, and cursor pagination — fetch the 50 after the last one seen, rather than skipping 400  which stays correct while leads move. A stored occupancy counter makes the capacity check O(1), and it’s the same counter question 1 needs.



## 4. Evolution

> Product now wants **per-workspace configurable rules** (e.g. one customer forbids
> backward moves, another requires an approval to enter `Closed`). How does your design
> absorb this without a rewrite? What would you refuse to build, and why?

- It absorbs the change because the rules live in one ordered place per use case and the domain imports no framework: adding a rule means adding a step, and nothing outside the use case has to know about it.
- Backward moves are permitted by default **because of this question**. If I’d hardcoded “only forward”, making it configurable would mean undoing that first  which is the rewrite this question is about.
- What does change: a per-workspace policy as another port, injected like the repository, with the use case iterating that list instead of naming its checks inline.
- I would refuse a DSL where customers write their own conditions. That’s a programming language: untestable, and every support ticket turns into debugging a customer’s code.
- I would also refuse "approval to enter `Closed`" as a toggle. That’s a workflow with state: who requests, who approves, and where the lead sits while it waits. The model has no such state, and a boolean would hide that a whole concept is missing.

