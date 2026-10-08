import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { mfsResidencyInputs } from "./eic-mfs-residency.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { eitcPdf } from "./pdf/forms/eitc.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
for (const kind of ["ordinary", "birth", "death"] as const) {
  for (const basis of ["last_six_months_apart", "legal_separation"] as const) {
    for (const claimed of [false, true]) {
      Deno.test(`MFS reviewed EIC native ${kind}/${basis}/${claimed ? "claimed" : "released"}`, async () => {
        const result = f1040_2025.executeReturn(
          mfsResidencyInputs(kind, basis, claimed),
        );
        assertEquals(result.diagnostics, []);
        const pending = buildPending(result.pending),
          filer = extractFilerIdentity(result.pending.f1040)!;
        assertEquals(pending.f1040?.dependent_count, claimed ? 1 : 0);
        assertEquals(pending.f1040?.mfs_eitc_separation_rule, true);
        assertEquals(pending.f1040?.line11_agi, 15000);
        assertEquals(pending.f1040?.line27_eitc, 4328);
        assertEquals(
          pending.f1040?.line28_actc ?? 0,
          claimed ? 1700 : 0,
        );
        assertEquals(pending.f1040?.line35a_refund, claimed ? 7528 : 5828);
        assertEquals(pending.eitc?.qualifying_children, 1);
        const fields = eitcPdf.projectFields?.(
          pending.eitc!,
          pending as unknown as Record<string, Record<string, unknown>>,
        );
        assertEquals(fields?.child1_us_months, kind === "ordinary" ? 7 : 12);
        const xml = buildMefXml(pending, filer);
        assertStringIncludes(
          xml,
          "<SepdSpsFilingSepRetMeetsRqrInd>X</SepdSpsFilingSepRetMeetsRqrInd>",
        );
        assertStringIncludes(
          xml,
          "<QualifyingChildSSN>444556666</QualifyingChildSSN>",
        );
        assertStringIncludes(xml, "<IRS1040ScheduleEIC");
        const path = await Deno.makeTempFile({
          prefix: "opentax-eic-mfs-residency-",
          suffix: ".xml",
        });
        await Deno.writeTextFile(path, xml);
        console.log(`EIC_MFS_RESIDENCY_XML ${path}`);
        const schema = new URL(
          "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
        for (
          const mutation of [
            "review",
            "mark",
            "wage-owner",
            "residence",
          ] as const
        ) {
          const changed = structuredClone(pending) as any;
          if (mutation === "review") {
            delete changed.general.mfs_eitc_separation_review;
          } else if (mutation === "mark") {
            changed.f1040.mfs_eitc_separation_rule = false;
          } else if (mutation === "wage-owner") {
            changed.w2.w2s[0].employee_ssn = "222334444";
          } else {
            const child = changed.general.dependents[0];
            if (kind === "ordinary") {
              child.eic_dated_residency_review.residence_periods[0].start_date =
                "2025-07-03";
            } else if (kind === "birth") {
              child.eic_birth_residency_review.us_home_residence_periods[0]
                .end_date = "2025-12-15";
            } else {child.eic_death_residency_review
                .us_home_residence_periods[0].end_date = "2025-12-05";}
          }
          assertThrows(() => buildMefXml(buildPending(changed), filer));
          await assertRejects(() => buildPdfBytes(changed, filer));
        }
      });
    }
  }
}
