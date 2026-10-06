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

/** Issued farm W-2 and/or retained pre-2025 depreciable tractor source. */
export function scheduleJJointFishingPositiveLimitsInputs(
  kind: "wages" | "property" | "combined",
  fishingOwner: "T" | "S" = "S",
): Record<string, unknown> {
  const input = scheduleJJointFishingZeroLimitInputs(fishingOwner) as Record<
    string,
    any
  >;
  const f = input.schedule_f.schedule_fs[0];
  const reference = f.farm_id;
  const employerEin = f.line_d_ein.replaceAll("-", "");
  const ownerSsn = f.proprietor_recipient === "T" ? "123456789" : "444556666";
  const hasWages = kind !== "property";
  const hasProperty = kind !== "wages";
  f.line2_sales_products_raised = 500_000;
  f.line22_labor_hired = hasWages ? 20_000 : 0;
  f.line29_taxes = hasWages ? 1_530 : 0;
  f.qbi_w2_wages = hasWages ? 20_000 : 0;
  f.qbi_unadjusted_basis = hasProperty ? 400_000 : 0;
  delete f.qbi_zero_limit_inventory;
  const book = {
    tax_year: 2025,
    owner_ssn: ownerSsn,
    business_reference: reference,
    employer_ein: employerEin,
    period_start: "2025-01-01",
    period_end: "2025-12-31",
    farm_product_sales: [{
      buyer: "Texas Grain Cooperative",
      crop: "Grain raised by owner-operated farm",
      sold_on: "2025-09-30",
      buyer_invoice_reference: "TGC-2025-309",
      paid_on: "2025-10-10",
      deposit_reference: "grain-bank-deposit-2025-1010",
      amount: 500_000,
    }],
    months: Array.from({ length: 12 }, (_, index) => ({
      month: `2025-${String(index + 1).padStart(2, "0")}`,
      payroll_journal_reference: `${reference}-2025-payroll-${index + 1}`,
      payments: hasWages && index === 9
        ? [{
          employee_ssn: "777889999",
          paid_on: "2025-10-15",
          check_reference: "grain-2025-paycheck-1015",
          cash_wages: 20_000,
          net_check_paid: 18_470,
        }]
        : [],
    })),
    issued_employee_w2_copies: hasWages
      ? [{
        employee_ssn: "777889999",
        employer_ein: employerEin,
        issued_copy_reference: "grain-2025-employee-w2-copy-1",
        issued_on: "2026-01-31",
        ssa_filing_reference: "grain-2025-ssa-w3-1",
        ssa_filed_on: "2026-01-31",
        box1_wages: 20_000,
        box3_social_security_wages: 20_000,
        box5_medicare_wages: 20_000,
        box4_social_security_tax_withheld: 1_240,
        box6_medicare_tax_withheld: 290,
      }]
      : [],
    ...(hasWages
      ? {
        form943_filing_reference: "grain-2025-form943-payroll-return",
        employer_payroll_tax_deposit: {
          paid_on: "2025-11-15",
          bank_debit_reference: "grain-2025-payroll-tax-debit-1115",
          amount: 3_060,
        },
      }
      : {}),
    owned_property_register: hasProperty
      ? [{
        asset_reference: "grain-tractor-2018-1",
        purchase_invoice_reference: "farm-equipment-2018-041",
        title_record_reference: "grain-tractor-title-2018-1",
        paid_receipt_reference: "grain-tractor-bank-payment-2018-1",
        seller: "Hill Country Farm Equipment",
        acquired_on: "2018-03-10",
        placed_in_service_on: "2018-03-15",
        recovery_period_years: 5,
        prior_depreciation_completion_reference:
          "grain-tractor-2018-2023-depreciation-ledger",
        prior_depreciation_ledger: [{
          tax_year: 2018,
          form4562_source_reference:
            "grain-tractor-2018-form4562-special-allowance",
          deduction_method: "100_percent_special_depreciation",
          deduction: 400_000,
        }],
        original_cost_paid: 400_000,
        owner_ssn: ownerSsn,
        tangible_depreciable_property: true,
        held_at_2025_year_end: true,
        used_in_2025_qbi_production: true,
        retained_2025_use_record_reference: "grain-tractor-harvest-log-2025",
      }]
      : [],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(book));
  f.qbi_positive_limit_inventory = {
    document_id: `${reference}-2025-positive-qbi-books`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
  return input;
}
