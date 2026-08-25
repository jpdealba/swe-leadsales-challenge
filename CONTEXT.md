# CONTEXT.md — Domain glossary

The business's exact vocabulary. Use these words in code, comments, tests, and prose.

Terms marked *(not modeled)* describe the world around the service. Nothing in `src/`
represents them and nothing should: they exist here so the language stays right when
they come up in `ANALYSIS.md`.

- **Workspace** *(not modeled)* — the tenant that owns a funnel and its leads; a funnel belongs to exactly one workspace. The scaffold scopes a use case to a single funnel via its constructor, with no workspace or funnel id anywhere.
- **Funnel** — a board of ordered stages that a workspace uses to organize its leads.
- **Stage** — one ordered position on the funnel board (`New`, `Contacted`, `Qualified`, `Closed`); a lead sits in exactly one at a time.
- **First stage** — the stage at the head of the funnel's order; every lead added to the funnel enters here.
- **Capacity** — a stage's optional maximum number of leads; a stage without one is unbounded, and a capacity of zero makes it permanently full. Negative and fractional capacities are not valid configuration.
- **Full** — a stage holding as many leads as its capacity allows; adding or moving a lead into it is rejected. A stage whose capacity is zero is permanently full, including the first stage, which is how a workspace pauses intake. _Avoid_: closed stage — `Closed` is the name of a stage, not a state.
- **Lead** — a potential customer inside a funnel, identified by phone number.
- **Phone number** — a lead's identity within a funnel, held only in its normalized form; the same phone cannot exist twice in one funnel.
- **Normalized phone number** — a phone number reduced to its digits, with spaces, punctuation and formatting removed; two phone numbers are the same lead when their normalized forms match, compared verbatim with no country-code inference — `5512345678` and `525512345678` are different leads. _Avoid_: raw phone, formatted phone — the form the agent typed is not kept.
- **Duplicate** — an attempt to add a lead whose phone number already exists in the funnel.
- **Add** — put a new lead into the funnel, always in the first stage.
- **Move** — change the stage a lead currently sits in.
- **Transition** — one move from a lead's current stage to a target stage; every stage in the funnel is a valid target except the one the lead is already in, regardless of direction or distance.
- **Target stage** — the stage a move is directed at; it must exist in the funnel and have capacity.
- **Backward move** — a move to a stage earlier in the funnel's order; allowed, like skipping stages, because the funnel is a board rather than a sequence a lead must walk. Some workspaces may want to forbid it later.
- **Sales agent** *(not modeled)* — the person who adds leads and moves them between stages as the conversation progresses. There is no user, actor, or authorization concept in the service; the term matters because two agents acting at once is the concurrency question.
