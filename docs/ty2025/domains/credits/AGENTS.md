# docs/ty2025/domains/credits

TY2025 research notes for credit forms: source proofs, gap and boundary notes
("what the engine may and may not claim"), and review write-ups. The code they
describe is listed per form in
[../../../../forms/f1040/nodes/inputs/credits/AGENTS.md](../../../../forms/f1040/nodes/inputs/credits/AGENTS.md).
Per-node calculation notes are separate, in each node's `research/context.md`.

## Contents

- `amt/form8801/`: prior-year source boundary for the minimum tax credit.
- `business/form*/`: one or two `ty2025-form<N>-*-gap.md` notes per business
  credit (3468, 3800, 6478, 8582cr, 8826, 8835, 8844, 8864, 8874, 8881, 8882,
  8908, 8911, 8994). `general-business-credit-routing.md` is the
  Schedule 3 line 6a / Form 3800 routing audit.
- `earned-income/eic/`: EIC passive-income, basis-loss and residency proofs.
- `elderly-disabled/ty2025-schedule-r-age-only.md`: Schedule R age-only routes.
- `foreign/form1116/`: main PDF, alternative compensation, and Schedule B/C
  filed-source notes (one per prior-year vintage).
- `health/form8941/` (SHOP source reviews, rating areas) and
  `health/form8962/` (policy-month, interstate, shared-policy and
  dependent-MAGI notes, Pub 974 ordering).
- `individual/form8396`, `form8839`, `form8862`, `form8863` (14 claimant and
  school-source reviews), `form8880`, and `ty2025-schedule3-line8-join.md`.

## Conventions verified here

- Folder names follow `forms/f1040/2025/domains/credits/` (`form<NNNN>/`).
  Notes that span several forms sit at the group level.
- These notes describe a past worktree and go stale. Check every route a note
  states against the node's `outputNodes` before you rely on it.
  `general-business-credit-routing.md` already disagrees with the code.

Verify: `bun run fmt:check` (dprint covers this Markdown). Then confirm by hand
that every relative link to `forms/` you added still resolves. No code runs
this folder.
