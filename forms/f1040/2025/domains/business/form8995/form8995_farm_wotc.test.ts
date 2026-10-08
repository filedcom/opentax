import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertFarmWotcReturn } from "./form8995_farm_wotc_reconciliation.ts";
import { calculateFarmWotcLines } from "../../../../nodes/intermediate/forms/form8995a/farm-wotc.ts";
import { inputSchema } from "../../../../nodes/intermediate/forms/form8995a/index.ts";
const fixtures = pdfReviewFixtures.filter((f) =>
  f.id.startsWith("owned-farm-wotc")
);
Deno.test("owned farm WOTC actual source full return native PDF and full local XSD", async () => {
  for (const fixture of fixtures) {
    const r = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(r.diagnostics, []);
    const p = normalizeAllPending(r.pending);
    assertFarmWotcReturn(p.form8995a ?? p.form8995, p, fixture.filer);
    console.log(
      fixture.id,
      JSON.stringify({
        farm: p.schedule1.line6_schedule_f,
        half: p.schedule1.line15_se_deduction,
        agi: p.f1040.line11_agi,
        qbi: p.f1040.line13_qbi_deduction,
        taxable: p.f1040.line15_taxable_income,
        credit: p.f3800.allowed_credit,
        tax: p.f1040.line24_total_tax,
        phase: p.form8995a
          ? calculateFarmWotcLines(inputSchema.parse(p.form8995a)).parent
            .phaseIn
          : null,
      }),
    );
    const prepared = await f1040_2025.prepareReturn(r.pending, fixture.filer);
    assertStringIncludes(prepared.bundle.xml, "<IRS1040ScheduleF ");
    const proc = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const w = proc.stdin.getWriter();
    await w.write(new TextEncoder().encode(prepared.bundle.xml));
    await w.close();
    const out = await proc.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    assertEquals((await prepared.renderPdf()).length > 0, true);
  }
});
