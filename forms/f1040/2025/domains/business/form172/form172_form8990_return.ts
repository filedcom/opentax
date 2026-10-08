import { publicInputSchema } from "../../../../nodes/intermediate/forms/form8990/index.ts";
import { runBoundedForm8990TwoPass } from "../../../../nodes/intermediate/forms/form8990/run-two-pass.ts";
import { execute, type ExecuteResult } from "../../../../../../core/runtime/executor.ts";

/** Internal composed workpaper. Public8990 still requires authentic source and
 * accepted carry persistence; this does not create an admitted export route. */
export function executeForm172Form8990Return(
  inputs: Record<string, unknown>,
  executeGraph?: (
    inputs: Record<string, unknown>,
    context: Parameters<typeof execute>[3],
  ) => ExecuteResult,
  retainedNolDeduction = 0,
) {
  const source = publicInputSchema.parse(inputs.form8990);
  const returnInputs = Object.fromEntries(
    Object.entries(inputs).filter(([key]) => key !== "form8990"),
  );
  const twoPass = runBoundedForm8990TwoPass({
    returnInputs,
    ...source,
    executeGraph,
    retainedNolDeduction,
  });
  return {
    twoPass,
    execution: {
      ...twoPass.finalizedReturn,
      pending: twoPass.internalProjectedPending,
      carryforwards: {
        ...twoPass.finalizedReturn.carryforwards,
        form8990_disallowed_2025: twoPass.limit.line31,
      },
    },
    sourceAuthenticityVerified: false as const,
    acceptedCarryLedgerVerified: false as const,
    filingReady: false as const,
  };
}
