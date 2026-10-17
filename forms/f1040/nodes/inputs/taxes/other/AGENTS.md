# inputs/taxes/other

Legacy or not-yet-supported taxes. None of these nodes adds tax to a TY2025
return; each exists so the CLI accepts the document and fails or no-ops
explicitly instead of dropping it.

| Node    | Form                                               | TY2025 behavior                                                                                                                                                                                                         | CLI shape                         |
| ------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `f4970` | 4970, Tax on Accumulation Distribution of Trusts   | Throws if any distribution, deemed-distributed tax or throwback accumulated income is positive; zero items return no outputs. Its tax belongs on Schedule 2 line 17l.                                                   | `isArray`, `f4970s`               |
| `f5405` | 5405, Repayment of the First-Time Homebuyer Credit | Throws when `ctx.taxYear >= 2025`; earlier years route `line10_homebuyer_credit_repayment` to `schedule2`, which itself rejects line 10 for 2025 (`assertNo2025Schedule2Line10`). Only `credit_year` 2008 is repayable. | `isArray`, `f5405s`               |
| `f8965` | 8965, Health Coverage Exemptions                   | Parses and returns no outputs (federal mandate penalty is $0 since 2019).                                                                                                                                               | `inputSchema`, not an array input |

## Rules found in the code

- `outputNodes` is empty for `f4970` and `f8965`; they reach
  `check:structure` reachability only through their `inputNodes` entries.
- No MeF, PDF, domain or validation counterpart exists for any of the three.
  Implementing `f4970` needs the throwback calculation, a Schedule 2 line 17l
  field (not in the `schedule2` schema today) and a native attachment.

## Verify

- `bun test ./forms/f1040/nodes/inputs/taxes/other --timeout=1800000`

Section map: [../AGENTS.md](../AGENTS.md).
