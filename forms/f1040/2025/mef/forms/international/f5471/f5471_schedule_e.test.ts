import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  form8992Cfc,
  form8992Filer,
  form8992Pending,
} from "../../../../domains/international/form8992/form8992.fixture.ts";
import { form5471ScheduleE } from "./f5471_schedule_e.ts";

const xsd = new URL(
  "../../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/Shared/IRS5471ScheduleE/IRS5471ScheduleE.xsd",
  import.meta.url,
).pathname;
let schemaAvailable = false;
try {
  schemaAvailable = Deno.statSync(xsd).isFile;
} catch {
  // Research schema bundle is optional in another workspace.
}

Deno.test("Category 5a Schedule E/E-1 joins direct tested tax to Schedule I-1", () => {
  const xml = form5471ScheduleE.build({}, {
    filer: form8992Filer,
    pending: form8992Pending,
  });
  assertStringIncludes(xml, "<SeparateCategoryCd>GEN</SeparateCategoryCd>");
  assertStringIncludes(xml, "<TaxInUSDollarsAmt>500</TaxInUSDollarsAmt>");
  assertStringIncludes(
    xml,
    "<TotalTaxInFunctionalCurAmt>500</TotalTaxInFunctionalCurAmt>",
  );
  assertStringIncludes(xml, "<Frm5471SchETestedIncomeGrp>");
  assertStringIncludes(
    xml,
    "<RedOtherTxsNotDeemedPdAmt>-500</RedOtherTxsNotDeemedPdAmt>",
  );
  assertEquals(xml.includes("Frm5471SchESubpartFIncomeGrp"), false);
});

Deno.test("Schedule E rejects tax currency and Schedule I-1 discrepancies", () => {
  const source = (schedule_e: unknown) => ({
    ...form8992Pending,
    f5471: { f5471s: [{ ...form8992Cfc, schedule_e }] },
  });
  assertThrows(() =>
    form5471ScheduleE.build({}, {
      filer: form8992Filer,
      pending: source({ ...form8992Cfc.schedule_e, tax_usd: 499 }),
    }), Error);
  assertThrows(() =>
    form5471ScheduleE.build({}, {
      filer: form8992Filer,
      pending: source({ ...form8992Cfc.schedule_e, disallowed_tax: 1 }),
    }), Error);
});

Deno.test({
  name: "Category 5a Schedule E standalone XML satisfies TY2025 v5.4 XSD",
  ignore: !schemaAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const xml = form5471ScheduleE.build({}, {
      filer: form8992Filer,
      pending: form8992Pending,
    }).replace(
      /^<IRS5471ScheduleE/,
      '<IRS5471ScheduleE xmlns="http://www.irs.gov/efile" documentId="IRS5471ScheduleETest1"',
    );
    const command = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = command.stdin.getWriter();
    await writer.write(new TextEncoder().encode(xml));
    await writer.close();
    const result = await command.output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));
  },
});
