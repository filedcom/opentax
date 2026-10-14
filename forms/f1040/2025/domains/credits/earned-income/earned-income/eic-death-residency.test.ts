import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { reviewedEicDeathResidence } from "./eic-death-residency.ts";
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
  record_reference: `Synthetic reviewed actual home ${start}/${end}`,
  child_lived_with_filer_in_us_verified: true as const,
});
export const deathResidencyCases = [
  {
    id: "older-february-boundary",
    index: 0,
    dob: "2017-06-15",
    death: "2025-02-28",
    ssn: "111223334",
    months: 1,
    periods: [period("2025-01-01", "2025-01-30")],
  },
  {
    id: "born-died-six-of-ten",
    index: 2,
    dob: "2025-12-01",
    death: "2025-12-10",
    ssn: "111223336",
    months: 1,
    periods: [period("2025-12-01", "2025-12-06")],
  },
  {
    id: "born-died-separated",
    index: 2,
    dob: "2025-12-01",
    death: "2025-12-31",
    ssn: "111223336",
    months: 1,
    periods: [
      period("2025-12-24", "2025-12-31"),
      period("2025-12-01", "2025-12-08"),
    ],
  },
  {
    id: "older-one-day-life",
    index: 0,
    dob: "2017-06-15",
    death: "2025-01-01",
    ssn: "111223334",
    months: 1,
    periods: [period("2025-01-01", "2025-01-01")],
  },
];
const facts = (c: typeof deathResidencyCases[number]) => ({
  ssn: c.ssn,
  dob: c.dob,
  months_in_home: c.months,
  months_lived_with_you_in_us: c.months,
  eic_death_residency_review: {
    child_ssn: c.ssn,
    birth_record_reference: `Synthetic birth ${c.dob}`,
    death_record_reference: `Synthetic death ${c.death}`,
    death_date: c.death,
    us_home_residence_periods: c.periods,
  },
});
export function deathResidencyInputs(index: number) {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-w2-three-eic-children-with-reviewed-birth"
  )!;
  const general = fixture.inputs.general as Record<string, unknown>;
  const deps = general.dependents as Array<Record<string, unknown>>;
  const c = deathResidencyCases[index];
  return {
    ...fixture.inputs,
    general: {
      ...general,
      dependents: deps.map((dep, i) =>
        i === c.index
          ? { ...dep, ...facts(c), eic_birth_residency_review: undefined }
          : dep
      ),
    },
  };
}
Deno.test("death source conserves inclusive lifetime and rejects invalid or conflicting residence", () => {
  for (const c of deathResidencyCases) {
    assertEquals(reviewedEicDeathResidence(facts(c)), true);
    assertEquals(scheduleEicLine6Months(facts(c)), 12);
  }
  const base = facts(deathResidencyCases[1]);
  for (
    const changes of [
      { us_home_residence_periods: [period("2025-12-01", "2025-12-05")] },
      { us_home_residence_periods: [period("2025-12-01", "2025-12-11")] },
      { us_home_residence_periods: [period("2025-11-30", "2025-12-10")] },
      {
        us_home_residence_periods: [
          period("2025-12-01", "2025-12-06"),
          period("2025-12-01", "2025-12-06"),
        ],
      },
      { death_date: "2025-11-30" },
      { death_date: "2025-12-32" },
      { child_ssn: "999887777" },
      { death_record_reference: "" },
    ]
  ) {
    assertThrows(() =>
      reviewedEicDeathResidence({
        ...base,
        eic_death_residency_review: {
          ...base.eic_death_residency_review,
          ...changes,
        },
      })
    );
  }
  assertThrows(() => reviewedEicDeathResidence({ ...base, ssn: undefined }));
  assertThrows(() =>
    reviewedEicDeathResidence({ ...base, months_lived_with_you_in_us: 2 })
  );
  assertThrows(() =>
    reviewedEicDeathResidence({ ...base, eic_birth_residency_review: {} })
  );
  assertThrows(() =>
    reviewedEicDeathResidence({ ...base, eic_dated_residency_review: {} })
  );
  const older = facts(deathResidencyCases[0]);
  assertThrows(() =>
    reviewedEicDeathResidence({
      ...older,
      eic_death_residency_review: {
        ...older.eic_death_residency_review,
        us_home_residence_periods: [period("2025-01-01", "2025-01-29")],
      },
    })
  );
});
for (let index = 0; index < deathResidencyCases.length; index++) {
  Deno.test(`deceased child complete native/source joins ${deathResidencyCases[index].id}`, async () => {
    const result = f1040_2025.executeReturn(deathResidencyInputs(index));
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const c = deathResidencyCases[index];
    assertEquals(pending.eitc?.qualifying_children, 3);
    assertEquals(
      pending.eitc?.qualifying_child_details?.[c.index]
        ?.months_lived_with_you_in_us,
      1,
    );
    assertEquals(
      eitcPdf.projectFields?.(
        pending.eitc!,
        pending as unknown as Record<string, Record<string, unknown>>,
      )?.[`child${c.index + 1}_us_months`],
      12,
    );
    const xml = buildMefXml(pending, filer);
    assertStringIncludes(
      xml,
      "<MonthsChildLivedWithYouCnt>12</MonthsChildLivedWithYouCnt>",
    );
    const path = await Deno.makeTempFile({
      prefix: "opentax-eic-death-",
      suffix: ".xml",
    });
    await Deno.writeTextFile(path, xml);
    console.log(`EIC_DEATH_XML ${path}`);
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
    for (const target of ["child", "source"]) {
      const changed = structuredClone(pending) as any;
      if (target === "child") {
        changed.eitc.qualifying_child_details[c.index]
          .eic_death_residency_review = undefined;
      } else {changed.general.dependents[c.index].eic_death_residency_review
          .death_record_reference = "Changed source";}
      assertThrows(() => buildMefXml(buildPending(changed), filer));
      await assertRejects(() => buildPdfBytes(changed, filer));
    }
    const noSSN = deathResidencyInputs(index) as any;
    noSSN.general.dependents[c.index].ssn = undefined;
    assertEquals(f1040_2025.executeReturn(noSSN).diagnostics.length > 0, true);
  });
}
