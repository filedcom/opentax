import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { inputSchema as schedule2Schema } from "../nodes/schedule2.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { form1062Fixture2026 } from "./form1062.fixture.ts";
import { form1062TaxSource2026Schema } from "./form1062-tax.ts";

export function form1062TaxFixture2026(
  graph: Record<string, unknown> = landGraphFixture2026(45000, [], 40000),
) {
  const execution = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    graph,
    { taxYear: 2026, formType: "f1040" },
  );
  if (execution.diagnostics.length) {
    throw new Error(JSON.stringify(execution.diagnostics));
  }
  const p = execution.pending;
  const source = (node: string) =>
    (p[node].calculation_2026 as { source_input: unknown }).source_input;
  const pick = (object: Record<string, unknown>, keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, object[key]]));
  const input = form1062TaxSource2026Schema.parse({
    election: form1062Fixture2026().election,
    income_tax: source("income_tax_calculation"),
    amt: source("form6251"),
    care: source("f2441"),
    education: source("f8863"),
    child: source("f8812"),
    ...(graph.schedule_r ? { schedule_r: source("schedule_r") } : {}),
    schedule2: pick(p.schedule2, Object.keys(schedule2Schema.shape)),
    return_lines: pick(
      p.f1040,
      Object.keys(form1062TaxSource2026Schema.shape.return_lines.shape),
    ),
    review: {
      record_reference: "synthetic-form1062-tax-scope",
      no_other_regular_tax_additions_or_tax_methods: true,
      ...(graph.schedule_r
        ? {
          no_credits_other_than_care_education_child_energy_and_schedule_r:
            true,
        }
        : { no_credits_other_than_care_education_child_and_energy: true }),
    },
  });
  return { input, execution, graph };
}
