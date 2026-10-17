# Income — TY2025 research notes

Gap notes, source proofs and filled-return reviews for Income forms. Which
node, serializer and test each note is about:
[section map](../../../../forms/f1040/nodes/inputs/income/AGENTS.md).

## What is here

- `business/` — Form 172 / NOL gap and AMT absorption audit (`form172/`),
  Form 3115 route audit, Forms 461, 6198, 7217 gaps, Form 4797 investment
  1245, K-1 line 2 and prior-loss notes, Form 7203 debt-basis source proofs
  (nine notes), Form 8582 activity-identity, entire-disposition and MFS
  boundaries, Form 8824 section 1231 review, `ty2025-schedule-c-pdf-gap.md`.
- `foreign/` — Form 2555 line 50 → Schedule 1-A source gap, Form 8621
  Election B refigure and parent-source proofs plus PDF gap,
  `ty2025-fec-native-source.md` (foreign employer compensation).
- `investments/` — Form 6252 review and prior-year gap, Form 8814 source and
  Schedule J/AMT notes, Form 8815 gap, Form 8949 PDF coverage.
- `other/` — Form 982 QPRI PDF route, Schedule 1 line 8z source ledger gap.
- `retirement/` — Form 8606 and 8915-F gaps, 1099-R code P and corrective
  line 1h notes, five IRA rollover notes (eligibility, self-certification,
  automatic waiver, private letter ruling, MO-2025-02 postponement).
- `wages/form4852/` — Form 4852 substitute-source filing gap.

## Conventions here

- Notes on a numbered form mostly sit in `form<number>/`, even a single one
  (`business/form461/`, `wages/form4852/`); topic notes and a few form notes
  sit at group level (`retirement/ty2025-ira-*.md`,
  `business/ty2025-schedule-c-pdf-gap.md`, `foreign/ty2025-fec-native-source.md`). The two `foreign/form8621/form8621-*.md` names are legacy
  exceptions to `ty2025-<form>-<topic>.md`.
- A note records what was observed and where the route stops; it is not a
  source for benchmark expected values (those cite IRS publications).

## Verify

- `bun run fmt:check` (dprint covers this Markdown).
- No tests or link checker: check relative links resolve, and
  `grep -rn "docs/ty2025/domains/income" product_board.md` before renaming a
  file or heading.
