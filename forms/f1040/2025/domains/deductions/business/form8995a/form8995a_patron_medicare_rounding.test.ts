import { test } from "bun:test";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8995aPdf } from "../../../../pdf/forms/deductions/business/f8995a.ts";
import { patronWageFixture } from "./form8995a_patron_wages_fixture.ts";
import { independentPatronFixture } from "../../../../pdf/reviews/general/composed-returns/review-8995a-independent-patron.fixture.ts";

// Untrusted persisted values are deliberately altered to exercise export guards.
type Row = Record<string, any>;

for (const [offset, expected] of [[-1, 931], [0, 932], [1, 932]]) {
  for (const route of ["wages", "independent-se"] as const) {
    test(`Patron ${route} Medicare exact-half boundary ${offset}`, async () => {
      const input = route === "wages"
        ? patronWageFixture({ status: "mfs", kind: "farm", name: "mfs-farm" })
        : independentPatronFixture("below").inputs;
      if (route === "wages") {
        const wage = input.w2[0];
        const salary = 228500 + offset;
        Object.assign(wage, {
          box1_wages: salary,
          box3_ss_wages: 176100,
          box4_ss_withheld: 10918.2,
          box5_medicare_wages: salary,
          box6_medicare_withheld:
            Math.round((salary * 145 + (salary - 200000) * 90) / 100) / 100,
        });
        input.qbi_patron.primary_w2_sources = [structuredClone(wage)];
      } else {
        // 150,000 + (232,783 +/- 1) profit gives combined rounded Schedule SE
        // earnings 353,500 +/- 1; MFJ threshold 250,000 leaves 103,500 +/- 1.
        input.schedule_f.schedule_fs[1].line2_sales_products_raised = 142783 +
          offset;
      }
      const result = f1040_2025.executeReturn(input);
      assertEquals(result.diagnostics, []);
      const p = result.pending;
      const taxField = route === "wages" ? "line7_wage_tax" : "line13_se_tax";
      const excessField = route === "wages"
        ? "line6_wage_excess"
        : "line12_se_excess";
      assertEquals(p.form8959[excessField], 103500 + offset);
      assertEquals(p.form8959[taxField], expected);
      const filer = extractFilerIdentity(p.f1040)!;
      const prepared = await f1040_2025.prepareReturn(p, filer);
      form8995aPdf.projectFields!(
        prepared.bundle.pending.form8995a as Record<string, unknown>,
        prepared.bundle.pending as Row,
      );
      assertEquals(
        p.schedule2.line11_additional_medicare,
        p.form8959.line18_total_tax,
      );
      const changed: Row = structuredClone(prepared.bundle.pending);
      changed.form8959[taxField] = expected - 1;
      changed.form8959.line18_total_tax--;
      changed.schedule2.line11_additional_medicare--;
      changed.f1040.line24_total_tax--;
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      assertThrows(() =>
        form8995aPdf.projectFields!(changed.form8995a, changed)
      );
    });
  }
}
