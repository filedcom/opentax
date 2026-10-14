import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { reviewedEicDatedResidence } from "./eic-dated-residency.ts";
import { scheduleEicLine6Months } from "./eic-birth-residency.ts";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { eitcPdf } from "../../../../pdf/forms/credits/earned-income/eitc.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const period = (start: string, end: string) => ({
  start_date: start,
  end_date: end,
  record_reference: `Reviewed synthetic residence ${start}/${end}`,
  child_lived_with_filer_in_us_verified: true as const,
});
const child = {
  ssn: "111-22-3334",
  dob: "2017-06-15",
  months_in_home: 6,
  months_lived_with_you_in_us: 6,
  eic_dated_residency_review: {
    child_ssn: "111223334",
    residence_periods: [period("2025-07-02", "2025-12-31")],
  },
};
const fixture = pdfReviewFixtures.find((item) =>
  item.id === "single-w2-custodial-eic-release"
)!;
export function datedResidencyInputs(split = false, dependent = false) {
  const activeFixture = dependent
    ? pdfReviewFixtures.find((item) =>
      item.id === "single-w2-three-eic-children-with-reviewed-birth"
    )!
    : fixture;
  const general = activeFixture.inputs.general as Record<string, unknown>;
  const original = (general.dependents as Array<Record<string, unknown>>)[0];
  return {
    ...activeFixture.inputs,
    ...(dependent
      ? {
        f8812: (activeFixture.inputs.f8812 as Array<Record<string, unknown>>)
          .map((row) => ({ ...row, qualifying_children_count: 1 })),
      }
      : {}),
    general: {
      ...general,
      dependents: [{
        ...original,
        ...child,
        dependent_on_another_return: !dependent,
        custodial_eitc_release_review: dependent
          ? undefined
          : original.custodial_eitc_release_review,
        eic_dated_residency_review: {
          ...child.eic_dated_residency_review,
          residence_periods: split
            ? [
              period("2025-10-01", "2025-12-31"),
              period("2025-07-02", "2025-09-30"),
            ]
            : child.eic_dated_residency_review.residence_periods,
        },
      }],
    },
  };
}

Deno.test("dated EIC residence distinguishes183 from182days and prints7 while preserving6actualmonths", () => {
  assertEquals(reviewedEicDatedResidence(child), true);
  assertEquals(scheduleEicLine6Months(child), 7);
  for (
    const periods of [
      [period("2025-07-03", "2025-12-31")],
      [period("2025-01-01", "2025-06-30")],
      [period("2025-07-02", "2025-12-31"), period("2025-07-02", "2025-12-31")],
      [period("2025-07-02", "2025-09-30"), period("2025-09-30", "2025-12-31")],
      [period("2025-07-02", "2025-12-32")],
      [period("2025-12-31", "2025-07-02")],
    ]
  ) {
    assertThrows(() =>
      reviewedEicDatedResidence({
        ...child,
        eic_dated_residency_review: {
          ...child.eic_dated_residency_review,
          residence_periods: periods,
        },
      })
    );
  }
  assertThrows(() =>
    reviewedEicDatedResidence({ ...child, months_lived_with_you_in_us: 7 })
  );
  assertThrows(() =>
    reviewedEicDatedResidence({ ...child, months_in_home: 5 })
  );
  assertThrows(() => reviewedEicDatedResidence({ ...child, ssn: "999887777" }));
  assertThrows(() =>
    reviewedEicDatedResidence({ ...child, dob: "2025-01-01" })
  );
});

for (const dependent of [false, true]) {
  for (const split of [false, true]) {
    Deno.test(`dated EIC actual full native return ${dependent ? "dependent" : "custodial-release"}/${split ? "split" : "continuous"}`, async () => {
      const result = f1040_2025.executeReturn(
        datedResidencyInputs(split, dependent),
      );
      assertEquals(result.diagnostics, []);
      const pending = buildPending(result.pending);
      const filer = extractFilerIdentity(result.pending.f1040)!;
      assertEquals(pending.eitc?.qualifying_children, 1);
      const row = pending.eitc?.qualifying_child_details?.[0];
      assertEquals(row?.months_lived_with_you_in_us, 6);
      assertEquals(
        eitcPdf.projectFields?.(
          pending.eitc!,
          pending as unknown as Record<string, Record<string, unknown>>,
        )?.child1_us_months,
        7,
      );
      const xml = buildMefXml(pending, filer);
      assertStringIncludes(
        xml,
        "<MonthsChildLivedWithYouCnt>07</MonthsChildLivedWithYouCnt>",
      );
      const path = await Deno.makeTempFile({
        prefix: "opentax-eic-dated-",
        suffix: ".xml",
      });
      await Deno.writeTextFile(path, xml);
      console.log(`EIC_DATED_XML ${path}`);
      const schema = new URL(
        "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        import.meta.url,
      ).pathname;
      const validation = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
      for (
        const changed of [
          { ...pending, general: { ...pending.general, dependents: [] } },
          {
            ...pending,
            eitc: {
              ...pending.eitc,
              qualifying_child_details: [{
                ...row,
                eic_dated_residency_review: undefined,
              }],
            },
          },
          {
            ...pending,
            eitc: {
              ...pending.eitc,
              qualifying_child_details: [{
                ...row,
                eic_dated_residency_review: {
                  ...child.eic_dated_residency_review,
                  residence_periods: [period("2025-07-01", "2025-12-31")],
                },
              }],
            },
          },
        ]
      ) {
        assertThrows(() => buildMefXml(buildPending(changed), filer));
        await assertRejects(() => buildPdfBytes(changed, filer));
      }
    });
  }
}
