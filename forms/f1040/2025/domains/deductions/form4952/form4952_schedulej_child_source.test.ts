import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { form4952ScheduleJChildInputs } from "./form4952_schedulej_child.fixture.ts";

Deno.test("owner-paid Form 4952 election flows through Schedule J, Form 6251, native and PDF", async () => {
  const input = form4952ScheduleJChildInputs();
  const actual = f1040_2025.executeReturn(input);
  assertEquals(actual.diagnostics, []);
  const p: any = normalizeAllPending(actual.pending);
  assertEquals(p.form4952.line4a, 36_574);
  assertEquals(p.form4952.line4b, 30_787);
  assertEquals(p.form4952.line4e, 426);
  assertEquals(p.form4952.line4g, 15_000);
  assertEquals(p.form4952.line8, 20_000);
  assertEquals(p.schedule_a.line_9_investment_interest, 20_000);
  assertEquals(p.f1040.line15_taxable_income, 309_604);
  assertEquals(p.schedule_j.line23, 71_159);
  assertEquals(p.form6251.regular_tax, 74_801);
  assertEquals(p.form6251.line11_amt, 47_530);
  assertEquals(p.form6251.line13, 16_213);
  assertEquals(p.f1040.line16_income_tax, 74_062);
  assertEquals(p.f1040.line24_total_tax, 137_792);
  const noJ = structuredClone(input);
  delete noJ.schedule_j;
  const counterfactual = f1040_2025.executeReturn(noJ);
  assertEquals(counterfactual.diagnostics, []);
  const counter: any = normalizeAllPending(counterfactual.pending);
  assertEquals(counter.f1040.line16_income_tax, 77_569);
  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(actual.pending, filer);
  assertEquals(
    prepared.bundle.xml.includes('investmentPropGainElectedCd="ELEC"'),
    true,
  );
  assertEquals(
    prepared.bundle.xml.includes('investmentPropGainElectedAmt="0"'),
    true,
  );
  assertEquals(
    prepared.bundle.xml.includes("<TotalTaxAmt>137792</TotalTaxAmt>"),
    true,
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  const root = Deno.args[0] ??
    ".state/research/form4952-schedulej-child-source";
  await Deno.mkdir(root, { recursive: true });
  await Promise.all([
    Deno.writeTextFile(`${root}/source.json`, JSON.stringify(input, null, 2)),
    Deno.writeTextFile(`${root}/pending.json`, JSON.stringify(p, null, 2)),
    Deno.writeTextFile(
      `${root}/carry.json`,
      JSON.stringify(actual.carryforwards, null, 2),
    ),
    Deno.writeTextFile(
      `${root}/origins.json`,
      JSON.stringify(origins, null, 2),
    ),
    Deno.writeTextFile(`${root}/return.xml`, prepared.bundle.xml),
    Deno.writeFile(`${root}/return.pdf`, pdf),
  ]);

  for (
    const edit of [
      (x: any) => x.form4952.direct_debt_trace.owner_tin = "999999999",
      (x: any) =>
        x.form4952.direct_debt_trace.interest_payments[0].interest_amount =
          9_999,
      (x: any) => x.f1099div[0].investment_property_for_form4952 = false,
      (x: any) => x.form4952.amt_refigure.elected_capital_gain_portion = 426,
    ]
  ) {
    const changed = structuredClone(input);
    edit(changed);
    let rejected = false;
    try {
      const result = f1040_2025.executeReturn(changed);
      rejected = result.diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true);
  }
  for (
    const edit of [
      (x: any) => x.form4952.direct_debt_trace.owner_tin = "999999999",
      (x: any) => x.form4952.line4g = 14_999,
      (x: any) => x.form6251.line13 = 16_214,
    ]
  ) {
    const changed: any = structuredClone(prepared.bundle.pending);
    edit(changed);
    await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
    await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
  }
});
