import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  preferentialAmtCases,
  preferentialAmtInputs,
} from "./form4972_preferential_amt.fixture.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import { assertForm4972AmtJoin } from "./form4972_amt_reconciliation.ts";
function sources(): Record<string, unknown> {
  const farm: any = structuredClone(
    pdfReviewFixtures.find((f) =>
      f.id === "single-schedule-j-farm-income-averaging"
    )!.inputs,
  );
  const input: any = preferentialAmtInputs(preferentialAmtCases[0]);
  delete input.w2;
  input.general.qbi_no_prior_loss_or_suspended_loss_confirmed = true;
  input.general.qbi_not_patron_of_specified_cooperative_confirmed = true;
  input.schedule_f = farm.schedule_f;
  input.schedule_f.schedule_fs[0].line2_sales_products_raised = 200000;
  input.schedule_j = farm.schedule_j;
  input.schedule_j.tax_treatment.year2025.has_qualified_dividends = true;
  return input;
}
Deno.test("Schedule J derives preferential tax from issued dividend/farm sources and retains no-election pension ISO AMT", async () => {
  const input = sources();
  const actual = f1040_2025.executeReturn(input);
  assertEquals(actual.diagnostics, []);
  const p: any = normalizeAllPending(actual.pending);
  // Independent whole-dollar worksheet: ordinary126111=>23113.64;
  // qualified30000 at15%=4500; prior allocated taxes1595+1580+1568;
  // subtract actual reviewed prior filed taxes3000.
  assertEquals(p.schedule_j.line3, 156111);
  assertEquals(p.schedule_j.line4, 27614);
  assertEquals(p.schedule_j.line23, 29357);
  assertEquals(p.f1040.line16_income_tax, 30187);
  assertEquals(p.form6251.regular_tax, 31214);
  assertEquals(p.form6251.line11_amt, 55517);
  assertScheduleJSourceReturn(actual.pending);
  assertForm4972AmtJoin(830, p);
  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(actual.pending, filer);
  const pdf = await prepared.renderPdf();
  const dir = Deno.env.get("SCHEDULE_J_PREFERENTIAL_EVIDENCE_DIR") ??
    ".state/research/schedulej-preferential-public";
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source.json`,
    JSON.stringify(input, null, 2),
  );
  await Deno.writeTextFile(`${dir}/pending.json`, JSON.stringify(p, null, 2));
  await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  for (
    const [form, field] of [["schedule_j", "line4"], [
      "form6251",
      "regular_tax",
    ], ["f1040", "line16_income_tax"]]
  ) {
    const bad: any = structuredClone(actual.pending);
    bad[form][field] += 1;
    assertThrows(() => assertScheduleJSourceReturn(bad));
    await assertRejects(() => f1040_2025.prepareReturn!(bad, filer));
  }
  const missing: any = structuredClone(actual.pending);
  delete missing.schedule_j_source_replay;
  assertThrows(() => assertScheduleJSourceReturn(missing));
});
Deno.test("Schedule J rejects public private tax operands and stale current tax treatment", () => {
  const privateInput: any = sources();
  privateInput.schedule_j._derived_source = {};
  assertThrows(() => f1040_2025.executeReturn(privateInput));
  const stale: any = sources();
  stale.schedule_j.tax_treatment.year2025.has_net_capital_gain = true;
  const result = f1040_2025.executeReturn(stale);
  assertEquals(
    result.diagnostics.some((d) =>
      d.message.includes("source worksheet amounts")
    ),
    true,
  );
});
