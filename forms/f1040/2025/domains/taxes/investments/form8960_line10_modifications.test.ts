import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";

// 2025 Instructions for Form 8960, Line 10—Additional Modifications: report
// properly allocable deductions or modifications to NII not reflected on
// lines 1–9 (Regulations sections 1.1411-4(f) and (g)). Line 11 adds lines
// 9d and 10; line 12 is line 8 less line 11; line 17 is 3.8% of line 16.

const inputs = (withLine10: boolean) => ({
  general: {
    filing_status: "single",
    taxpayer_first_name: "Pat",
    taxpayer_last_name: "Example",
    taxpayer_dob: "1980-01-01",
    taxpayer_blind: false,
    taxpayer_can_be_claimed_as_dependent: false,
  },
  w2: [{
    employer_ein: "12-3456789",
    employer_name: "Employer",
    box1_wages: 250_000,
    box2_fed_withheld: 50_000,
    box3_ss_wages: 176_100,
    box4_ss_withheld: 10_918.2,
    box5_medicare_wages: 250_000,
    box6_medicare_withheld: 4_075,
  }],
  f1099int: [{
    payer_name: "Example Bank",
    payer_tin: "12-3456789",
    box1: 10_000,
  }],
  schedule_b_part_iii: {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  },
  ...(withLine10
    ? {
      form8960_additional_modifications: {
        line10_additional_modification_rows: [{
          description: "Properly allocable investment expense",
          amount: 1_500,
          source_document_reference: "Synthetic 2025 expense record",
        }],
      },
    }
    : {}),
});

test("Form 8960 line 10 additional modifications reduce net investment income", () => {
  const base = buildPending(f1040_2025.executeReturn(inputs(false)).pending)
    .form8960;
  const result = f1040_2025.executeReturn(inputs(true));
  assertEquals(result.diagnostics, []);
  const f8960 = buildPending(result.pending).form8960;
  assertEquals(base?.line12_net_investment_income, 10_000);
  assertEquals(f8960?.line10_additional_modifications, 1_500);
  assertEquals(f8960?.line11_total_deductions, 1_500);
  assertEquals(f8960?.line12_net_investment_income, 8_500);
  // Line 16 is the smaller of line 12 (8,500) and line 15 (MAGI over 200,000).
  assertEquals(f8960?.line17_niit, 323);
});
