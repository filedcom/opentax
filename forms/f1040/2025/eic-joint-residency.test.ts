import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  jointResidencyInputs,
  type ResidencyKind,
  type WageOwner,
} from "./eic-joint-residency.fixture.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { eitcPdf } from "./pdf/forms/eitc.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
for (const kind of ["ordinary", "birth", "death"] as ResidencyKind[]) {
  for (const owner of ["primary", "spouse", "split"] as WageOwner[]) {
    Deno.test(`joint EIC complete source/native return ${kind}/${owner}`, async () => {
      const result = f1040_2025.executeReturn(
        jointResidencyInputs(kind, owner),
      );
      assertEquals(result.diagnostics, []);
      const pending = buildPending(result.pending),
        filer = extractFilerIdentity(result.pending.f1040)!;
      assertEquals(filer.fullName, "Alex Example");
      assertEquals(filer.spouse?.firstName, "Sam");
      assertEquals(filer.spouse?.ssn.replaceAll("-", ""), "444556666");
      assertEquals(pending.eitc?.qualifying_children, 3);
      assertEquals(pending.f1040?.line11_agi, 15000);
      assertEquals(pending.f1040?.line27_eitc, 6761);
      assertEquals(pending.f1040?.line35a_refund, 8261);
      const fields = eitcPdf.projectFields?.(
        pending.eitc!,
        pending as unknown as Record<string, Record<string, unknown>>,
      );
      assertEquals([
        fields?.child1_us_months,
        fields?.child2_us_months,
        fields?.child3_us_months,
      ], kind === "ordinary" ? [7, 8, 12] : [12, 8, 12]);
      const xml = buildMefXml(pending, filer);
      assertStringIncludes(
        xml,
        "<MonthsChildLivedWithYouCnt>08</MonthsChildLivedWithYouCnt>",
      );
      assertEquals(
        (xml.match(/<QualifyingChildInformation>/g) ?? []).length,
        3,
      );
      const path = await Deno.makeTempFile({
        prefix: "opentax-eic-joint-residency-",
        suffix: ".xml",
      });
      await Deno.writeTextFile(path, xml);
      console.log(`EIC_JOINT_RESIDENCY_XML ${path}`);
      const schema = new URL(
        "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
      const alien = structuredClone(pending) as any;
      alien.w2.w2s[0].employee_ssn = "999887777";
      assertThrows(() => buildMefXml(buildPending(alien), filer));
      await assertRejects(() => buildPdfBytes(alien, filer));
      const changed = structuredClone(pending) as any;
      changed.eitc.qualifying_child_details[0].ssn = "444556666";
      assertThrows(() => buildMefXml(buildPending(changed), filer));
      await assertRejects(() => buildPdfBytes(changed, filer));
    });
  }
}
