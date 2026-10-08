import type { FilerIdentity } from "../../../../mef/header.ts";
import {
  inputSchema,
  personalPropertyRentalTotals,
} from "../../../../nodes/inputs/income/other/personal_property_rental/index.ts";

/** Reconcile the reviewed rentals to both filed Schedule 1 lines. */
export function assertPersonalPropertyRentalSource(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer?: FilerIdentity,
): void {
  const income = fields.line8l_personal_property_rent ?? 0;
  const expenses = fields.line24b_personal_property_expenses ?? 0;
  if (
    income === 0 && expenses === 0 &&
    pending?.personal_property_rental === undefined
  ) return;
  const parsed = inputSchema.safeParse(pending?.personal_property_rental);
  if (!parsed.success || !filer) {
    throw new Error(
      "Schedule 1 personal-property rental needs reviewed source and filer",
    );
  }
  const totals = personalPropertyRentalTotals(parsed.data);
  if (income !== totals.income || expenses !== totals.expenses) {
    throw new Error(
      "Schedule 1 personal-property rental differs from reviewed income and expenses",
    );
  }
  const recipients = [filer.primarySSN, filer.spouse?.ssn]
    .filter((ssn): ssn is string => ssn !== undefined)
    .map((ssn) => ssn.replaceAll("-", ""));
  if (
    parsed.data.personal_property_rentals.some((row) =>
      !recipients.includes(row.recipient_tin.replaceAll("-", ""))
    )
  ) {
    throw new Error(
      "Schedule 1 personal-property rental recipient differs from filer",
    );
  }
}
