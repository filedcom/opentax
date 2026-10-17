# General — Submission

Filing identity, information reporting, and complete-return assembly.

| Area | Contents |
| --- | --- |
| [disclosures](disclosures) | 7 files |
| [envelope.ts](envelope.ts) | 1 files |
| [foreign](foreign/README.md) | 23 files |
| [ft.ts](ft.ts) | 1 files |
| [investments](investments) | 1 files |
| [r0000.ts](r0000.ts) | 1 files |
| [return-assembly](return-assembly/README.md) | 9 files |
| [state.ts](state.ts) | 1 files |
| [t0000.ts](t0000.ts) | 1 files |
| [x0000.ts](x0000.ts) | 1 files |

Canonical [Form 1040](../../../../2025/mef/forms/general/return-assembly/f1040.ts), [Schedule 1](../../../../2025/mef/forms/general/return-assembly/schedule1/schedule1.ts) and [Schedule 3](../../../../2025/mef/forms/general/return-assembly/schedule3.ts) assemblies span [Income](../../income/README.md), [Adjustments](../../adjustments/README.md), [Credits](../../credits/README.md) and [Payments](../../payments/README.md). Focused line checks follow their actual return effect; informational foreign forms remain General.

The R0000, X0000, T0000 and STATE envelope rules read the submission and transmission ZIPs through [envelope.ts](envelope.ts) when the rule context carries them (`EnvelopeFact`); a return-only context checks only what the return controls.
