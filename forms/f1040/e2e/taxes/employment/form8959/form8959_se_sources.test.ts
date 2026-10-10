import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../2025/index.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../2025/pdf/review-fixtures.ts";

const cases = [
  {
    id: "joint-owned-se-two-businesses-spouse-wage-cap",
    earnings: 92350,
    tax: 166,
  },
  { id: "joint-owned-se-mixed-business-and-farm", earnings: 92350, tax: 166 },
  { id: "optional-spouse-cap-profit", earnings: 57410, tax: 0 },
  { id: "optional-combined-below-minimum", earnings: 0, tax: 0 },
];
const schema =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (const c of cases) {
  Deno.test(`Form8959 retained Schedule SE public replay: ${c.id}`, async () => {
    const fixture = pdfReviewFixtures.find((item) => item.id === c.id)!;
    const result = f1040_2025.executeReturn(fixture.inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const medicare = result.pending.form8959;
    assertEquals(medicare.se_income, c.earnings);
    assertEquals(pending.schedule2?.line11_additional_medicare ?? 0, c.tax);
    assertEquals(medicare.line18_total_tax ?? 0, c.tax);
    const xml = buildMefXml(pending, fixture.filer);
    assertEquals(xml.includes("<IRS8959"), c.tax > 0);
    const validator = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", schema, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validator.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const checked = await validator.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    assertEquals(
      (await buildPdfBytes(pending, fixture.filer)).length > 0,
      true,
    );
    const changed = {
      ...pending,
      form8959: { ...medicare, se_income: c.earnings + 0.01 },
    };
    assertThrows(
      () => buildMefXml(changed, fixture.filer),
      Error,
      "se_income differs from original source records",
    );
    await assertRejects(
      () => buildPdfBytes(changed, fixture.filer),
      Error,
      "se_income differs from original source records",
    );
  });
}
