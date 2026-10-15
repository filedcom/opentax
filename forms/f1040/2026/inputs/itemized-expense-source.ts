import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const common = {
  payment_reference: ref,
  source_document_reference: ref,
  payer_ssn: ssn,
  payment_date: z.string().date().refine(
    (v) => v.startsWith("2026-"),
    "Expense must be paid in 2026",
  ),
  amount_paid: money,
  qualification_record_reference: ref,
  not_deducted_elsewhere: z.literal(true),
};
export const medicalPayment2026Schema = z.object({
  ...common,
  patient_ssn: ssn,
  patient_eligible_under_section213: z.literal(true),
  provider_name: ref,
  category: z.enum([
    "medical_or_dental_care",
    "prescribed_medicine_or_insulin",
    "medical_insurance",
  ]),
  reimbursed_amount: money,
  tax_free_funding_amount: money,
  nonmedical_amount: money,
  no_ltc_capital_improvement_or_travel_limit: z.literal(true),
}).strict();
export const taxPayment2026Schema = z.discriminatedUnion("kind", [
  z.object({
    ...common,
    kind: z.literal("state_local_income"),
    authority: ref,
    payment_type: z.enum([
      "estimated_tax",
      "return_payment",
      "prior_refund_applied",
    ]),
    tax_only_no_penalty_or_interest: z.literal(true),
    not_withheld_on_information_return: z.literal(true),
    not_allocable_to_excluded_income: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("real_estate"),
    authority: ref,
    property_reference: ref,
    nondeductible_assessments_or_service_charges: money,
    current_payment_refund: money,
    personal_use_only: z.literal(true),
    domestic_property: z.literal(true),
    no_ownership_change_allocation: z.literal(true),
    tax_assessed_before_payment: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("personal_property"),
    authority: ref,
    property_reference: ref,
    non_value_based_charges: money,
    current_payment_refund: money,
    imposed_annually_on_value: z.literal(true),
    personal_use_only: z.literal(true),
  }).strict(),
  z.object({
    ...common,
    kind: z.literal("general_sales"),
    seller: ref,
    purchase_kind: z.enum([
      "ordinary",
      "food_clothing_medical",
      "motor_vehicle",
    ]),
    taxable_purchase_price: money,
    purchase_tax_rate: z.number().positive().max(1),
    general_tax_rate: z.number().positive().max(1),
    current_payment_refund: money,
    personal_use_only: z.literal(true),
  }).strict(),
]);
export const w2TaxSource2026Schema = z.object({
  source_document_reference: ref,
  employee_ssn: ssn,
  employer_ein: z.string().regex(/^\d{2}-?\d{7}$/),
  box17_state_withheld: money,
  box19_local_withheld: money,
  mandatory_state_contributions: z.array(
    z.object({ description: ref, amount: money }).strict(),
  ),
}).strict();
export const informationReturnTaxSource2026Schema = z.object({
  document_type: z.enum(["1099-INT", "1099-DIV"]),
  source_document_reference: ref,
  recipient_tin: ssn,
  payer_tin: z.string().regex(/^\d{9}$/),
  account_number: ref,
  state: ref,
  payer_state_id: ref,
  state_withheld: money,
}).strict();
export const expenseInput2026Schema = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
  medical_payments: z.array(medicalPayment2026Schema).default([]),
  tax_payments: z.array(taxPayment2026Schema).default([]),
  w2_tax_sources: z.array(w2TaxSource2026Schema).default([]),
  information_return_tax_sources: z.array(informationReturnTaxSource2026Schema)
    .default([]),
  tax_election: z.enum(["income", "actual_sales"]),
  // MFS spouses must both use tables when both elect sales tax and one uses tables.
  spouse_sales_tax_method: z.enum(["not_elected", "actual", "tables"])
    .optional(),
}).strict();
export type ItemizedExpenseInput2026 = z.input<typeof expenseInput2026Schema>;
export function calculateItemizedExpenseSources2026(
  raw: ItemizedExpenseInput2026,
) {
  const input = expenseInput2026Schema.parse(raw);
  const normalize = (value: string) => value.replaceAll("-", "");
  const owners = new Set([normalize(input.taxpayer_ssn)]);
  if (input.filing_status === FilingStatus.MFJ) {
    if (!input.spouse_ssn || owners.has(normalize(input.spouse_ssn))) {
      throw new Error("Joint itemized expenses need distinct filer identities");
    }
    owners.add(normalize(input.spouse_ssn));
  }
  if (
    input.filing_status === FilingStatus.MFS &&
    input.tax_election === "actual_sales" &&
    (!input.spouse_sales_tax_method ||
      input.spouse_sales_tax_method === "tables")
  ) {
    throw new Error(
      "MFS actual sales tax needs the spouse's compatible sales-tax method",
    );
  }
  const checkOwner = (owner: string) => {
    if (!owners.has(normalize(owner))) {
      throw new Error("Itemized payment owner is not a filer on this return");
    }
  };
  const payments = new Set<string>();
  const docs = new Set<string>();
  const pairs = new Set<string>();
  let stateIncome = 0;
  for (const w2 of input.w2_tax_sources) {
    checkOwner(w2.employee_ssn);
    const pair = `${normalize(w2.employee_ssn)}:${normalize(w2.employer_ein)}`;
    if (docs.has(w2.source_document_reference) || pairs.has(pair)) {
      throw new Error("Duplicate itemized W-2 source needs reconciliation");
    }
    docs.add(w2.source_document_reference);
    pairs.add(pair);
    stateIncome += w2.box17_state_withheld + w2.box19_local_withheld +
      w2.mandatory_state_contributions.reduce((n, row) => n + row.amount, 0);
  }
  for (const row of input.information_return_tax_sources) {
    checkOwner(row.recipient_tin);
    const pair = `${row.document_type}:${
      normalize(row.recipient_tin)
    }:${row.payer_tin}:${row.account_number}`;
    if (docs.has(row.source_document_reference) || pairs.has(pair)) {
      throw new Error(
        "Duplicate itemized information-return withholding source",
      );
    }
    docs.add(row.source_document_reference);
    pairs.add(pair);
    stateIncome += row.state_withheld;
  }
  const checkPayment = (
    row: {
      payer_ssn: string;
      payment_reference: string;
      source_document_reference: string;
    },
  ) => {
    checkOwner(row.payer_ssn);
    if (
      payments.has(row.payment_reference) ||
      docs.has(row.source_document_reference)
    ) throw new Error("Duplicate itemized payment or W-2 withholding source");
    payments.add(row.payment_reference);
  };
  const net = (paid: number, excluded: number) => {
    if (excluded > paid) {
      throw new Error("Itemized expense reductions exceed payment");
    }
    return paid - excluded;
  };
  const medical = input.medical_payments.map((row) => {
    checkPayment(row);
    return {
      ...row,
      eligible_amount: net(
        row.amount_paid,
        row.reimbursed_amount + row.tax_free_funding_amount +
          row.nonmedical_amount,
      ),
    };
  });
  let realEstate = 0, personalProperty = 0, sales = 0;
  const taxes = input.tax_payments.map((row) => {
    checkPayment(row);
    let eligible = row.amount_paid;
    if (row.kind === "state_local_income") stateIncome += eligible;
    if (row.kind === "real_estate") {
      eligible = net(
        row.amount_paid,
        row.nondeductible_assessments_or_service_charges +
          row.current_payment_refund,
      );
      realEstate += eligible;
    }
    if (row.kind === "personal_property") {
      eligible = net(
        row.amount_paid,
        row.non_value_based_charges + row.current_payment_refund,
      );
      personalProperty += eligible;
    }
    if (row.kind === "general_sales") {
      if (
        Math.abs(
          row.amount_paid -
            Math.round(
                row.taxable_purchase_price * row.purchase_tax_rate * 100,
              ) / 100,
        ) > 0.010001
      ) {
        throw new Error(
          "Sales-tax receipt does not reconcile to purchase price and rate",
        );
      }
      if (
        row.purchase_kind === "ordinary" &&
          row.purchase_tax_rate !== row.general_tax_rate ||
        row.purchase_kind === "food_clothing_medical" &&
          row.purchase_tax_rate > row.general_tax_rate
      ) {
        throw new Error(
          "This sales-tax receipt is not eligible at its stated rate",
        );
      }
      net(row.amount_paid, row.current_payment_refund);
      if (row.purchase_kind === "motor_vehicle") {
        eligible = Math.min(
          row.amount_paid,
          Math.round(row.taxable_purchase_price * row.general_tax_rate * 100) /
            100,
        );
      }
      // Refund refers to the deductible general-sales-tax portion of this payment.
      eligible = net(eligible, row.current_payment_refund);
      sales += eligible;
    }
    return { ...row, eligible_amount: eligible };
  });
  const amounts = {
    medical: medical.reduce((n, row) => n + row.eligible_amount, 0),
    stateIncome,
    realEstate,
    personalProperty,
    sales,
  };
  if (
    Object.values(amounts).some((n) => !Number.isSafeInteger(Math.round(n)))
  ) throw new Error("Itemized expense totals exceed whole-dollar range");
  return {
    source_input: input,
    medical,
    taxes,
    amounts,
    selectedStateOrSales: input.tax_election === "income" ? stateIncome : sales,
  };
}
