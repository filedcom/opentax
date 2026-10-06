// deno-lint-ignore-file no-explicit-any
import { createHash } from "node:crypto";
import { scheduleJFishingInputs } from "./schedule_j_fishing_source.fixture.ts";

/** Two separately owned proprietor businesses on one joint Schedule J election. */
export function scheduleJJointFishingInputs(
  fishingOwner: "T" | "S" = "S",
): Record<string, unknown> {
  const input = scheduleJFishingInputs("mixed-one-farm") as Record<string, any>;
  for (
    const key of [
      "f1099r",
      "form4972",
      "schedule1a",
      "f3921",
      "f1099div",
      "schedule_b_part_iii",
    ]
  ) {
    delete input[key];
  }
  input.general.filing_status = "mfj";
  input.general.spouse_first_name = "Sam";
  input.general.spouse_last_name = "Taxpayer";
  input.general.spouse_ssn = "444-55-6666";
  input.general.spouse_dob = "1987-03-10";
  input.schedule1a = {
    senior_zero_exclusions_review: {
      no_section933_puerto_rico_excluded_income: true,
      section933_review_source_reference: "Joint 2025 residency review",
      no_form2555_filed: true,
      form2555_review_source_reference: "Joint 2025 foreign-income review",
      no_form4563_filed: true,
      form4563_review_source_reference: "Joint 2025 Samoa-source review",
    },
  };
  const c = input.schedule_c[0];
  const f = input.schedule_f.schedule_fs[0];
  c.proprietor_recipient = fishingOwner;
  f.proprietor_recipient = fishingOwner === "S" ? "T" : "S";
  f.line_d_ein = "22-3456789";
  c.line_c_business_name = fishingOwner === "S"
    ? "Sam Commercial Fishing"
    : "Ada Commercial Fishing";
  if (f.proprietor_recipient === "S") {
    f.line_c_farm_name = "Sam Grain Farm";
    f.line_d_ein = "23-4567891";
  }
  const proof = c.schedule_j_fishing_evidence.retained_catch_ledger;
  const ledger = JSON.parse(atob(proof.bytes_base64));
  ledger.taxpayer_ssn = fishingOwner === "S" ? "444556666" : "123456789";
  const bytes = new TextEncoder().encode(JSON.stringify(ledger));
  proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
  proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  for (
    const prior of Object.values(
      input.schedule_j.base_year_source.base_returns,
    ) as any[]
  ) {
    prior.filing_status = "mfj";
  }
  input.schedule_j.tax_treatment.year2025.has_qualified_dividends = false;
  return input;
}

/** Above the MFJ §199A threshold, retaining both actual owner businesses. */
export function scheduleJJointFishingAdvancedInputs(
  fishingOwner: "T" | "S" = "S",
): Record<string, unknown> {
  const input = scheduleJJointFishingInputs(fishingOwner) as Record<
    string,
    any
  >;
  const c = input.schedule_c[0];
  const proof = c.schedule_j_fishing_evidence.retained_catch_ledger;
  const ledger = JSON.parse(atob(proof.bytes_base64));
  ledger.sales[0].amount = 220_000;
  c.line_1_gross_receipts = 220_000;
  const bytes = new TextEncoder().encode(JSON.stringify(ledger));
  proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
  proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  input.schedule_f.schedule_fs[0].line2_sales_products_raised = 300_000;
  return input;
}

/** Full-year payroll journals and fixed-asset registers for each owner business. */
export function scheduleJJointFishingZeroLimitInputs(
  fishingOwner: "T" | "S" = "S",
): Record<string, unknown> {
  const input = scheduleJJointFishingAdvancedInputs(fishingOwner) as Record<
    string,
    any
  >;
  const c = input.schedule_c[0];
  const f = input.schedule_f.schedule_fs[0];
  f.line2_sales_products_raised = 400_000;
  const identity = (recipient: "T" | "S") =>
    recipient === "T" ? "123456789" : "444556666";
  for (
    const [business, reference] of [[c, c.business_reference], [
      f,
      f.farm_id,
    ]] as const
  ) {
    const book = {
      tax_year: 2025,
      owner_ssn: identity(business.proprietor_recipient),
      business_reference: reference,
      employer_ein: business.line_d_ein.replaceAll("-", ""),
      period_start: "2025-01-01",
      period_end: "2025-12-31",
      months: Array.from({ length: 12 }, (_, index) => ({
        month: `2025-${String(index + 1).padStart(2, "0")}`,
        payroll_journal_reference: `${reference}-payroll-${index + 1}`,
        fixed_asset_register_reference: `${reference}-assets-${index + 1}`,
        employee_payments: [],
        qualifying_property: [],
      })),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(book));
    business.qbi_zero_limit_inventory = {
      document_id: `${reference}-2025-payroll-property`,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes_base64: btoa(String.fromCharCode(...bytes)),
    };
    business.qbi_w2_wages = 0;
    business.qbi_unadjusted_basis = 0;
  }
  return input;
}
