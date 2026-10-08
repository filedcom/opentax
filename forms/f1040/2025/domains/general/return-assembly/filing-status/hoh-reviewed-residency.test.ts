import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { hohReviewedResidencyInputs } from "./hoh-reviewed-residency.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPdfBytes } from "../../../../pdf/builder.ts";
import { eitcPdf } from "../../../../pdf/forms/credits/earned-income/eitc.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import {
  hohQualifyingChildFromGeneral,
  inputSchema,
} from "../../../../../nodes/inputs/general/filing/general/index.ts";
for (const kind of ["ordinary", "birth", "death"] as const) {
  for (const claimEic of [true, false]) {
    Deno.test(`HOH reviewed named child complete native ${kind}/${claimEic ? "EIC" : "opt-out"}`, async () => {
      const result = f1040_2025.executeReturn(
        hohReviewedResidencyInputs(kind, claimEic),
      );
      assertEquals(result.diagnostics, []);
      const pending = buildPending(result.pending),
        filer = extractFilerIdentity(result.pending.f1040)!;
      assertEquals(pending.f1040?.hoh_qualifying_child, {
        first_name: "Avery",
        last_name: "Child",
        ssn: "444556666",
      });
      assertEquals(pending.f1040?.dependent_count, 0);
      assertEquals(pending.f1040?.line27_eitc ?? 0, claimEic ? 4328 : 0);
      if (claimEic) {
        assertEquals(pending.f1040?.line11_agi, 15000);
        assertEquals(pending.f1040?.line35a_refund, 5828);
        const fields = eitcPdf.projectFields?.(
          pending.eitc!,
          pending as unknown as Record<string, Record<string, unknown>>,
        );
        assertEquals(fields?.child1_us_months, kind === "ordinary" ? 7 : 12);
      }
      const xml = buildMefXml(pending, filer);
      assertStringIncludes(
        xml,
        "<QualifyingHOHNm>Avery Child</QualifyingHOHNm>",
      );
      assertStringIncludes(
        xml,
        "<QualifyingHOHSSN>444556666</QualifyingHOHSSN>",
      );
      assertEquals(xml.includes("<IRS1040ScheduleEIC"), claimEic);
      const path = await Deno.makeTempFile({
        prefix: "opentax-hoh-residency-",
        suffix: ".xml",
      });
      await Deno.writeTextFile(path, xml);
      console.log(`HOH_RESIDENCY_XML ${path}`);
      const schema = new URL(
        "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        import.meta.url,
      ).pathname;
      const validated = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", schema, path],
        stderr: "piped",
      }).output();
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
      for (const change of ["home-cost", "residence", "identity"] as const) {
        const altered = structuredClone(pending) as any;
        if (change === "home-cost") {
          altered.general.hoh_paid_more_than_half_home_costs = false;
        } else if (change === "identity") {
          altered.f1040.hoh_qualifying_child.ssn = "999887777";
        } else {
          const child = altered.general.dependents[0];
          if (kind === "ordinary") {
            child.eic_dated_residency_review.residence_periods[0].start_date =
              "2025-07-03";
          } else if (kind === "birth") {
            child.eic_birth_residency_review.us_home_residence_periods[0]
              .end_date = "2025-12-15";
          } else {child.eic_death_residency_review.us_home_residence_periods[0]
              .end_date = "2025-12-05";}
        }
        assertThrows(() => buildMefXml(buildPending(altered), filer));
        await assertRejects(() => buildPdfBytes(altered, filer));
      }
    });
  }
  Deno.test(`HOH ${kind} source rejects missing review, wrong name and inadequate home costs`, () => {
    const inputs = hohReviewedResidencyInputs(kind);
    for (const mutation of ["review", "name", "cost"] as const) {
      const g = structuredClone(inputs.general) as any;
      if (mutation === "review") {
        delete g.dependents[0].eic_dated_residency_review;
        delete g.dependents[0].eic_birth_residency_review;
        delete g.dependents[0].eic_death_residency_review;
      } else if (mutation === "name") {
        g.hoh_qualifying_person_name = "Different Child";
      } else g.hoh_paid_more_than_half_home_costs = false;
      assertThrows(() => hohQualifyingChildFromGeneral(inputSchema.parse(g)));
    }
  });
}
