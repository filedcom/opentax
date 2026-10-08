# MeF business rule groups

Files are grouped by the tax concern or tool purpose. Tests and fixtures stay beside the source contract they verify.

| Group | Contents |
| --- | --- |
| [business](./business/) | 10 files |
| [credits](./credits/) | 27 files |
| [deductions](./deductions/) | 3 files |
| [execution](./execution/) | 19 files |
| [health](./health/) | 4 files |
| [identity](./identity/) | 8 files |
| [income](./income/) | 6 files |
| [international](./international/) | 30 files |
| [investments](./investments/) | 11 files |
| [payments](./payments/) | 5 files |
| [retirement](./retirement/) | 6 files |
| [taxes](./taxes/) | 10 files |

The stable `index.ts` registers the same rule groups and ordering. Regenerate via `scripts/maintenance/parse-rules.ts`; its path table assigns each registered group to its folder.
