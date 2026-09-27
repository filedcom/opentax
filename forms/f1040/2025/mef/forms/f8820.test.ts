import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { inputSchema } from "../../../nodes/inputs/f8820/index.ts";
import { buildForm8820Document, form8820 } from "./f8820.ts";

const source = inputSchema.parse({
  f8820s: [{
    generic_name: "Test Orphan Drug",
    designation_application_number: "FDA-123",
    designation_date: "2024-03-15",
    qualified_clinical_testing_expenses: 100_000,
    qualifying_testing_confirmed: true,
    expenses_exclude_third_party_funding: true,
    expenses_not_used_for_research_credit: true,
  }],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 1_250,
  subject_to_passive_activity_limit: false,
});

Deno.test("Form 8820 MeF maps the election, wage offset, and drug identity", () => {
  const xml = buildForm8820Document(source);
  assertStringIncludes(
    xml,
    "<QlfyClinicalTestExpnssPdAmt>100000</QlfyClinicalTestExpnssPdAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectAmt>19750</ReducedSection280CCrElectAmt>",
  );
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectInd>true</ReducedSection280CCrElectInd>",
  );
  assertStringIncludes(
    xml,
    "<EmployerDifferentialWageCrAmt>1250</EmployerDifferentialWageCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<CYCLessEmployerDiffWageCrAmt>18500</CYCLessEmployerDiffWageCrAmt>",
  );
  assertStringIncludes(xml, "<OrphanDrugNm>Test Orphan Drug</OrphanDrugNm>");
  assertStringIncludes(
    xml,
    "<OrphanDrugDesignationNum>FDA-123</OrphanDrugDesignationNum>",
  );
});

Deno.test("Form 8820 MeF requires the linked Form 3800 and any expense statement", () => {
  assertThrows(() =>
    form8820.build(source, {
      documentIdsByPendingKey: {},
    })
  );
  const xml = form8820.build(source, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<IRS8820>");
  assertThrows(() =>
    form8820.build({
      ...source,
      reduced_section280c_credit_election: false,
      expense_reduction_statement_file_name: "deduction-reduction.pdf",
    }, {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      binaryAttachmentFileNames: [],
    })
  );
  assertStringIncludes(
    form8820.build({
      ...source,
      reduced_section280c_credit_election: false,
      expense_reduction_statement_file_name: "deduction-reduction.pdf",
    }, {
      documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      binaryAttachmentFileNames: ["deduction-reduction.pdf"],
    }),
    "<ReducedSection280CCrElectInd>false</ReducedSection280CCrElectInd>",
  );
  assertEquals(form8820.build({}), "");
});

Deno.test("Form 8820 MeF preserves a zero-credit reduced election without Form 3800", () => {
  const election = {
    ...source,
    f8820s: [{ ...source.f8820s[0], qualified_clinical_testing_expenses: 0 }],
    form8932_overlapping_wage_credit: 0,
  };
  const xml = form8820.build(election, { documentIdsByPendingKey: {} });
  assertStringIncludes(
    xml,
    "<ReducedSection280CCrElectInd>true</ReducedSection280CCrElectInd>",
  );
  assertStringIncludes(
    xml,
    "<SumCurrYrCrandOrphnDrugCrAmt>0</SumCurrYrCrandOrphnDrugCrAmt>",
  );
  assertEquals(
    form8820.build({ ...election, reduced_section280c_credit_election: false }),
    "",
  );
});

Deno.test("Form 8820 MeF includes mixed line 3 but omits a pass-through-only form", () => {
  const passThrough = {
    source_type: "partnership" as const,
    entity_ein: "123456789",
    source_document_reference: "2025 Schedule K-1 orphan-drug credit",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  };
  const mixed = { ...source, pass_through_credits: [passThrough] };
  const xml = form8820.build(mixed, {
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(xml, "<OrphanDrugCreditAmt>1250</OrphanDrugCreditAmt>");
  assertStringIncludes(
    xml,
    "<SumCurrYrCrandOrphnDrugCrAmt>19750</SumCurrYrCrandOrphnDrugCrAmt>",
  );
  assertEquals(
    form8820.build({
      ...mixed,
      f8820s: [],
      reduced_section280c_credit_election: false,
    }),
    "",
  );
});
