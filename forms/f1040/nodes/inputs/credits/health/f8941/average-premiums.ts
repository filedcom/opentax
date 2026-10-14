import table from "./average-premiums-2025.json" with { type: "json" };

// IRS 2025 Form8941 instructions, Average Premiums / Table2025.
// https://www.irs.gov/instructions/i8941
// Rows are county labels as published; "All" is an explicit statewide row.
const rows: Readonly<
  Record<string, Readonly<Record<string, readonly number[]>>>
> = table;

export function form8941AveragePremiums(state: string, county: string) {
  if (state === "HI") {
    throw new Error(
      "Form 8941 Hawaii premiums are ineligible for 2025 plan years",
    );
  }
  const stateRows = Object.hasOwn(rows, state) ? rows[state] : undefined;
  const amounts = stateRows && county.trim()
    ? Object.hasOwn(stateRows, county) ? stateRows[county] : stateRows.All
    : undefined;
  if (!amounts) {
    throw new Error("Form 8941 rating-area table row is not supported");
  }
  return { employeeOnly: amounts[0], family: amounts[1] };
}

export function assertForm8941RatingReview(review: {
  irs_table_state: string;
  irs_table_county: string;
  irs_table_employee_only_average_premium: number;
  irs_table_family_average_premium?: number;
}) {
  const amounts = form8941AveragePremiums(
    review.irs_table_state,
    review.irs_table_county,
  );
  if (
    review.irs_table_employee_only_average_premium !== amounts.employeeOnly ||
    (review.irs_table_family_average_premium !== undefined &&
      review.irs_table_family_average_premium !== amounts.family)
  ) {
    throw new Error(
      "Form 8941 rating-area table row is not supported: reviewed premiums differ from the 2025 IRS table",
    );
  }
  return amounts;
}
