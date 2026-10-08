import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { eitcPdf } from "../../../pdf/forms/credits/eitc.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";

const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-custodial-eic-release"
);
if (!fixture) throw new Error("Missing Schedule EIC source fixture");
const plan = buildExecutionPlan(registry);
const threeChildFixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-three-eic-children-with-reviewed-birth"
);
if (!threeChildFixture) {
  throw new Error("Missing three-child EIC source fixture");
}

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
    "Schedule EIC child roster differs from reviewed general source",
  );
  await assertRejects(
    () => buildPdfBytes(tampered, fixture.filer),
    Error,
    "Schedule EIC child roster differs from reviewed general source",
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

Deno.test("reviewed December birth survives three-child source, native XML, and filled PDF", async () => {
  const result = execute(plan, registry, { ...threeChildFixture.inputs }, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.eitc?.qualifying_children, 3);
  assertEquals(
    pending.eitc?.qualifying_child_details?.map((child) =>
      child.months_lived_with_you_in_us
    ),
    [12, 8, 1],
  );
  const projected = eitcPdf.projectFields?.(
    pending.eitc!,
    pending as unknown as Record<string, Record<string, unknown>>,
  );
  assertEquals([
    projected?.child1_us_months,
    projected?.child2_us_months,
    projected?.child3_us_months,
  ], [12, 8, 12]);
  const xml = buildMefXml(pending, threeChildFixture.filer);
  assertEquals((xml.match(/<QualifyingChildInformation>/g) ?? []).length, 3);
  assertEquals(
    [...xml.matchAll(
      /<MonthsChildLivedWithYouCnt>(\d+)<\/MonthsChildLivedWithYouCnt>/g,
    )]
      .map((match) => match[1]),
    ["12", "08", "12"],
  );
  assertStringIncludes(
    xml,
    "<ChldWhoLivedWithYouCnt>3</ChldWhoLivedWithYouCnt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(
      pending.f1040!,
      pending as unknown as Record<string, Record<string, unknown>>,
    )?.dependent_2_home,
    true,
  );
  const pdf = await buildPdfBytes(pending, threeChildFixture.filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
});

Deno.test("reviewed partial-life birth prints 12 on Schedule EIC in native and PDF", async () => {
  const general = threeChildFixture.inputs.general as Record<string, unknown>;
  const dependents = general.dependents as Array<Record<string, unknown>>;
  const partiallyResident = {
    ...dependents[2],
    eic_birth_residency_review: {
      birth_record_reference: "Synthetic December 2025 birth certificate",
      us_home_residence_record_reference:
        "Synthetic December 10-31, 2025 U.S. home record",
      us_home_residence_start_date: "2025-12-10",
      us_home_residence_end_date: "2025-12-31",
      alive_on_2025_12_31_verified: true,
    },
  };
  const inputs = {
    ...threeChildFixture.inputs,
    general: {
      ...general,
      dependents: [...dependents.slice(0, 2), partiallyResident],
    },
  };
  const result = execute(plan, registry, inputs, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.eitc?.qualifying_children, 3);
  assertEquals(
    pending.eitc?.qualifying_child_details?.[2]?.months_lived_with_you_in_us,
    1,
  );
  const xml = buildMefXml(pending, threeChildFixture.filer);
  assertEquals(
    [...xml.matchAll(
      /<MonthsChildLivedWithYouCnt>(\d+)<\/MonthsChildLivedWithYouCnt>/g,
    )]
      .map((match) => match[1]),
    ["12", "08", "12"],
  );
  assertEquals(
    eitcPdf.projectFields?.(
      pending.eitc!,
      pending as unknown as Record<string, Record<string, unknown>>,
    )?.child3_us_months,
    12,
  );
  const pdf = await buildPdfBytes(pending, threeChildFixture.filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");

  for (
    const [start, end] of [
      ["2025-12-18", "2025-12-31"],
      ["2025-11-30", "2025-12-31"],
      ["2025-12-10", "2025-12-32"],
    ]
  ) {
    const invalid = execute(plan, registry, {
      ...inputs,
      general: {
        ...inputs.general,
        dependents: [...dependents.slice(0, 2), {
          ...partiallyResident,
          eic_birth_residency_review: {
            ...partiallyResident.eic_birth_residency_review,
            us_home_residence_start_date: start,
            us_home_residence_end_date: end,
          },
        }],
      },
    }, { taxYear: 2025, formType: "f1040" });
    assertEquals(invalid.diagnostics.length > 0, true);
  }

  const changed = {
    ...pending,
    eitc: {
      ...pending.eitc,
      qualifying_child_details: pending.eitc?.qualifying_child_details?.map(
        (child, index) =>
          index === 2
            ? {
              ...child,
              eic_birth_residency_review: {
                ...partiallyResident.eic_birth_residency_review,
                us_home_residence_start_date: "2025-12-09",
              },
            }
            : child,
      ),
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changed), threeChildFixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
  await assertRejects(
    () => buildPdfBytes(changed, threeChildFixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
});

Deno.test("Schedule EIC rejects repeated identity and unsupported birth residence", () => {
  const input = threeChildFixture.inputs;
  const general = input.general as Record<string, unknown>;
  const deps = general.dependents as Array<Record<string, unknown>>;
  const run = (dependents: Array<Record<string, unknown>>) =>
    execute(
      plan,
      registry,
      { ...input, general: { ...general, dependents } },
      { taxYear: 2025, formType: "f1040" },
    );
  const duplicated = run([deps[0], { ...deps[1], ssn: deps[0].ssn }, deps[2]]);
  assertStringIncludes(
    JSON.stringify(duplicated.diagnostics),
    "Form 8962 claimed dependents need distinct SSNs",
  );
  const fabricated = run([deps[0], deps[1], {
    ...deps[2],
    eic_birth_residency_review: undefined,
    months_in_home: 12,
    months_lived_with_you_in_us: 12,
  }]);
  assertStringIncludes(
    JSON.stringify(fabricated.diagnostics),
    "2025 birth months exceed possible calendar residence",
  );
  const unreviewed = run([deps[0], deps[1], {
    ...deps[2],
    eic_birth_residency_review: undefined,
  }]);
  assertStringIncludes(
    JSON.stringify(unreviewed.diagnostics),
    "EIC 2025 birth needs reviewed residence",
  );
  const inconsistent = run([deps[0], deps[1], {
    ...deps[2],
    months_lived_with_you_in_us: 0,
  }]);
  assertStringIncludes(
    JSON.stringify(inconsistent.diagnostics),
    "needs U.S. home for every 2025 birth month",
  );
});

Deno.test("Schedule EIC export rejects a changed birth review after calculation", async () => {
  const result = execute(plan, registry, { ...threeChildFixture.inputs }, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const children = pending.eitc?.qualifying_child_details ?? [];
  const changed = {
    ...pending,
    eitc: {
      ...pending.eitc,
      qualifying_child_details: children.map((child, index) =>
        index === 2
          ? { ...child, eic_birth_residency_review: undefined }
          : child
      ),
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(changed), threeChildFixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
  await assertRejects(
    () => buildPdfBytes(changed, threeChildFixture.filer),
    Error,
    "Schedule EIC child differs from reviewed general source",
  );
});
