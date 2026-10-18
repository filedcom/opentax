import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { config2025 } from "../../../../../config/2025.ts";
import { config2026 } from "../../../../../config/2026.ts";
import { lookupEic2025 } from "./table_2025.ts";
import { lookupEicFromParameters } from "./table.ts";
import { eitc } from "./index.ts";
import { FilingStatus } from "../../../../../types.ts";

// The method is checked against every whole-dollar amount of the published
// TY2025 EIC Table (Pub. 1040 (2025)), every column and footnote.
test("the $50-row EIC method reproduces the published TY2025 table", () => {
  const mismatches: string[] = [];
  for (const joint of [false, true]) {
    for (let children = 0; children <= 3; children++) {
      for (let amount = 0; amount <= 70_000; amount++) {
        const derived = lookupEicFromParameters(
          config2025.eitcByChildren,
          amount,
          children,
          joint,
        );
        const published = lookupEic2025(amount, children, joint);
        if (derived !== published) {
          mismatches.push(`${joint}/${children}/${amount}`);
        }
      }
    }
  }
  assertEquals(mismatches, []);
});

// Rev. Proc. 2025-32 §4.06(1): 2026 maximum credits $664, $4,427, $7,316 and
// $8,231, earned income amounts $8,680, $13,020 and $18,290, and completed
// phaseout amounts $19,540 / $51,593 / $58,629 / $62,974 ($26,820 / $58,863 /
// $65,899 / $70,244 joint).
test("the TY2026 EIC table follows the Rev. Proc. 2025-32 amounts", () => {
  const table = config2026.eitcByChildren;
  assertEquals(lookupEicFromParameters(table, 15_000, 1, false), 4_427);
  assertEquals(lookupEicFromParameters(table, 20_000, 2, false), 7_316);
  assertEquals(lookupEicFromParameters(table, 20_000, 3, true), 8_231);
  assertEquals(lookupEicFromParameters(table, 9_000, 0, false), 664);
  // Row $10,000-$10,050: 34% of the $10,025 midpoint, $3,408.50.
  assertEquals(lookupEicFromParameters(table, 10_010, 1, false), 3_409);
  for (const [children, end, endJoint] of [
    [0, 19_540, 26_820],
    [1, 51_593, 58_863],
    [2, 58_629, 65_899],
    [3, 62_974, 70_244],
  ]) {
    assertEquals(lookupEicFromParameters(table, end, children, false), 0);
    assertEquals(lookupEicFromParameters(table, endJoint, children, true), 0);
    assertEquals(
      lookupEicFromParameters(table, end - 1, children, false) > 0,
      true,
    );
  }
});

// Rev. Proc. 2025-32 §4.06(1): one child, $23,890 phaseout start. AGI of
// $30,000 is looked up because it is at least the start amount:
// $4,427 - 15.98% x ($30,025 - $23,890) = $3,446.63.
test("a TY2026 EIC computes from the 2026 table and AGI threshold", () => {
  const result = eitc.compute({ taxYear: 2026, formType: "f1040" }, {
    earned_income: 20_000,
    agi: 30_000,
    qualifying_children: 1,
    filing_status: FilingStatus.Single,
    filer_has_valid_ssns: true,
    child_eic_filer_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      relationship_age_residence_record_reference: "Synthetic review",
    },
    prior_eic_disallowance_review: {
      status: "none",
      irs_account_record_reference: "Synthetic transcript",
      no_nonclerical_disallowance_since_1996_verified: true,
    },
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference: "Synthetic status",
    },
  });
  const line27 = result.outputs.find((o) => o.nodeType === "f1040");
  assertEquals(
    (line27?.fields as Record<string, unknown>).line27_eitc,
    3_447,
  );
});
