import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as MefFilingStatus } from "../../../../../mef/header.ts";
import { FilingStatus } from "../../../../types.ts";
import {
  AllocationBasis,
  CommunityPropertyState,
  Form8958Line,
} from "./index.ts";
import { projectStagedForm8958Documents } from "./staged_documents.ts";

const source = {
  domicile_state: CommunityPropertyState.CA,
  federal_filing_status: FilingStatus.MFS as const,
  taxpayer: { first_name: "Alex", last_name: "Example", ssn: "111223333" },
  spouse: { first_name: "Blair", last_name: "Example", ssn: "222334444" },
  community_property_period: {
    from: "2025-01-01",
    through: "2025-12-31",
    domicile_workpaper_reference: "CA-domicile-review",
  },
  reviewed_by: "Reviewer",
  reviewed_on: "2026-04-01",
  return_wide_items_review_reference: "both-spouses-return-review",
  reviewed_spouse_return: {
    tax_year: 2025 as const,
    form: "1040" as const,
    filing_status: FilingStatus.MFS as const,
    first_name: "Blair",
    last_name: "Example",
    ssn: "222334444",
    return_document_reference: "spouse-1040-review",
    line1a_wages: 50_000,
    line1z_total_wages: 50_000,
    line9_total_income: 50_000,
    line10_adjustments: 0,
    line11_agi: 50_000,
    line25a_w2_withheld: 5_000,
    line25d_total_withholding: 5_000,
  },
  rows: [{
    item_id: "wage-1",
    form_line: Form8958Line.Wages,
    description: "Employer A",
    source_document_id: "w2-A",
    source_record_reference: "w2-A-box1",
    allocation_basis: AllocationBasis.CommunityEqual,
    state_law_workpaper_reference: "CA-wages",
    total_amount: 100_000,
    taxpayer_share: 50_000,
    other_person_share: 50_000,
  }, {
    item_id: "withholding-1",
    form_line: Form8958Line.Withholding,
    description: "Employer A",
    source_document_id: "w2-A",
    source_record_reference: "w2-A-box2",
    allocation_basis: AllocationBasis.CommunityEqual,
    state_law_workpaper_reference: "CA-withholding",
    total_amount: 10_000,
    taxpayer_share: 5_000,
    other_person_share: 5_000,
  }],
};
const start = {
  general: {
    filing_status: FilingStatus.MFS as const,
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Example",
    taxpayer_ssn: "111223333",
    spouse_first_name: "Blair",
    spouse_last_name: "Example",
    spouse_ssn: "222334444",
  },
  f8958: source,
  w2: [{
    employer_name: "Employer A",
    employee_ssn: "111223333",
    box1_wages: 100_000,
    box2_fed_withheld: 10_000,
    box3_ss_wages: 100_000,
    box4_ss_withheld: 6_200,
    box5_medicare_wages: 100_000,
    box6_medicare_withheld: 1_450,
  }],
};
const filer = {
  firstName: "Alex",
  lastName: "Example",
  nameLine1: "Alex Example",
  nameControl: "EXAM",
  primarySSN: "111223333",
  address: {
    line1: "1 Main St",
    city: "Sacramento",
    state: "CA",
    zip: "95814",
  },
  filingStatus: MefFilingStatus.MarriedFilingSeparately,
};

Deno.test("f8958 staged XML and PDF are derived from the reconciled ledger", () => {
  const result = projectStagedForm8958Documents(start, filer);
  assertEquals(result.execution.diagnostics, []);
  assertEquals(result.execution.pending.f1040?.line1a_wages, 50_000);
  assertEquals(result.execution.pending.f1040?.line25a_w2_withheld, 5_000);
  assertEquals(source.reviewed_spouse_return.line11_agi, 50_000);
  assertStringIncludes(
    result.xml,
    "<SpouseOrPartnerSSN>222334444</SpouseOrPartnerSSN>",
  );
  assertStringIncludes(
    result.xml,
    "<WagesAllocnGrp><Desc>Employer A</Desc><TotalAllocationAmt>100000</TotalAllocationAmt><PrimaryTaxpayerAllocationAmt>50000</PrimaryTaxpayerAllocationAmt><SpouseOrPartnerAllocationAmt>50000</SpouseOrPartnerAllocationAmt></WagesAllocnGrp>",
  );
  assertStringIncludes(result.xml, "<WithholdingTaxAllocnGrp>");
  assertEquals(result.pdfFields.wageTaxpayer, 50_000);
  assertEquals(result.pdfFields.withholdingSpouse, 5_000);
  assertEquals(result.pdfFields.page2TaxpayerSSN3, "3333");
  assertStringIncludes(
    result.fieldMap.withholdingTotal,
    "BodyRow9[0].f2_40[0]",
  );
});

Deno.test("f8958 staged projection requires the reviewed spouse return to match both allocated columns", () => {
  for (
    const reviewed_spouse_return of [
      { ...source.reviewed_spouse_return, ssn: "999999999" },
      { ...source.reviewed_spouse_return, line1a_wages: 100_000 },
      {
        ...source.reviewed_spouse_return,
        line9_total_income: 49_999,
        line11_agi: 49_999,
      },
      {
        ...source.reviewed_spouse_return,
        line10_adjustments: 1,
        line11_agi: 49_999,
      },
      { ...source.reviewed_spouse_return, line25d_total_withholding: 10_000 },
      { ...source.reviewed_spouse_return, return_document_reference: "w2-A" },
    ]
  ) {
    assertThrows(() =>
      projectStagedForm8958Documents(
        { ...start, f8958: { ...source, reviewed_spouse_return } },
        filer,
      )
    );
  }
  assertThrows(() =>
    projectStagedForm8958Documents(
      {
        ...start,
        f8958: {
          ...source,
          reviewed_spouse_return:
            undefined as unknown as typeof source.reviewed_spouse_return,
        },
      },
      filer,
    )
  );
});

Deno.test("f8958 staged projection rejects altered W-2 and filer source", () => {
  for (
    const changed of [
      { ...start, general: { ...start.general, taxpayer_ssn: "999999999" } },
      { ...start, f8958: { ...source, rows: source.rows.slice(0, 1) } },
      {
        ...start,
        w2: [{ ...start.w2[0], box1_wages: 50_000 }],
      },
    ]
  ) {
    assertThrows(() => projectStagedForm8958Documents(changed, filer));
  }
});

Deno.test("f8958 staged projection rejects non-wage rows and absent filer identity", () => {
  assertThrows(() =>
    projectStagedForm8958Documents(
      {
        ...start,
        f8958: {
          ...source,
          rows: [...source.rows, {
            ...source.rows[0],
            item_id: "interest",
            form_line: Form8958Line.Interest,
          }],
        },
      },
      filer,
    )
  );
  assertThrows(() =>
    projectStagedForm8958Documents(
      start,
      { ...filer, firstName: undefined },
    )
  );
});
