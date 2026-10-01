import { assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { assertW2WithholdingSource } from "./w2-withholding-reconciliation.ts";
import {
  AllocationBasis,
  CommunityPropertyState,
  Form8958Line,
} from "../nodes/inputs/f8958/source.ts";
import { FilingStatus as NodeFilingStatus } from "../nodes/types.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "222334444",
    firstName: "Joint",
    lastName: "Spouse",
    nameControl: "SPOU",
  },
};

Deno.test("W-2 withholding replays both identified joint owners into line 25a", () => {
  const source = {
    w2: {
      w2s: [{
        employer_name: "Employer A",
        employee_ssn: "111223333",
        box1_wages: 1_000,
        box2_fed_withheld: 100,
      }, {
        employer_name: "Employer B",
        employee_ssn: "222334444",
        box1_wages: 2_000,
        box2_fed_withheld: 200,
      }],
    },
    f1040: { line25a_w2_withheld: 300 },
  };
  assertW2WithholdingSource(source, filer);
  assertThrows(
    () => assertW2WithholdingSource({ w2: source.w2 }, filer),
    Error,
    "requires a filed Form 1040 line 25a",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...source,
        f1040: { line25a_w2_withheld: 299 },
      }, filer),
    Error,
    "line 25a differs",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...source,
        w2: {
          w2s: [source.w2.w2s[0], {
            ...source.w2.w2s[1],
            employee_ssn: "999887777",
          }],
        },
      }, filer),
    Error,
    "recipient must match",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...source,
        w2: {
          w2s: [source.w2.w2s[0], {
            ...source.w2.w2s[1],
            employee_ssn: undefined,
          }],
        },
      }, filer),
    Error,
    "identified joint spouse",
  );
});

Deno.test("W-2 Form 8958 taxpayer share, rather than full box 2, files on line 25a", () => {
  const allocation = {
    domicile_state: CommunityPropertyState.CA,
    federal_filing_status: NodeFilingStatus.MFS,
    taxpayer: { first_name: "Alex", last_name: "Example", ssn: "111223333" },
    spouse: { first_name: "Blair", last_name: "Example", ssn: "222334444" },
    community_property_period: {
      from: "2025-01-01",
      through: "2025-12-31",
      domicile_workpaper_reference: "CA domicile review",
    },
    reviewed_by: "Reviewer",
    reviewed_on: "2026-04-01",
    return_wide_items_review_reference: "both returns review",
    reviewed_spouse_return: {
      tax_year: 2025 as const,
      form: "1040" as const,
      filing_status: NodeFilingStatus.MFS,
      first_name: "Blair",
      last_name: "Example",
      ssn: "222334444",
      return_document_reference: "spouse return",
      line1a_wages: 500,
      line1z_total_wages: 500,
      line9_total_income: 500,
      line10_adjustments: 0,
      line11_agi: 500,
      line25a_w2_withheld: 50,
      line25d_total_withholding: 50,
    },
    rows: [{
      item_id: "wages",
      form_line: Form8958Line.Wages,
      description: "Employer A",
      source_document_id: "W-2 A",
      source_record_reference: "W-2 box 1",
      allocation_basis: AllocationBasis.CommunityEqual,
      state_law_workpaper_reference: "CA equal share",
      total_amount: 1_000,
      taxpayer_share: 500,
      other_person_share: 500,
    }, {
      item_id: "withholding",
      form_line: Form8958Line.Withholding,
      description: "Employer A",
      source_document_id: "W-2 A",
      source_record_reference: "W-2 box 2",
      allocation_basis: AllocationBasis.CommunityEqual,
      state_law_workpaper_reference: "CA equal share",
      total_amount: 100,
      taxpayer_share: 50,
      other_person_share: 50,
    }],
  };
  const pending = {
    w2: {
      w2s: [{
        employer_name: "Employer A",
        employee_ssn: "111223333",
        box1_wages: 1_000,
        box2_fed_withheld: 100,
      }],
      f8958_allocation: allocation,
    },
    f1040: { line25a_w2_withheld: 50 },
  };
  const separate = {
    ...filer,
    filingStatus: FilingStatus.MarriedFilingSeparately,
  };
  assertW2WithholdingSource(pending, separate);
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...pending,
        f1040: { line25a_w2_withheld: 100 },
      }, separate),
    Error,
    "line 25a differs",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...pending,
        w2: {
          ...pending.w2,
          f8958_allocation: {
            ...allocation,
            rows: [allocation.rows[0], {
              ...allocation.rows[1],
              total_amount: 200,
              taxpayer_share: 100,
              other_person_share: 100,
            }],
          },
        },
      }, separate),
    Error,
    "one matching taxpayer W-2 box 2 total",
  );
});
