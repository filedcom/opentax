import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "./registry.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { eitcPdf } from "./pdf/forms/eitc.ts";

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
  const child = pending.eitc?.qualifying_child_details?.[0];
  if (!child) throw new Error("Missing calculated EIC child");
  assertEquals(child.ssn, "111-22-3334");
  assertEquals(child.months_in_home, 12);
  assertEquals(child.months_lived_with_you_in_us, 12);
  const [source] = pending.general?.dependents as Array<
    Record<string, unknown>
  >;
  if (!source) throw new Error("Missing reviewed dependent source");
  assertEquals(source.lived_in_us_over_half_year, true);
  assertEquals(source.months_lived_with_you_in_us, 12);

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

Deno.test("Schedule EIC line 6 uses exact U.S. months through calculation, native and PDF", async () => {
  const general = fixture.inputs.general as Record<string, unknown>;
  const [childSource] = general.dependents as Array<Record<string, unknown>>;
  if (!childSource) throw new Error("Missing EIC child source");
  const result = execute(plan, registry, {
    ...fixture.inputs,
    general: {
      ...general,
      dependents: [{ ...childSource, months_lived_with_you_in_us: 8 }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const child = pending.eitc?.qualifying_child_details?.[0];
  if (!child) throw new Error("Missing calculated EIC child");
  assertEquals(child.months_in_home, 12);
  assertEquals(child.months_lived_with_you_in_us, 8);
  assertStringIncludes(
    buildMefXml(pending, fixture.filer),
    "<MonthsChildLivedWithYouCnt>08</MonthsChildLivedWithYouCnt>",
  );
  assertEquals(
    eitcPdf.projectFields?.(
      pending.eitc!,
      pending as unknown as Record<string, Record<string, unknown>>,
    )?.child1_us_months,
    8,
  );
  const tampered = {
    ...pending,
    general: {
      ...pending.general,
      dependents: [{ ...childSource, months_lived_with_you_in_us: 9 }],
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
