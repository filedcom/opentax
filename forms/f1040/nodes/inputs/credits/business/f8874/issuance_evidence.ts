import { calculateForm8874, inputSchema } from "./index.ts";
import type { F8874Input } from "./index.ts";
import { form8874AIssuanceSchema } from "./issuance_schema.ts";
export { form8874AIssuanceSchema } from "./issuance_schema.ts";

/** Every direct QEI notice must identify the prepared individual investor. */
export function assertForm8874AIssuanceOwners(
  source: F8874Input,
  pending: Readonly<Record<string, unknown>>,
): void {
  const filer = pending.f1040 as Record<string, unknown> | undefined;
  const first = filer?.taxpayer_first_name;
  const last = filer?.taxpayer_last_name;
  const ssn = filer?.taxpayer_ssn;
  if (
    typeof first !== "string" || typeof last !== "string" ||
    typeof ssn !== "string"
  ) {
    throw new Error(
      "Form 8874-A needs the prepared Form 1040 investor identity",
    );
  }
  for (const investment of source.investments) {
    const notice = investment.reviewed_form8874a;
    if (
      notice.investor_name !== `${first} ${last}` ||
      notice.investor_tin !== ssn.replaceAll("-", "")
    ) {
      throw new Error("Form 8874-A investor differs from prepared Form 1040");
    }
  }
}

/** Stage one exact Form 8874-A QEI/owner/current-allowance join. */
export function reconcileForm8874AIssuance(
  rawNotice: unknown,
  pending: Readonly<Record<string, unknown>>,
) {
  const notice = form8874AIssuanceSchema.parse(rawNotice);
  const source = inputSchema.parse(pending.f8874);
  if (source.investments.length !== 1) {
    throw new Error("Form 8874-A staged join needs exactly one direct QEI");
  }
  assertForm8874AIssuanceOwners(source, pending);
  const { rows } = calculateForm8874(source);
  const row = rows[0];
  const investment = row.investment;
  if (
    JSON.stringify(notice) !==
      JSON.stringify(investment.reviewed_form8874a) ||
    notice.notice_document_reference !==
      investment.designation_notice_reference ||
    notice.cde_name !== investment.cde_name ||
    notice.cde_ein !== investment.cde_ein ||
    notice.initial_investment_date !== investment.initial_investment_date ||
    notice.qualified_equity_investment_amount !==
      investment.qualified_equity_investment_amount ||
    notice.annual_credit_amounts[row.creditYear - 1] !== row.creditAmount
  ) {
    throw new Error(
      "Form 8874-A issuance facts or 2025 annual credit differ from Form 8874",
    );
  }
  return {
    notice,
    investment,
    creditYear: row.creditYear,
    credit: row.creditAmount,
  };
}
