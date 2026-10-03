import { assertEquals } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";

// These source/attachment cases are intentionally guarded before standalone
// XML export. Keep exclusions explicit so a newly guarded fixture cannot
// silently shrink the replay audit.
const guardedFixtureIds = new Set([
  "single-8862-ctc-reinstatement",
  "single-withheld-w2g",
  "single-new-markets-business-credit",
  "single-long-name-new-markets-investment",
  "single-two-new-markets-investments",
  "single-six-new-markets-investments",
  "single-seven-new-markets-investments",
  "single-twenty-four-new-markets-investments",
  "single-geothermal-and-new-markets-credits",
  "single-partnership-code-k-and-w2g",
  "single-form8824-section1231-exchange",
  "single-form461-schedule-c-excess-business-loss",
]);
const calculatedKeys = [
  "f1040",
  "schedule1",
  "schedule2",
  "schedule3",
] as const;

// ReturnTs is generated at assembly time and can tick between two builds.
// Normalize only that clock value; every actual return/document field remains
// in the comparison.
function stableXml(xml: string): string {
  return xml.replace(
    /<ReturnTs>[^<]*<\/ReturnTs>/,
    "<ReturnTs>FIXED</ReturnTs>",
  );
}

Deno.test("calculated Form 1040 and Schedule 1-3 amounts cannot change native XML without source replay", () => {
  const plan = buildExecutionPlan(registry);
  const seen = new Set<string>();
  let checkedFixtures = 0;
  let checkedAmounts = 0;
  for (const fixture of pdfReviewFixtures) {
    if (seen.has(fixture.id)) throw new Error(`Repeated fixture ${fixture.id}`);
    seen.add(fixture.id);
    const result = execute(plan, registry, fixture.inputs, {
      taxYear: 2025,
      formType: "f1040",
    });
    if (result.diagnostics.length > 0) {
      if (!guardedFixtureIds.has(fixture.id)) {
        throw new Error(`${fixture.id} has unexpected graph diagnostics`);
      }
      continue;
    }
    const pending = buildPending(result.pending);
    let baseline: string;
    try {
      baseline = stableXml(buildMefXml(pending, fixture.filer));
    } catch (error) {
      if (!guardedFixtureIds.has(fixture.id)) {
        throw new Error(`${fixture.id} unexpectedly cannot export XML`, {
          cause: error,
        });
      }
      continue;
    }
    if (guardedFixtureIds.has(fixture.id)) {
      throw new Error(`${fixture.id} no longer needs its declared guard`);
    }
    checkedFixtures++;
    for (const formKey of calculatedKeys) {
      const fields = pending[formKey] as Record<string, unknown> | undefined;
      if (!fields) continue;
      for (const [fieldKey, value] of Object.entries(fields)) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        checkedAmounts++;
        const changed = structuredClone(pending);
        (changed[formKey] as Record<string, unknown>)[fieldKey] = value + 1;
        let alteredXml: string;
        try {
          alteredXml = stableXml(buildMefXml(changed, fixture.filer));
        } catch {
          // Rejection by a source, calculation, or filing guard is expected.
          continue;
        }
        assertEquals(
          alteredXml,
          baseline,
          `${fixture.id} accepted changed ${formKey}.${fieldKey} into XML`,
        );
      }
    }
  }
  assertEquals(
    checkedFixtures,
    pdfReviewFixtures.length - guardedFixtureIds.size,
  );
  assertEquals(
    guardedFixtureIds.size,
    [...guardedFixtureIds].filter((id) => seen.has(id)).length,
  );
  if (checkedAmounts === 0) {
    throw new Error("Calculated replay audit had no numeric probes");
  }
});
