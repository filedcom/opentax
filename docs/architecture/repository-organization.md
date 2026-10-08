# Repository organization

The public entrypoints remain `mod.ts`, `catalog.ts`, `cli/main.ts`, and `forms/f1040/2025/index.ts`. TY2025 year configuration, input registration, and node registration stay next to that form entrypoint.

| Boundary | Where to read next |
| --- | --- |
| Pure tax engine | `core/runtime`, `core/types`, `core/validation` |
| CLI operations and persisted returns | `cli/commands`, `cli/store`, `cli/utils` |
| Input and calculation nodes | `forms/f1040/nodes/inputs`, `intermediate`, `outputs`; one folder per form or worksheet |
| Year-specific source reconciliation | [TY2025 domains](../../forms/f1040/2025/domains/README.md) |
| Native form projections | [MeF forms](../../forms/f1040/2025/mef/forms/README.md) |
| Printed form projections | [PDF forms](../../forms/f1040/2025/pdf/forms/README.md) |
| Complete return contracts | [E2E scenarios](../../forms/f1040/e2e/README.md), with ATS scenarios retained together |
| Business rule registry | [Rule groups](../../forms/f1040/validation/rules/README.md) |
| Research, verification, maintenance, release and site tools | [Scripts](../../scripts/README.md) |
| MeF readiness and source evidence | [TY2025 documents](../mef/ty2025/README.md) |

Domain folders use identity, income, investments, business, retirement, deductions, credits, health, taxes, international, payments, and execution. Larger native/PDF form families have another folder named for the form. Existing node, engine, CLI and benchmark case folders already express their responsibilities and are retained.

Private `.state` and `.pdf-cache` evidence stays at its original location. File moves change code and document paths; tax form identifiers, rule identifiers, registry order, source contracts and expected results retain their meaning.
