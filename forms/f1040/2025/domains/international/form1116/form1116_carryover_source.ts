import { inputSchema as priorCarryoverInputSchema } from "../../../../nodes/inputs/form1116_prior_carryover/index.ts";
import { priorYearCarryoverSchema } from "../../../../nodes/intermediate/forms/form_1116/index.ts";

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
  const filed = retained.filed_2024_schedule_b;
  const printedFiled = printed.filed_2024_schedule_b;
  const general = pending?.general as
    | { taxpayer_ssn?: unknown }
    | undefined;
  const owner = typeof general?.taxpayer_ssn === "string"
    ? general.taxpayer_ssn.replaceAll("-", "")
    : undefined;
  if (!filed || !printedFiled || !owner) {
    throw new Error(
      "Form 1116 Schedule B carryover needs the filed 2024 return and same-category Schedule B line 8 identity and amounts",
    );
  }
  const filedAmounts: Record<number, number | undefined> = {
    2015: filed.line8_2015_ninth_preceding_amount,
    2016: filed.line8_2016_eighth_preceding_amount,
    2017: filed.line8_2017_seventh_preceding_amount,
    2018: filed.line8_2018_sixth_preceding_amount,
    2019: filed.line8_2019_fifth_preceding_amount,
    2020: filed.line8_2020_fourth_preceding_amount,
    2021: filed.line8_2021_third_preceding_amount,
    2022: filed.line8_2022_second_preceding_amount,
    2023: filed.line8_2023_first_preceding_amount,
    2024: filed.line8_2024_current_year_amount,
  };
  if (
    filed.taxpayer_ssn.replaceAll("-", "") !== owner ||
    filed.income_category !== retained.income_category ||
    retained.vintages.some((vintage) =>
      filedAmounts[vintage.vintage_tax_year] !==
        vintage.prior_year_schedule_b_line8_vintage_amount
    ) ||
    Object.entries(filedAmounts).some(([year, amount]) =>
      amount !== undefined && retainedAmounts.get(Number(year)) !== amount
    ) ||
    filed.line8_total !== retained.prior_year_schedule_b_line8_total ||
    filed.form1040_source_document_id ===
      filed.schedule_b_source_document_id ||
    !retained.source_document_references.includes(
      filed.form1040_source_document_id,
    ) ||
    !retained.source_document_references.includes(
      filed.schedule_b_source_document_id,
    ) ||
    JSON.stringify(filed) !== JSON.stringify(printedFiled)
  ) {
    throw new Error(
      "Form 1116 Schedule B carryover needs the filed 2024 return and same-category Schedule B line 8 identity and amounts",
    );
  }
}
