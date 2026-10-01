import { inputSchema as priorCarryoverInputSchema } from "../nodes/inputs/form1116_prior_carryover/index.ts";
import { priorYearCarryoverSchema } from "../nodes/intermediate/forms/form_1116/index.ts";

/** Match Schedule B's embedded vintage ledger to the retained filed-year review. */
export function assertForm1116CarryoverSource(
  pending: Readonly<Record<string, unknown>> | undefined,
  scheduleBSource: unknown,
): void {
  const intake = priorCarryoverInputSchema.safeParse(
    pending?.form1116_prior_carryover,
  );
  const embedded = priorYearCarryoverSchema.safeParse(scheduleBSource);
  const retained = intake.success && intake.data.carryovers.length === 1
    ? intake.data.carryovers[0]
    : undefined;
  const printed = embedded.success ? embedded.data : undefined;
  if (!retained || !printed) {
    throw new Error(
      "Form 1116 Schedule B needs one retained filed prior-year carryover source",
    );
  }
  const amounts = (source: {
    vintages: ReadonlyArray<{
      vintage_tax_year: number;
      prior_year_schedule_b_line8_vintage_amount: number;
    }>;
  }) =>
    new Map(source.vintages.map((vintage) => [
      vintage.vintage_tax_year,
      vintage.prior_year_schedule_b_line8_vintage_amount,
    ]));
  const retainedAmounts = amounts(retained);
  const printedAmounts = amounts(printed);
  if (
    retained.income_category !== printed.income_category ||
    retained.prior_year_schedule_b_line8_total !==
      printed.prior_year_schedule_b_line8_total ||
    retainedAmounts.size !== printedAmounts.size ||
    [...retainedAmounts].some(([year, amount]) =>
      printedAmounts.get(year) !== amount
    ) ||
    retained.source_document_references.length !==
      printed.source_document_references.length ||
    new Set(retained.source_document_references).size !==
      retained.source_document_references.length ||
    new Set(printed.source_document_references).size !==
      printed.source_document_references.length ||
    retained.source_document_references.some((reference) =>
      !printed.source_document_references.includes(reference)
    )
  ) {
    throw new Error(
      "Form 1116 Schedule B filed source vintage amounts or references differ from retained prior-year review",
    );
  }
}
