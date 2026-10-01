import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-custodial-eic-release"
);
if (!fixture) throw new Error("Missing Schedule EIC source fixture");
const plan = buildExecutionPlan(registry);

Deno.test("Schedule EIC US residency survives calculation and both export preflights", async () => {
  const result = execute(plan, registry, { ...fixture.inputs }, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const credit = pending.f1040?.line27_eitc;
  assertEquals(typeof credit === "number" && credit > 0, true);
  const [child] = pending.eitc?.qualifying_child_details as Array<
    Record<string, unknown>
  >;
  if (!child) throw new Error("Missing calculated EIC child");
  assertEquals(child.ssn, "111-22-3334");
  assertEquals(child.months_in_home, 12);
  const [source] = pending.general?.dependents as Array<
    Record<string, unknown>
  >;
  if (!source) throw new Error("Missing reviewed dependent source");
  assertEquals(source.lived_in_us_over_half_year, true);

  const tampered = {
    ...pending,
    general: {
      ...pending.general,
      dependents: [{ ...source, lived_in_us_over_half_year: false }],
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), fixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
  await assertRejects(
    () => buildPdfBytes(tampered, fixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
});
