import { assertEquals } from "@std/assert";
import { buildMefBundle, buildMefXml } from "./mef/builder.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

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

Deno.test("calculated Form 1040 and Schedule 1-3 amounts cannot change native XML without source replay", async () => {
  const seen = new Set<string>();
  let checkedFixtures = 0;
  let checkedAmounts = 0;
  for (const fixture of pdfReviewFixtures) {
    if (seen.has(fixture.id)) throw new Error(`Repeated fixture ${fixture.id}`);
    seen.add(fixture.id);
    const result = f1040_2025.executeReturn(fixture.inputs);
    if (result.diagnostics.length > 0) {
      if (!guardedFixtureIds.has(fixture.id)) {
        throw new Error(`${fixture.id} has unexpected graph diagnostics`);
      }
      continue;
    }
    const pending = buildPending(result.pending);
    // Reviewed attachment claims must use their retained bytes, just like the
    // held source review generator. Keep every numerical tamper probe active.
    const fixtureXml = async (data: typeof pending) =>
      fixture.attachments?.length
        ? (await buildMefBundle(data, {
          filer: fixture.filer,
          attachments: fixture.attachments,
        })).xml
        : buildMefXml(data, fixture.filer);
    let baseline: string;
    try {
      baseline = stableXml(await fixtureXml(pending));
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
          alteredXml = stableXml(await fixtureXml(changed));
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
