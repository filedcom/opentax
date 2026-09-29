import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import {
  calculateSection1291Interest,
  ExcessEventKind,
} from "../nodes/inputs/f8621/excess_distribution.ts";
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
    f8621: [{
      company_name: "Offshore Fund Ltd",
      company_ein_or_ref: "FUND001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.EXCESS_DISTRIBUTION,
      shares_owned: 100,
      fmv_at_year_end: 10_000,
      excess_events: [{
        kind: ExcessEventKind.Distribution,
        holding_period_start: "2024-01-01",
        first_pfic_tax_year: 2024,
        shares_in_block: 100,
        prior_year_distributions: [{ tax_year: 2024, amount_usd: 0 }],
        current_year_distributions: [{
          date: "2025-12-31",
          amount_usd: 10_000,
          year_charges: [],
        }],
        taxable_nonexcess_dividend_usd: 0,
      }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8z_form8621_section1291, 4_993);
  assertEquals(result.pending.f1040?.line16_income_tax, 1_853);
  assertEquals(result.pending.f1040?.form8621_tax, 1_853);
  const interest = Math.round(
    calculateSection1291Interest(2024, 5_006.84 * 0.37),
  );
  assertEquals(result.pending.schedule2?.line17p_form8621_interest, interest);
  assertEquals(result.pending.f1040?.line23_other_taxes, interest);
  assertEquals(result.pending.f1040?.line24_total_tax, 1_853 + interest);
  assertEquals(
    (result.pending.form8621?.items as unknown[] | undefined)?.length,
    1,
  );
});

Deno.test("E2E: Form 8621 separates excess income from section 301 nonexcess dividends", () => {
  const result = execute(plan, registry, {
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
    },
    f8621: [{
      company_name: "Offshore Fund Ltd",
      company_ein_or_ref: "FUND001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.EXCESS_DISTRIBUTION,
      shares_owned: 100,
      fmv_at_year_end: 10_000,
      excess_events: [{
        kind: ExcessEventKind.Distribution,
        holding_period_start: "2024-01-01",
        first_pfic_tax_year: 2024,
        shares_in_block: 100,
        prior_year_distributions: [{ tax_year: 2024, amount_usd: 4_000 }],
        current_year_distributions: [{
          date: "2025-12-31",
          amount_usd: 10_000,
          year_charges: [],
        }],
        taxable_nonexcess_dividend_usd: 5_000,
      }],
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 5_000);
  assertEquals(result.pending.schedule1?.line8z_form8621_section1291, 2_497);
  assertEquals(result.pending.form8960?.line2_ordinary_dividends, 5_000);
});
