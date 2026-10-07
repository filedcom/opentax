import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { form4952PabAmtInputs } from "./form4952_pab_amt.fixture.ts";

Deno.test("issued PAB interest refigures current Form 4952 line 8 and Form 6251 line 2c", async () => {
  const input = form4952PabAmtInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const p: any = normalizeAllPending(result.pending);
  assertEquals(p.form4952.line1, 20_000);
  assertEquals(p.form4952.line4a, 18_000);
  assertEquals(p.form4952.line7, 2_000);
  assertEquals(p.form4952.line8, 18_000);
  assertEquals(p.form4952.source_private_activity_bond_interest, 5_000);
  assertEquals(p.form6251.line2c_investment_interest, -2_000);
  assertEquals(p.form6251.line2g_pab_interest, 5_000);
  assertEquals(p.form6251.amti, 443_000);
  assertEquals(p.form6251.line11_amt, 53_527);
  assertEquals(p.schedule_a.line_9_investment_interest, 18_000);
  assertEquals(p.f1040.line2a_tax_exempt, 5_000);
  assertEquals(p.f1040.line2b_taxable_interest, 18_000);
  assertEquals(p.f1040.line12e_itemized_deductions, 18_000);
  assertEquals(p.f1040.line16_income_tax, 41_063);
  assertEquals(p.f1040.line24_total_tax, 94_590);
  const withoutPab = structuredClone(input);
  for (
    const field of [
      "box8",
      "box9",
      "pab_eligible_bonds_reviewed",
      "pab_review_reference",
      "pab_bond_identifier",
      "pab_allocable_deduction_workpaper",
    ]
  ) delete withoutPab.f1099int[0][field];
  const without = f1040_2025.executeReturn(withoutPab);
  assertEquals(without.diagnostics, []);
  const q: any = normalizeAllPending(without.pending);
  assertEquals(q.form4952.line8, 18_000);
  assertEquals(q.form6251.line2c_investment_interest ?? 0, 0);
  assertEquals(q.form6251.line2g_pab_interest ?? 0, 0);
  assertEquals(q.form6251.amti, 440_000);
  assertEquals(q.f1040.line24_total_tax, 93_750);
  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
  assertEquals(
    prepared.bundle.xml.includes(
      "<InvestmentInterestAmt>-2000</InvestmentInterestAmt>",
    ),
    true,
  );
  assertEquals(
    prepared.bundle.xml.includes("<TotalTaxAmt>94590</TotalTaxAmt>"),
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
  const dir = Deno.args[0] ?? ".state/research/form4952-pab-amt-source";
  await Deno.mkdir(dir, { recursive: true });
  await Promise.all([
    Deno.writeTextFile(`${dir}/source.json`, JSON.stringify(input, null, 2)),
    Deno.writeTextFile(`${dir}/pending.json`, JSON.stringify(p, null, 2)),
    Deno.writeTextFile(
      `${dir}/carry.json`,
      JSON.stringify(result.carryforwards, null, 2),
    ),
    Deno.writeTextFile(`${dir}/origins.json`, JSON.stringify(origins, null, 2)),
    Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml),
    Deno.writeFile(`${dir}/return.pdf`, pdf),
  ]);

  let preparedSourceConflicts = 0;
  for (
    const edit of [
      (x: any) => x.f1099int[0].box9 = 5_001,
      (x: any) => x.f1099int[0].pab_review_reference = undefined,
      (x: any) => x.f1099int[0].pab_bond_identifier = "taxable-bond-lot",
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.allocable_deduction = 1,
      (x: any) => x.form4952.direct_debt_trace.owner_tin = "999999999",
      (x: any) => x.f1099int[0].pab_review_reference = "loan-agreement",
    ]
  ) {
    const altered = structuredClone(input);
    edit(altered);
    let attempt;
    try {
      attempt = f1040_2025.executeReturn(altered);
    } catch {
      continue;
    }
    if (attempt.diagnostics.length > 0) continue;
    await assertRejects(() =>
      f1040_2025.prepareReturn!(attempt.pending, filer)
    );
    await assertRejects(() =>
      buildPdfBytes(attempt.pending, filer, ".pdf-cache")
    );
    preparedSourceConflicts++;
  }
  assertEquals(preparedSourceConflicts >= 2, true);
  for (
    const edit of [
      (x: any) => x.form6251.line2c_investment_interest = -1_999,
      (x: any) => x.form6251.line2g_pab_interest = 4_999,
      (x: any) => x.form4952.source_private_activity_bond_interest = 4_999,
      (x: any) => x.form4952.direct_debt_trace.owner_tin = "999999999",
    ]
  ) {
    const altered: any = structuredClone(prepared.bundle.pending);
    edit(altered);
    await assertRejects(() => f1040_2025.prepareReturn!(altered, filer));
    await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
  }
});
