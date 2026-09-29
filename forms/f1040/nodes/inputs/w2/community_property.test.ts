import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import {
  AllocationBasis,
  CommunityPropertyState,
  Form8958Line,
} from "../f8958/source.ts";
import { Box12Code, w2 } from "./index.ts";

const allocation = {
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
const wageStatement = {
  employer_name: "Employer A",
  employee_ssn: "111223333",
  box1_wages: 100_000,
  box2_fed_withheld: 10_000,
  box3_ss_wages: 100_000,
  box4_ss_withheld: 6_200,
  box5_medicare_wages: 100_000,
  box6_medicare_withheld: 1_450,
};
const ctx = { taxYear: 2025, formType: "f1040" } as const;

Deno.test("W-2 emits one community share to 1040 and AGI before aggregation", () => {
  const result = w2.compute(ctx, {
    w2s: [wageStatement],
    f8958_allocation: allocation,
  });
  const f1040 = result.outputs.find((item) => item.nodeType === "f1040")
    ?.fields;
  const agi = result.outputs.find((item) => item.nodeType === "agi_aggregator")
    ?.fields;
  assertEquals(f1040?.line1a_wages, 50_000);
  assertEquals(f1040?.line25a_w2_withheld, 5_000);
  assertEquals(agi?.line1a_wages, 50_000);
  // Earned income for Schedule 8812 is based on the earner's services, not
  // the community property split; the form's credit route remains guarded.
  assertEquals(
    result.outputs.find((item) => item.nodeType === "f8812")?.fields
      .auto_earned_income,
    100_000,
  );
});

Deno.test("ordinary W-2 behavior remains the full Box 1/2 deposit", () => {
  const result = w2.compute(ctx, { w2s: [wageStatement] });
  const f1040 = result.outputs.find((item) => item.nodeType === "f1040")
    ?.fields;
  assertEquals(f1040?.line1a_wages, 100_000);
  assertEquals(f1040?.line25a_w2_withheld, 10_000);
});

Deno.test("community W-2 rejects unmatched or unsupported sources", () => {
  for (
    const w2s of [
      [wageStatement, wageStatement],
      [{ ...wageStatement, box1_wages: 90_000 }],
      [{ ...wageStatement, employee_ssn: "222334444" }],
      [{ ...wageStatement, box17_state_withheld: 1_000 }],
      [{
        ...wageStatement,
        box12_entries: [{ code: Box12Code.D, amount: 1_000 }],
      }],
    ]
  ) {
    assertThrows(() => w2.compute(ctx, { w2s, f8958_allocation: allocation }));
  }
});
