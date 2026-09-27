import { assertEquals } from "@std/assert";
import { CONFIG_BY_YEAR } from "../../../config/index.ts";
import { FPL_2026 } from "../../../config/2026-ptc.ts";
import type { F1040Config } from "../../../config/types.ts";
import { FilingStatus } from "../../../types.ts";
import { form8962 } from "./index.ts";

Deno.test("TY2026 Form 8962 applies the 400% FPL cliff and full APTC repayment", () => {
  // Form 8962 only reads FPL fields from F1040Config. This deliberately
  // incomplete test config will fail if the node begins to read other fields.
  // No 2026 product config is registered by this test.
  CONFIG_BY_YEAR[2026] = {
    fplBase: FPL_2026.contiguous.base,
    fplIncrement: FPL_2026.contiguous.increment,
    fplAlaskaBase: FPL_2026.alaska.base,
    fplAlaskaIncrement: FPL_2026.alaska.increment,
    fplHawaiiBase: FPL_2026.hawaii.base,
    fplHawaiiIncrement: FPL_2026.hawaii.increment,
  } as F1040Config;
  try {
    const common = {
      household_size: 1,
      fpl_region: "contiguous" as const,
      filing_status: FilingStatus.Single,
      dependent_income_complete: true,
      annual_premium: 5_000,
      annual_slcsp: 10_000,
      annual_aptc: 3_000,
      annual_line11_eligible: true,
    };
    const context = { taxYear: 2026, formType: "f1040" as const };
    const at400 = form8962.compute(context, {
      ...common,
      taxpayer_modified_agi: 62_600,
    });
    const at401 = form8962.compute(context, {
      ...common,
      taxpayer_modified_agi: 62_601,
    });
    const formAt400 = at400.outputs.find((item) => item.nodeType === "form8962")
      ?.fields;
    const formAt401 = at401.outputs.find((item) => item.nodeType === "form8962")
      ?.fields;
    assertEquals(formAt400?.federal_poverty_line, 15_650);
    assertEquals(formAt400?.federal_poverty_pct, 400);
    assertEquals(formAt400?.applicable_figure, 0.0996);
    assertEquals(formAt400?.net_premium_tax_credit, 765);
    assertEquals(formAt401?.federal_poverty_pct, 401);
    assertEquals(formAt401?.total_premium_tax_credit, 0);
    assertEquals(formAt401?.excess_advance_payment, 3_000);
    assertEquals(formAt401?.repayment_limitation, undefined);
    assertEquals(formAt401?.excess_advance_premium, undefined);
    assertEquals(
      at401.outputs.find((item) => item.nodeType === "schedule2")?.fields
        .line1a_excess_advance_premium,
      3_000,
    );
    for (
      const [region, householdIncome, expectedFpl] of [
        ["alaska", 19_550, 19_550],
        ["hawaii", 17_990, 17_990],
      ] as const
    ) {
      const regional = form8962.compute(context, {
        ...common,
        fpl_region: region,
        taxpayer_modified_agi: householdIncome,
      });
      assertEquals(
        regional.outputs.find((item) => item.nodeType === "form8962")?.fields
          .federal_poverty_line,
        expectedFpl,
      );
    }
  } finally {
    delete CONFIG_BY_YEAR[2026];
  }
});
