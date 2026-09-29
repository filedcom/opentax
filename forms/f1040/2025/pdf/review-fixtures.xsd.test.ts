import { assertEquals, assertStringIncludes } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefXml } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const xsd = new URL(
  "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const xsdAvailable = (() => {
  try {
    Deno.statSync(xsd);
    return true;
  } catch {
    return false;
  }
})();
const plan = buildExecutionPlan(registry);

for (const fixture of pdfReviewFixtures) {
  Deno.test({
    name: `filled-PDF source ${fixture.id} also exports TY2025 v5.4 XML`,
    ignore: !xsdAvailable,
    async fn() {
      const result = execute(plan, registry, { ...fixture.inputs }, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const xml = buildMefXml(buildPending(result.pending), fixture.filer);
      if (fixture.id === "single-child-unearned-income") {
        assertStringIncludes(xml, "<IRS8615 ");
        assertEquals(xml.includes("<IRS8960 "), false);
      }
      if (fixture.id === "single-high-wage-no-niit") {
        assertStringIncludes(xml, "<IRS8960 ");
        assertStringIncludes(xml, "<ModifiedAGIAmt>220000</ModifiedAGIAmt>");
        assertStringIncludes(
          xml,
          "<IndivNetInvstIncomeTaxAmt>0</IndivNetInvstIncomeTaxAmt>",
        );
      }
      const path = await Deno.makeTempFile({ suffix: ".xml" });
      try {
        await Deno.writeTextFile(path, xml);
        const checked = await new Deno.Command("xmllint", {
          args: ["--noout", "--schema", xsd, path],
          stdout: "piped",
          stderr: "piped",
        }).output();
        assertEquals(
          checked.code,
          0,
          `${fixture.id}: ${new TextDecoder().decode(checked.stderr)}`,
        );
      } finally {
        await Deno.remove(path);
      }
    },
  });
}
