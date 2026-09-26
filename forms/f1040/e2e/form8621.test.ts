import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../nodes/inputs/f8621/excess_distribution.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("E2E: Form 8621 sends prior PFIC-year tax to 1040 line 16 and interest to Schedule 2 line 17p", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    f8621: {
      f8621s: [{
        company_name: "Offshore Fund Ltd",
        company_ein_or_ref: "FUND001",
        country_of_incorporation: "Ireland",
        regime: PficRegime.EXCESS_DISTRIBUTION,
        shares_owned: 100,
        fmv_at_year_end: 10_000,
        excess_events: [{
          kind: ExcessEventKind.Distribution,
          amount_usd: 10_000,
          holding_period_explanation:
            "Held from January 1 2017 through December 31 2025; allocated by days",
          allocations: [
            {
              tax_year: 2017,
              allocated_amount: 2_000,
              pfic_year: true,
              interest_charge: 150,
            },
            {
              tax_year: 2022,
              allocated_amount: 3_000,
              pfic_year: true,
              interest_charge: 80,
            },
            { tax_year: 2025, allocated_amount: 5_000, pfic_year: true },
          ],
        }],
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_other, 5_000);
  assertEquals(result.pending.f1040?.line16_income_tax, 1_902);
  assertEquals(result.pending.f1040?.form8621_tax, 1_902);
  assertEquals(result.pending.schedule2?.line17p_form8621_interest, 230);
  assertEquals(result.pending.f1040?.line23_other_taxes, 230);
  assertEquals(result.pending.f1040?.line24_total_tax, 2_132);
  assertEquals((result.pending.form8621?.items ?? []).length, 1);
});
