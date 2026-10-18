import { setDefaultTimeout, test } from "bun:test";
import { existsSync } from "node:fs";
import { fileURLToPath as fromFileUrl } from "node:url";
import { assertEquals, assertStringIncludes } from "@std/assert";
import * as sys from "../../../../scripts/support/sys.ts";
import { catalog } from "../../../../catalog.ts";
import { signed } from "../../../../scripts/testing/mef.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../cli/commands/export.ts";
import { normalizeAllPending } from "../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { FilingStatus } from "../../nodes/types.ts";

const SCHEMA = fromFileUrl(
  new URL(
    "../../../../irs/mef/2026v1.0/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

// Each case runs a full return, MeF build and xmllint.
setDefaultTimeout(60_000);

const TAXPAYER_SSN = "400001037";
const SPOUSE_SSN = "400001038";

function general(filingStatus: FilingStatus): Record<string, unknown> {
  return {
    filing_status: filingStatus,
    taxpayer_first_name: "Sam",
    taxpayer_last_name: "Wheat",
    taxpayer_ssn: TAXPAYER_SSN,
    taxpayer_dob: "1980-02-07",
    taxpayer_prior_year_agi: 0,
    address_line1: "2525 Main Street",
    address_city: "Round Rock",
    address_state: "TX",
    address_zip: "78680",
    digital_assets: false,
    ats_test_submission: true,
    ...(filingStatus === FilingStatus.MFJ
      ? {
        spouse_first_name: "Pat",
        spouse_last_name: "Wheat",
        spouse_ssn: SPOUSE_SSN,
        spouse_dob: "1981-03-08",
        spouse_prior_year_agi: 0,
      }
      : {}),
  };
}

/** A W-2 whose withholding boxes follow the 2026 FICA rates and wage base. */
function w2(wages: number, withheld: number): Record<string, unknown> {
  const ssWages = Math.min(wages, 184_500);
  return {
    source_document_reference: `w2-${wages}`,
    employer_name: "Doughnut Castle",
    employer_ein: "000000057",
    employee_ssn: TAXPAYER_SSN,
    employer_address_line1: "1518 North Mays Lane",
    employer_address_city: "Round Rock",
    employer_address_state: "TX",
    employer_address_zip: "78664",
    box1_wages: wages,
    box2_fed_withheld: withheld,
    box3_ss_wages: ssWages,
    box4_ss_withheld: Math.round(ssWages * 0.062),
    box5_medicare_wages: wages,
    box6_medicare_withheld: Math.round(
      wages * 0.0145 + Math.max(0, wages - 200_000) * 0.009,
    ),
  };
}

function f1098(interest: number): Record<string, unknown> {
  return {
    lender_name: "Example Home Lender",
    recipient_tin: TAXPAYER_SSN,
    source_document_reference: "2026 lender copy",
    box1_mortgage_interest: interest,
    box1_current_year_deductible_interest: interest,
    box1_deduction_workpaper_reference: "2026 Pub. 936 workpaper",
    box3_origination_date: "06/15/2019",
    box2_outstanding_principal: 300_000,
    issuer_copy: {
      file_name: "Lender1098.pdf",
      pdf_sha256: "0".repeat(64),
      bytes: new Uint8Array(),
    },
  };
}

function run(inputs: Record<string, unknown>) {
  const def = catalog["f1040:2026"];
  const input = signed(inputs);
  const g = input.general as Record<string, unknown>;
  g.taxpayer_signature_date = "2027-02-01";
  if (g.spouse_signature_date) g.spouse_signature_date = "2027-02-01";
  const result = def.executeReturn(input);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  const xml = def.buildMefXml(pending, filer);
  // buildMefXml carries no transmission timestamp, so the receipt-date
  // header rules IND-002 and IND-689-01 cannot be evaluated here.
  const rejects = businessRuleReport(pending, filer, emittedValidationScope(xml))
    .entries.filter((entry) => entry.severity !== "alert")
    .map((entry) => entry.ruleNumber)
    .filter((rule) => rule !== "IND-002" && rule !== "IND-689-01");
  return { result, f: pending.f1040 ?? {}, xml, rejects };
}

async function assertSchemaValid(xml: string): Promise<void> {
  if (!existsSync(SCHEMA)) return;
  const dir = await sys.makeTempDir();
  const path = `${dir}/return.xml`;
  await sys.writeText(path, xml);
  const validated = await new sys.Command("xmllint", {
    args: ["--noout", "--schema", SCHEMA, path],
    stdout: "piped",
    stderr: "piped",
  }).output();
  await sys.remove(dir, { recursive: true });
  assertEquals(
    validated.code,
    0,
    new TextDecoder().decode(validated.stderr),
  );
}

// Single, AGI $104,400. Schedule A: SALT $14,000 (under the $40,400 cap,
// IRC §164(b)(7)); Form 1098 interest $10,000; $3,000 cash gifts less the
// 0.5% floor, $522 = 0.005 x $104,400 (IRC §170(b)(1)(I); Pub. 505 (2026)
// Worksheet 2-5). Line 12e $26,478 beats the $16,100 standard deduction
// (Rev. Proc. 2025-32 §4.14(1)). Line 15 $77,922; line 16 from the $77,900-
// $77,950 row midpoint, Rev. Proc. 2025-32 §4.01 Table 3: $5,800 + 22% x
// ($77,925 - $50,400) = $11,855.50, rounded to $11,856.
test("TY2026 itemized return applies the 0.5% charitable floor and files Schedule A", async () => {
  const { result, f, xml, rejects } = run({
    general: general(FilingStatus.Single),
    w2: [w2(104_400, 15_000)],
    f1098: [f1098(10_000)],
    schedule_a: {
      line_5a_state_income_tax: 8_000,
      line_5b_real_estate_tax: 6_000,
      cash_contributions_to_50_percent_organizations: 3_000,
      cash_contributions_to_daf_or_supporting_organizations: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line11_agi, 104_400);
  assertEquals(f.line12e_itemized_deductions, 26_478);
  assertEquals(f.line15_taxable_income, 77_922);
  assertEquals(f.line16_income_tax, 11_856);
  assertStringIncludes(xml, "<TotalItemizedOrStandardDedAmt>26478<");
  assertStringIncludes(xml, "<TotalItemizedDeductionsAmt>26478<");
  assertStringIncludes(xml, "<RptHomeMortgIntAndPointsAmt>10000<");
  assertEquals(rejects, []);
  await assertSchemaValid(xml);
});

// Single, AGI $50,510 with a $1,500 cash gift: standard deduction $16,100
// plus line 12f capped at $1,000 (IRC §170(p)). Line 15 $33,410; line 16 at
// the $33,400-$33,450 midpoint: $1,240 + 12% x ($33,425 - $12,400) = $3,763.
// MeF 2026v1.0 has no 12f element, so it reaches only line 14.
test("TY2026 standard deduction adds the non-itemizer charitable deduction", async () => {
  const { result, f, xml, rejects } = run({
    general: general(FilingStatus.Single),
    w2: [w2(50_510, 10_268)],
    schedule_a: {
      cash_contributions_to_50_percent_organizations: 1_500,
      cash_contributions_to_daf_or_supporting_organizations: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line12a_standard_deduction, 16_100);
  assertEquals(f.line12f_nonitemizer_charitable, 1_000);
  assertEquals(f.line14_deductions_qbi_total, 17_100);
  assertEquals(f.line15_taxable_income, 33_410);
  assertEquals(f.line16_income_tax, 3_763);
  assertStringIncludes(xml, "<TotalItemizedOrStandardDedAmt>16100<");
  assertStringIncludes(xml, "<TotalDeductionsAmt>17100<");
  assertEquals(xml.includes("IRS1040ScheduleA"), false);
  assertEquals(rejects, []);
  await assertSchemaValid(xml);
});

// MFJ, AGI $1,000,000. SALT $80,000 is capped at the $10,000 floor: $40,400
// less 30% of ($1,000,000 - $505,000) is below it (IRC §164(b)(7)). Interest
// $30,000; cash gifts $25,000 less the $5,000 floor. Itemized $60,000 is
// reduced by 2/37 x min($60,000, $1,000,000 - $768,700) = $3,243 (IRC §68 as
// amended by P.L. 119-21 §70111; 37% bracket start, Rev. Proc. 2025-32 §4.01
// Table 1), so line 12e is $56,757 and line 15 $943,243. Line 16 by the Tax
// Computation Worksheet: $206,583.50 + 37% x ($943,243 - $768,700) =
// $271,164.41, rounded to $271,164.
test("TY2026 top-bracket itemizer has the SALT floor and the 2/37 overall limit", async () => {
  const { result, f, xml } = run({
    general: general(FilingStatus.MFJ),
    w2: [w2(1_000_000, 250_000)],
    f1098: [f1098(30_000)],
    schedule_a: {
      line_5a_state_income_tax: 50_000,
      line_5b_real_estate_tax: 30_000,
      cash_contributions_to_50_percent_organizations: 25_000,
      cash_contributions_to_daf_or_supporting_organizations: 0,
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line12e_itemized_deductions, 56_757);
  assertEquals(f.line15_taxable_income, 943_243);
  assertEquals(f.line16_income_tax, 271_164);
  assertStringIncludes(xml, "<TotalItemizedDeductionsAmt>56757<");
  await assertSchemaValid(xml);
});

const ZERO_EXCLUSIONS_REVIEW = {
  no_section933_puerto_rico_excluded_income: true,
  section933_review_source_reference: "2026 residency review",
  no_form2555_filed: true,
  form2555_review_source_reference: "2026 foreign income review",
  no_form4563_filed: true,
  form4563_review_source_reference: "2026 possession income review",
};

// Single, born 1960, AGI $50,510: standard deduction $16,100 + $2,050
// (Rev. Proc. 2025-32 §4.14(1), (3)) and the full $6,000 senior deduction
// below $75,000 MAGI (IRC §151(d)(5)(C)). Line 15 $26,360; line 16 at the
// $26,350-$26,400 midpoint: $1,240 + 12% x ($26,375 - $12,400) = $2,917.
test("TY2026 senior deduction files Schedule 1-A", async () => {
  const { result, f, xml, rejects } = run({
    general: {
      ...general(FilingStatus.Single),
      taxpayer_dob: "1960-05-01",
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_tin_issued_by_due_date: true,
    },
    w2: [w2(50_510, 10_268)],
    schedule1a: { senior_zero_exclusions_review: ZERO_EXCLUSIONS_REVIEW },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line12a_standard_deduction, 18_150);
  assertEquals(f.line13b_additional_deductions, 6_000);
  assertEquals(f.line15_taxable_income, 26_360);
  assertEquals(f.line16_income_tax, 2_917);
  assertStringIncludes(xml, "<EnhancedSeniorDeductionAmt>6000<");
  assertEquals(rejects, []);
  await assertSchemaValid(xml);
});

// MFJ, AGI $210,500, $8,000 interest on a 2026 loan: $8,000 less $200 for
// each $1,000 or part of MAGI over $200,000 (11 x $200) is $5,800 (IRC
// §163(h)(4); draft 2026 Schedule 1-A lines 26-30). Line 15 is $210,500 -
// $32,200 - $5,800 = $172,500; line 16 by the Tax Computation Worksheet:
// $11,600 + 22% x ($172,500 - $100,800) = $27,374.
test("TY2026 qualified vehicle loan interest phases out above $200,000 MFJ", async () => {
  const { result, f, xml, rejects } = run({
    general: general(FilingStatus.MFJ),
    w2: [w2(210_500, 30_000)],
    schedule1a: {
      senior_zero_exclusions_review: ZERO_EXCLUSIONS_REVIEW,
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        borrower_ssn: TAXPAYER_SSN,
        loan_originated_date: "2026-03-02",
        vehicle_purchased_date: "2026-03-02",
        lender_name: "Test Credit Union",
        lender_interest_statement_reference: "2026 lender interest statement",
        purchase_and_lien_reference: "2026 purchase and first-lien agreement",
        final_assembly_reference: "vehicle information label",
        original_borrower: true,
        purchase_proceeds_only: true,
        first_lien_secured: true,
        original_vehicle_use: true,
        road_vehicle_with_two_or_more_wheels: true,
        vehicle_type: "car",
        gross_vehicle_weight_under_14000_pounds: true,
        final_assembly_in_us: true,
        expected_personal_use_over_half: true,
        qualified_interest_paid: 8_000,
        interest_deducted_elsewhere: 0,
        no_other_interest_deduction_review_reference: "2026 C/E/F review",
      }],
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(f.line13b_additional_deductions, 5_800);
  assertEquals(f.line15_taxable_income, 172_500);
  assertEquals(f.line16_income_tax, 27_374);
  assertStringIncludes(xml, "<QualifiedCarLoanInterestDedAmt>5800<");
  assertStringIncludes(xml, "<CarLnIntMAGILessThrshldDivNum>11<");
  assertEquals(rejects, []);
  await assertSchemaValid(xml);
});

test("TY2026 refuses a vehicle loan dated after the tax year", () => {
  const result = catalog["f1040:2026"].executeReturn({
    general: general(FilingStatus.Single),
    w2: [w2(50_510, 10_268)],
    schedule1a: {
      senior_zero_exclusions_review: ZERO_EXCLUSIONS_REVIEW,
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        borrower_ssn: TAXPAYER_SSN,
        loan_originated_date: "2027-01-05",
        vehicle_purchased_date: "2027-01-05",
        lender_name: "Test Credit Union",
        lender_interest_statement_reference: "lender interest statement",
        purchase_and_lien_reference: "purchase and first-lien agreement",
        final_assembly_reference: "vehicle information label",
        original_borrower: true,
        purchase_proceeds_only: true,
        first_lien_secured: true,
        original_vehicle_use: true,
        road_vehicle_with_two_or_more_wheels: true,
        vehicle_type: "car",
        gross_vehicle_weight_under_14000_pounds: true,
        final_assembly_in_us: true,
        expected_personal_use_over_half: true,
        qualified_interest_paid: 1_000,
        interest_deducted_elsewhere: 0,
        no_other_interest_deduction_review_reference: "C/E/F review",
      }],
    },
  });
  assertEquals(
    result.diagnostics.some((d) => d.message.includes("2026-12-31")),
    true,
  );
});
