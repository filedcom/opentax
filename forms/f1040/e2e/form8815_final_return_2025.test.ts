import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form8815Pdf } from "../2025/pdf/forms/f8815.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const sources = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1980-06-15",
    address_line1: "1 Example Way",
    address_city: "Boston",
    address_state: "MA",
    address_zip: "02108",
    digital_assets: false,
  },
  w2: [{
    employee_ssn: "111-22-3333",
    employer_ein: "12-3456789",
    employer_name: "Example Employer",
    employer_address_line1: "500 Market St",
    employer_address_city: "Boston",
    employer_address_state: "MA",
    employer_address_zip: "02108",
    box1_wages: 70_000,
    box2_fed_withheld: 7_000,
    box3_ss_wages: 70_000,
    box4_ss_withheld: 4_340,
    box5_medicare_wages: 70_000,
    box6_medicare_withheld: 1_015,
  }],
  f1099int: [{
    payer_name: "Treasury Savings Bonds",
    recipient_tin: "111223333",
    source_document_reference: "2025 redeemed Series EE bond 1099-INT",
    box3: 2_000,
  }],
  schedule_b_part_iii: {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  },
  form8815: {
    eligible_students: [{
      person_name: "Alex Example",
      institution_name: "Example University",
      institution_address: {
        line1: "1 College Ave",
        city: "Boston",
        state: "MA",
        zip: "02108",
      },
    }],
    qualified_bond_facts: {
      series_ee_or_i: true,
      issued_after_1989: true,
      owned_by_taxpayer_or_spouse: true,
      owner_age_at_issue_at_least_24: true,
      redemption_records_retained: true,
    },
    education_facts: {
      all_students_are_taxpayer_spouse_or_claimed_dependents: true,
      all_institutions_eligible: true,
      expenses_are_eligible_2025_tuition_or_fees: true,
      expenses_not_used_for_education_credit_or_tax_free_distribution: true,
      no_coverdell_or_qtp_contributions_in_claim: true,
      nontaxable_benefits_paid_directly_by_institution_excluded: true,
    },
    line2_qualified_education_expenses: 15_000,
    line3_nontaxable_education_benefits: 0,
    bond_proceeds: 12_000,
    line6_worksheet: {
      paper_ee_face_value: 20_000,
      electronic_ee_and_i_face_value: 0,
      interest_reported_in_prior_years: 0,
    },
    line9_worksheet: {
      schedule_b_line2_interest: 2_000,
      other_1040_and_schedule1_income: 70_000,
      schedule1_adjustments: 0,
      foreign_adoption_and_puerto_rico_addbacks: 0,
      finalized_2025_income_lines_reviewed: true,
      no_royalty_interest_special_computation: true,
    },
    filing_status: "single",
  },
};

Deno.test("Form 8815 bond exclusion reconciles from source through return, native MeF, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, sources, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8815?.line9, 72_000);
  assertEquals(result.pending.form8815?.line14, 2_000);
  assertEquals(result.pending.schedule_b?.print_line2_total, 2_000);
  assertEquals(result.pending.schedule_b?.ee_bond_exclusion, 2_000);
  assertEquals(result.pending.f1040?.line9_total_income, 70_000);
  assertEquals(result.pending.f1040?.line11_agi, 70_000);

  const filer = extractFilerIdentity(result.pending.f1040);
  const xml = buildMefXml(result.pending, filer);
  assertStringIncludes(xml, "<IRS8815 documentId=");
  assertStringIncludes(
    xml,
    "<ExclBondIntModifiedAGIAmt>72000</ExclBondIntModifiedAGIAmt>",
  );
  assertStringIncludes(
    xml,
    "<ExcludableSavingsBondIntAmt>2000</ExcludableSavingsBondIntAmt>",
  );
  const projected = form8815Pdf.projectFields!(
    result.pending.form8815!,
    result.pending,
  );
  assertEquals(projected.line14, 2_000);
  assertEquals(
    form8815Pdf.instances!(projected, filer, result.pending).length,
    1,
  );
  const pdf = await buildPdfBytes(result.pending, filer);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() > 1, true);

  const changedCases: Record<string, Record<string, unknown>>[] = [
    { f1040: { ...result.pending.f1040, line9_total_income: 70_100 } },
    { f1040: { ...result.pending.f1040, line11_agi: 70_100 } },
    { schedule_b: { ...result.pending.schedule_b, print_line4_total: 100 } },
    {
      f1099int: {
        f1099ints: [{
          ...(result.pending.f1099int?.f1099ints as Record<
            string,
            unknown
          >[])[0],
          box3: 100,
        }],
      },
    },
  ];
  for (const changed of changedCases) {
    const tampered: typeof result.pending = { ...result.pending, ...changed };
    assertThrows(() => buildMefXml(tampered, filer), Error);
    const tamperedFields = form8815Pdf.projectFields!(
      tampered.form8815!,
      tampered,
    );
    assertThrows(
      () => form8815Pdf.instances!(tamperedFields, filer, tampered),
      Error,
    );
  }
  const changedWorksheet = structuredClone(result.pending);
  const worksheet = changedWorksheet.form8815!.line9_worksheet as Record<
    string,
    unknown
  >;
  changedWorksheet.form8815!.line9_worksheet = {
    ...worksheet,
    other_1040_and_schedule1_income: 69_900,
  };
  assertThrows(() => buildMefXml(changedWorksheet, filer), Error);
  assertThrows(
    () =>
      form8815Pdf.projectFields!(changedWorksheet.form8815!, changedWorksheet),
    Error,
  );
});
