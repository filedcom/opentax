import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../../scripts/support/sys.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  reviewedEicBirthResidence,
  scheduleEicLine6Months,
} from "./eic-birth-residency.ts";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { eitcPdf } from "../../../../pdf/forms/credits/earned-income/eitc.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { shiftDatedFacts } from "../../../../../../../scripts/testing/sample-year.ts";
const period = (start: string, end: string) => ({
  start_date: start,
  end_date: end,
  record_reference: `Synthetic reviewed home ${start}/${end}`,
  child_lived_with_filer_in_us_verified: true as const,
});
export const birthPeriodCases = [
  {
    id: "december21",
    dob: "2025-12-01",
    months: 1,
    periods: [
      period("2025-12-01", "2025-12-10"),
      period("2025-12-21", "2025-12-31"),
    ],
  },
  {
    id: "december16",
    dob: "2025-12-01",
    months: 1,
    periods: [
      period("2025-12-24", "2025-12-31"),
      period("2025-12-01", "2025-12-08"),
    ],
  },
  {
    id: "november32",
    dob: "2025-11-01",
    months: 2,
    periods: [
      period("2025-11-01", "2025-11-15"),
      period("2025-12-15", "2025-12-31"),
    ],
  },
];
const child = (c: typeof birthPeriodCases[number]) => ({
  dob: c.dob,
  months_in_home: c.months,
  months_lived_with_you_in_us: c.months,
  eic_birth_residency_review: {
    birth_record_reference: `Synthetic birth ${c.dob}`,
    us_home_residence_periods: c.periods,
    alive_at_year_end_verified: true as const,
  },
});
export function birthPeriodInputs(index: number) {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-three-eic-children-with-reviewed-birth"
  )!;
  const general = fixture.inputs.general as Record<string, unknown>;
  const deps = general.dependents as Array<Record<string, unknown>>;
  return {
    ...fixture.inputs,
    general: {
      ...general,
      dependents: [...deps.slice(0, 2), {
        ...deps[2],
        ...child(birthPeriodCases[index]),
      }],
    },
  };
}
test("multiple birth home periods conserve actual days/months and reject false half-life claims", () => {
  const base = child(birthPeriodCases[0]);
  for (const c of birthPeriodCases) {
    assertEquals(reviewedEicBirthResidence(child(c), 2025), true);
    assertEquals(scheduleEicLine6Months(child(c), 2025), 12);
  }
  for (
    const periods of [
      [period("2025-12-01", "2025-12-07"), period("2025-12-24", "2025-12-31")],
      [period("2025-12-01", "2025-12-10"), period("2025-12-08", "2025-12-15")],
      [period("2025-12-01", "2025-12-10"), period("2025-12-01", "2025-12-10")],
      [period("2025-11-30", "2025-12-31")],
      [period("2025-12-01", "2025-12-32")],
    ]
  ) {
    assertThrows(() =>
      reviewedEicBirthResidence({
        ...base,
        eic_birth_residency_review: {
          ...base.eic_birth_residency_review,
          us_home_residence_periods: periods,
        },
      }, 2025)
    );
  }
  assertThrows(() =>
    reviewedEicBirthResidence({ ...base, months_lived_with_you_in_us: 2 }, 2025)
  );
  assertThrows(() => reviewedEicBirthResidence({ ...base, months_in_home: 2 }, 2025));
  assertThrows(() => reviewedEicBirthResidence({ ...base, dob: "2025-02-30" }, 2025));
});
// Pub. 596 (2025 and 2026), Rule 10: a child born during the year who lived
// with the filer in the United States for more than half of the time alive
// meets the residency test. The review is read against the return year.
test("birth home periods are reviewed against the return year", () => {
  for (const c of birthPeriodCases) {
    const in2026 = shiftDatedFacts(child(c), 1);
    assertEquals(reviewedEicBirthResidence(in2026, 2026), true);
    assertEquals(scheduleEicLine6Months(in2026, 2026), 12);
    assertThrows(() => reviewedEicBirthResidence(child(c), 2026));
  }
  const crossesYear = shiftDatedFacts(child(birthPeriodCases[0]), 1);
  assertThrows(() =>
    reviewedEicBirthResidence({
      ...crossesYear,
      eic_birth_residency_review: {
        ...crossesYear.eic_birth_residency_review,
        us_home_residence_periods: [period("2026-12-01", "2027-01-10")],
      },
    }, 2026)
  );
});
for (let index = 0; index < birthPeriodCases.length; index++) {
  test(`birth periods full native/source joins ${birthPeriodCases[index].id}`, async () => {
    const result = f1040_2025.executeReturn(birthPeriodInputs(index));
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    assertEquals(pending.eitc?.qualifying_children, 3);
    assertEquals(
      pending.eitc?.qualifying_child_details?.[2]?.months_lived_with_you_in_us,
      birthPeriodCases[index].months,
    );
    assertEquals(
      eitcPdf.projectFields?.(
        pending.eitc!,
        pending as unknown as Record<string, Record<string, unknown>>,
      )?.child3_us_months,
      12,
    );
    const xml = buildMefXml(pending, filer);
    assertStringIncludes(
      xml,
      "<MonthsChildLivedWithYouCnt>12</MonthsChildLivedWithYouCnt>",
    );
    const path = await sys.makeTempFile({
      prefix: "opentax-eic-birth-periods-",
      suffix: ".xml",
    });
    await fs.writeFile(path, xml);
    console.log(`EIC_BIRTH_PERIODS_XML ${path}`);
    const schema = new URL(
      "../../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const validation = await new sys.Command("xmllint", {
      args: ["--noout", "--schema", schema, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    const changed = structuredClone(pending);
    const row = changed.eitc!.qualifying_child_details![2];
    row.eic_birth_residency_review = undefined;
    assertThrows(() => buildMefXml(buildPending(changed), filer));
    await assertRejects(() => buildPdfBytes(changed, filer));
    const sourceChanged = structuredClone(pending) as any;
    sourceChanged.general.dependents[2].eic_birth_residency_review
      .us_home_residence_periods[0].record_reference = "Changed source review";
    assertThrows(() => buildMefXml(buildPending(sourceChanged), filer));
    await assertRejects(() => buildPdfBytes(sourceChanged, filer));
  });
}
