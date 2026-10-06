# Form 7206 / Form 8995 import-cycle repair

## Observed failure

The standalone `forms/f1040/2025/form8962_pub974_return.test.ts` imports Form 7206 before Form 8995. Form 7206 imports the Form 8995 calculation node to emit its deduction; Form 8995's health-source schema previously imported the Form 7206 calculation node. Evaluating the latter schema accessed `singleScheduleCPlanSchema` before initialization. Test ordering could hide the module initialization failure.

## Repair

Move the existing one-Schedule-C policy schema, line schema, types, and pure calculator to `form7206/single-source.ts`. Both calculation nodes import that module; Form 7206 preserves its previous exports. Form 8995's joint-owner helper also imports the pure module. The shared module imports only Zod and the taxpayer/spouse enum, with no calculation-node imports.

A token comparison of the original schema/calculator against the extracted code confirms unchanged validation and arithmetic (apart from exporting the existing money schema). This repair adds no plan scope, changes no source requirements, and does not modify tax equations or export behavior.

## Verification

- Exact previously failing standalone entry: `/tmp/opentax-7206-cycle-pub974-v2.log`, 3 passed / 0 failed. Includes the actual Publication 974 deduction/PTC ordering and native/PDF projections, plus ordering tamper rejection.
- Existing 18-file CLI, source, owned-SE, Form 7206, simplified/advanced QBI, native, and filled-PDF regression: `/tmp/opentax-7206-cycle-regression.log`.

This is a dependency repair. The separate independent-spouse policy expansion and its source/XSD/PDF evidence remain isolated work.
