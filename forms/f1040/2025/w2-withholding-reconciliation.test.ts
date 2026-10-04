import { assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  assertLine1aWageSource,
  assertW2WithholdingSource,
} from "./w2-withholding-reconciliation.ts";
import {
  AllocationBasis,
  CommunityPropertyState,
  Form8958Line,
} from "../nodes/inputs/f8958/source.ts";
import { FilingStatus as NodeFilingStatus } from "../nodes/types.ts";
import { FormType } from "../nodes/inputs/f4852/index.ts";

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

Deno.test("line 1a rejects wages without an issued or substitute W-2", () => {
  assertLine1aWageSource({ f1040: { line1a_wages: 0 } });
  assertThrows(
    () => assertLine1aWageSource({ f1040: { line1a_wages: 1_200 } }),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
  assertThrows(
    () =>
      assertLine1aWageSource({
        f1040: { line1a_wages: 0 },
        agi_aggregator: { line1a_wages: 1_200 },
      }),
    Error,
    "line 1a and AGI wages differ from retained W-2",
  );
});

Deno.test("line 25a replays substitute W-2 withholding and rejects an unsupported amount", () => {
  const substitute = {
    f4852s: [{
      form_type: FormType.W2,
      payer_name: "Replacement Employer",
      wages: 1_200,
      federal_withheld: 120,
    }],
  };
  assertW2WithholdingSource({
    f4852: substitute,
    f1040: { line25a_w2_withheld: 120 },
  }, filer);
  assertThrows(
    () =>
      assertW2WithholdingSource({
        f4852: substitute,
        f1040: { line25a_w2_withheld: 121 },
      }, filer),
    Error,
    "line 25a differs",
  );
  assertThrows(
    () => assertW2WithholdingSource({ f4852: substitute }, filer),
    Error,
    "requires a filed Form 1040 line 25a",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        f1040: { line25a_w2_withheld: 120 },
      }, filer),
    Error,
    "line 25a differs",
  );
});

Deno.test("line 25a totals distinct issued and substitute W-2 withholding", () => {
  const pending = {
    w2: {
      w2s: [{
        employer_name: "Issued Employer",
        employee_ssn: "111223333",
        box1_wages: 1_000,
        box2_fed_withheld: 100,
      }],
    },
    f4852: {
      f4852s: [{
        form_type: FormType.W2,
        payer_name: "Replacement Employer",
        wages: 2_000,
        federal_withheld: 200,
      }, {
        form_type: FormType.R_1099,
        payer_name: "Pension Payer",
        gross_distribution: 500,
        federal_withheld: 50,
      }],
    },
    f1040: { line25a_w2_withheld: 300 },
  };
  assertW2WithholdingSource(pending, filer);
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...pending,
        f1040: { line25a_w2_withheld: 100 },
      }, filer),
    Error,
    "line 25a differs",
  );
});

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
    "positive wages or withholding need the issued employee SSN",
  );
});

Deno.test("positive W-2 box 2 withholding needs an identified employee on a single return", () => {
  const single = {
    ...filer,
    filingStatus: FilingStatus.Single,
    spouse: undefined,
  };
  const source = {
    w2: {
      w2s: [{
        employer_name: "Employer A",
        box1_wages: 1_000,
        box2_fed_withheld: 100,
      }],
    },
    f1040: { line25a_w2_withheld: 100 },
  };
  assertThrows(
    () => assertW2WithholdingSource(source, single),
    Error,
    "positive wages or withholding need the issued employee SSN",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...source,
        w2: { w2s: [{ ...source.w2.w2s[0], employee_ssn: "11122" }] },
      }, single),
    Error,
    "positive wages or withholding need the issued employee SSN",
  );
  assertW2WithholdingSource({
    ...source,
    w2: { w2s: [{ ...source.w2.w2s[0], employee_ssn: "111-22-3333" }] },
  }, single);
});

Deno.test("joint W-2 wages without withholding still need an identified employee", () => {
  const source = {
    w2: {
      w2s: [{
        employer_name: "Employer A",
        box1_wages: 1_000,
        box2_fed_withheld: 0,
      }],
    },
    f1040: { line25a_w2_withheld: 0 },
  };
  assertThrows(
    () => assertW2WithholdingSource(source, filer),
    Error,
    "positive wages or withholding need the issued employee SSN",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...source,
        w2: {
          w2s: [{
            ...source.w2.w2s[0],
            employee_ssn: "999887777",
          }],
        },
      }, filer),
    Error,
    "recipient must match",
  );
  assertW2WithholdingSource({
    ...source,
    w2: {
      w2s: [{ ...source.w2.w2s[0], employee_ssn: "222334444" }],
    },
  }, filer);
});

Deno.test("positive wages without withholding need an issued employee SSN on a single return", () => {
  const single = {
    ...filer,
    filingStatus: FilingStatus.Single,
    spouse: undefined,
  };
  const row = {
    employer_name: "Employer A",
    box1_wages: 1_000,
    box2_fed_withheld: 0,
  };
  const pending = { w2: { w2s: [row] }, f1040: { line25a_w2_withheld: 0 } };
  assertThrows(
    () => assertW2WithholdingSource(pending, single),
    Error,
    "positive wages or withholding need the issued employee SSN",
  );
  assertThrows(
    () => assertW2WithholdingSource({ w2: { w2s: [row] } }, single),
    Error,
    "positive wages or withholding need the issued employee SSN",
  );
  assertW2WithholdingSource({
    ...pending,
    w2: { w2s: [{ ...row, employee_ssn: "111-22-3333" }] },
  }, single);
});

Deno.test("Social Security and Medicare-only W-2 amounts need the filed employee owner", () => {
  const row = {
    employer_name: "Employer A",
    box1_wages: 0,
    box2_fed_withheld: 0,
    box3_ss_wages: 1_000,
    box5_medicare_wages: 1_000,
  };
  const pending = { w2: { w2s: [row] }, f1040: { line25a_w2_withheld: 0 } };
  assertThrows(
    () => assertW2WithholdingSource(pending, filer),
    Error,
    "need the issued employee SSN",
  );
  assertThrows(
    () => assertW2WithholdingSource({ w2: { w2s: [row] } }, filer),
    Error,
    "need the issued employee SSN",
  );
  assertThrows(
    () =>
      assertW2WithholdingSource({
        ...pending,
        w2: { w2s: [{ ...row, employee_ssn: "999887777" }] },
      }, filer),
    Error,
    "recipient must match",
  );
  assertW2WithholdingSource({
    ...pending,
    w2: { w2s: [{ ...row, employee_ssn: "222334444" }] },
  }, filer);
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
  assertLine1aWageSource({
    ...pending,
    f1040: { ...pending.f1040, line1a_wages: 500 },
    agi_aggregator: { line1a_wages: 500 },
  });
  assertThrows(
    () =>
      assertLine1aWageSource({
        ...pending,
        w2: {
          ...pending.w2,
          w2s: [{ ...pending.w2.w2s[0], box1_wages: 1_001 }],
        },
        f1040: { ...pending.f1040, line1a_wages: 500 },
      }),
    Error,
    "wage allocation must match one ordinary issued W-2 box 1",
  );
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
