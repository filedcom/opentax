import { inputSchema as interestSourceSchema } from "../nodes/inputs/f1099int/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import {
  type Form4952DirectDebtTrace,
  reconcileForm4952DirectDebtTrace,
} from "../nodes/intermediate/forms/form4952/debt_trace.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const lineKeys = [
  "line1",
  "line2",
  "line3",
  "line4a",
  "line4b",
  "line4c",
  "line4d",
  "line4e",
  "line4f",
  "line4g",
  "line4h",
  "line5",
  "line6",
  "line7",
  "line8",
] as const;
const traceKeys = [
  "tax_year",
  "owner_tin",
  "loan_id",
  "lender_statement_reference",
  "loan_agreement_reference",
  "disbursement_record_reference",
  "purchase_record_reference",
  "loan_date",
  "direct_purchase_date",
  "borrowed_principal",
  "direct_taxable_securities_purchase",
  "asset_id",
  "no_other_loan_proceeds_use",
  "no_tax_exempt_or_passive_activity_asset",
  "investment_use_maintained_through_2025",
  "lender_2025_interest_total",
] as const;

function sameTrace(
  first: Form4952DirectDebtTrace,
  second: Form4952DirectDebtTrace,
): boolean {
  if (
    traceKeys.some((key) => first[key] !== second[key]) ||
    first.interest_payments.length !== second.interest_payments.length
  ) {
    return false;
  }
  const payments = new Map(first.interest_payments.map((payment) => [
    payment.payment_id,
    payment,
  ]));
  return payments.size === first.interest_payments.length &&
    new Set(second.interest_payments.map((payment) => payment.payment_id))
        .size === second.interest_payments.length &&
    second.interest_payments.every((payment) => {
      const original = payments.get(payment.payment_id);
      return original?.payment_date === payment.payment_date &&
        original.payment_record_reference ===
          payment.payment_record_reference &&
        original.interest_amount === payment.interest_amount;
    });
}

/** Replay one owner-owned taxable-securities loan against the retained input. */
export function reconcileForm4952DirectDebtExport(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
): void {
  const printed = form4952Schema.safeParse(fields);
  const retained = form4952Schema.safeParse(pending.form4952);
  const interest = interestSourceSchema.safeParse(pending.f1099int);
  if (
    !printed.success || !retained.success || !interest.success ||
    !printed.data.direct_debt_trace || !retained.data.direct_debt_trace ||
    interest.data.f1099ints.length !== 1 ||
    pending.f1099oid !== undefined ||
    !sameTrace(printed.data.direct_debt_trace, retained.data.direct_debt_trace)
  ) {
    throw new Error(
      "Form 4952 direct debt export needs one retained loan, matching payments, and one 1099-INT investment payer",
    );
  }
  const owner = finalFilerTin?.replaceAll("-", "");
  if (owner !== undefined && !/^\d{9}$/.test(owner)) {
    throw new Error("Form 4952 direct debt export needs a final filer SSN");
  }
  const trace = retained.data.direct_debt_trace;
  reconcileForm4952DirectDebtTrace(
    trace,
    retained.data,
    owner ?? trace.owner_tin,
  );
  const lines = calculateForm4952(retained.data);
  if (
    lineKeys.some((key) => fields[key] !== lines[key]) ||
    printed.data.investment_interest_expense !==
      retained.data.investment_interest_expense ||
    typeof printed.data.source_1099_interest !== "number" ||
    typeof retained.data.source_1099_interest !== "number" ||
    printed.data.source_1099_interest !== retained.data.source_1099_interest
  ) {
    throw new Error(
      "Form 4952 direct debt lines differ from the retained loan and return",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
