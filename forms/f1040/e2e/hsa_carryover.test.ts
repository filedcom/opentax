import { assertEquals } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";
import { CoverageType } from "../nodes/intermediate/forms/form8889/index.ts";

const plan = buildExecutionPlan(registry);

Deno.test("TY2025 HSA prior excess reaches Form 8889, Form 5329, and Schedule 2 once", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Jane",
      taxpayer_last_name: "Doe",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [{
      box1_wages: 50_000,
      box2_fed_withheld: 4_000,
      box3_ss_wages: 50_000,
      box4_ss_withheld: 3_100,
      box5_medicare_wages: 50_000,
      box6_medicare_withheld: 725,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    form8889: {
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      last_month_rule_elected: false,
      taxpayer_hsa_contributions: 3_800,
      prior_year_hsa_excess: {
        form5329_line48: 2_000,
        form5329_line49: 120,
      },
      hsa_december_31_value: 4_000,
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form8889?.print_line13_deduction, 4_300);
  assertEquals(result.pending.form5329?.print_hsa_line42, 2_000);
  assertEquals(result.pending.form5329?.print_hsa_line43, 500);
  assertEquals(result.pending.form5329?.print_hsa_line46, 1_500);
  assertEquals(result.pending.form5329?.print_hsa_line48, 1_500);
  assertEquals(result.pending.form5329?.print_hsa_line49, 90);
  assertEquals(result.pending.schedule1?.line13_hsa_deduction, 4_300);
  assertEquals(result.pending.schedule2?.line8_form5329_tax, 90);
  assertEquals(result.pending.agi_aggregator?.line13_hsa_deduction, 4_300);
});
