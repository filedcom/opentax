import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { scheduleJNonfarmW2Inputs } from "../../business/schedule-j/schedule_j_nonfarm_w2.fixture.ts";
import { participantCollectionInputs } from "./form4972_participant_collection.fixture.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { assertForm4972AmtJoin } from "./form4972_amt_reconciliation.ts";
import { assertScheduleJSourceReturn } from "../../business/schedule-j/schedule_j_source_return.ts";

function sourcedReturn(): Record<string, unknown> {
  const input: any = scheduleJNonfarmW2Inputs();
  const groups = participantCollectionInputs("two-inherited");
  const child: any = structuredClone(
    (pdfReviewFixtures.find((f) =>
      f.id === "single-form8814-child-dividends-adjustments"
    )!.inputs as any).f8814[0],
  );
  child.source_review.electing_parent_ssn = input.general.taxpayer_ssn;
  input.f8814 = [child];
  input.form4972 = groups.form4972;
  input.f1099r = groups.f1099r;
  return input;
}

function zeroTaxChildReturn(): Record<string, unknown> {
  const input: any = sourcedReturn();
  const child = input.f8814[0];
  child.interest_income = 1351;
  child.dividend_income = 0;
  child.qualified_dividends = 0;
  delete child.interest_adjustments;
  child.source_review.source_document_reference =
    "reviewed-child-interest-1351-zero-rounded-tax";
  child.source_review.income = { interest_income: 1351 };
  delete child.source_review.interest_adjustments;
  return input;
}

Deno.test("issued participant, child, farm, dividend, W-2 and ISO sources refigure Schedule J AMT without its election", async () => {
  const input = sourcedReturn();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const p: any = normalizeAllPending(result.pending);
  assertEquals(p.form4972.forms.length, 2);
  assertEquals(p.form8814.items.length, 1);
  assertEquals(p.form8814.items[0].line12, 500);
  assertEquals(p.form8814.items[0].line15, 135);
  assertEquals(p.schedule_j.line1, 310854);
  assertEquals(p.schedule_j.line23, 68739);
  assertEquals(p.f1040.form4972_tax, 2768);
  assertEquals(p.f1040.form8814_tax, 135);
  assertEquals(p.f1040.line16_income_tax, 71642);
  assertEquals(p.form6251.regular_tax, 72381);
  assertEquals(p.form6251.line11_amt, 53413);
  assertEquals(p.f1040.line24_total_tax, 141977);
  assertEquals(68739 + 2768 + 135, 71642);
  // Remove only the election from the same reviewed source inventory. Form
  // 6251 line 10 uses this full-return tax, excluding Form 4972 once.
  const noElection: any = structuredClone(input);
  delete noElection.schedule_j;
  const without = f1040_2025.executeReturn(noElection);
  assertEquals(without.diagnostics, []);
  const noJ: any = normalizeAllPending(without.pending);
  assertEquals(noJ.f1040.line16_income_tax - 2768, 72381);
  assertEquals(noJ.f1040.form8814_tax, 135);
  assertScheduleJSourceReturn(result.pending);
  assertForm4972AmtJoin(2768, p);

  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
  assertEquals((prepared.bundle.xml.match(/<IRS4972\b/g) ?? []).length, 2);
  assertEquals((prepared.bundle.xml.match(/<IRS1099R\b/g) ?? []).length, 3);
  assertEquals((prepared.bundle.xml.match(/<IRS8814\b/g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS6251\b/g) ?? []).length, 1);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  const dir = Deno.args[0] ?? ".state/research/form4972-schedulej-child-amt";
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source.json`,
    JSON.stringify(input, null, 2),
  );
  await Deno.writeTextFile(`${dir}/pending.json`, JSON.stringify(p, null, 2));
  await Deno.writeTextFile(
    `${dir}/carry.json`,
    JSON.stringify(result.carryforwards, null, 2),
  );
  await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${dir}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const checked = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${dir}/return.xml`,
    ],
  }).output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  console.log("Form4972/ScheduleJ/Form8814", origins.length, "pages");

  for (
    const change of [
      (q: any) => q.f1040.form8814_tax++,
      (q: any) => q.form8814.items[0].line15++,
      (q: any) => q.schedule_j.line23++,
      (q: any) => q.form6251.regular_tax++,
    ]
  ) {
    const bad: any = structuredClone(p);
    change(bad);
    assertThrows(() => assertForm4972AmtJoin(2768, bad));
    await assertRejects(() => f1040_2025.prepareReturn!(bad, filer));
    await assertRejects(() => buildPdfBytes(bad, filer, ".pdf-cache"));
  }
  const badCollection: any = structuredClone(p);
  badCollection.form4972.forms[1].line30++;
  await assertRejects(() => f1040_2025.prepareReturn!(badCollection, filer));
  await assertRejects(() => buildPdfBytes(badCollection, filer, ".pdf-cache"));
  const badSource: any = structuredClone(input);
  badSource.f8814[0].source_review.electing_parent_ssn = "999887777";
  assertThrows(() => f1040_2025.executeReturn(badSource));
});

Deno.test("child income just above filing threshold retains a zero-tax Form8814 with Schedule J, Form4972 and AMT", async () => {
  const input = zeroTaxChildReturn();
  const r = f1040_2025.executeReturn(input);
  assertEquals(r.diagnostics, []);
  const p: any = normalizeAllPending(r.pending);
  assertEquals(p.form8814.items[0].line4, 1351);
  assertEquals(p.form8814.items[0].line15, 0);
  assertEquals(p.f1040.form8814_tax, 0);
  assertEquals(p.schedule_j.line23, 68489);
  assertEquals(p.f1040.line16_income_tax, 71257);
  assertEquals(p.form6251.regular_tax, 71996);
  assertEquals(p.form6251.line11_amt, 53583);
  assertScheduleJSourceReturn(r.pending);
  assertForm4972AmtJoin(2768, p);
  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(r.pending, filer);
  assertEquals((prepared.bundle.xml.match(/<IRS8814\b/g) ?? []).length, 1);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  assertEquals(origins.filter((x) => x.formKey === "form8814").length, 1);
  const dir = (Deno.args[0] ?? ".state/research/form4972-schedulej-child-amt") +
    "/zero-child-tax";
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source.json`,
    JSON.stringify(input, null, 2),
  );
  await Deno.writeTextFile(`${dir}/pending.json`, JSON.stringify(p, null, 2));
  await Deno.writeTextFile(
    `${dir}/carry.json`,
    JSON.stringify(r.carryforwards, null, 2),
  );
  await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${dir}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const checked = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${dir}/return.xml`,
    ],
  }).output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  const below: any = zeroTaxChildReturn();
  below.f8814[0].interest_income = 1350;
  below.f8814[0].source_review.income.interest_income = 1350;
  assertThrows(() => f1040_2025.executeReturn(below));
  console.log("Zero-tax Form8814", origins.length, "pages");
});
