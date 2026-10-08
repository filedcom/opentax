import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form4952PabMultiInputs } from "./form4952_pab_multi.fixture.ts";
import { calculateAmtForm4952 } from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";

Deno.test("multiple issued PAB copies and paid bond debt refigure Form 4952/6251", async () => {
  const input = form4952PabMultiInputs();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const p: any = normalizeAllPending(result.pending);
  assertEquals(p.form4952.line1, 20_000);
  assertEquals(p.form4952.line4a, 18_000);
  assertEquals(p.form4952.line8, 18_000);
  assertEquals(p.form4952.source_private_activity_bond_interest, [
    5_000,
    4_000,
  ]);
  assertEquals(p.form4952.source_pab_bond_debt_interest, 1_000);
  const amtForm = calculateAmtForm4952(p.form4952).lines;
  assertEquals(amtForm.line1, 21_000);
  assertEquals(amtForm.line4a, 26_000);
  assertEquals(amtForm.line5, 0);
  assertEquals(amtForm.line8, 21_000);
  assertEquals(p.form6251.line2c_investment_interest, -3_000);
  assertEquals(p.form6251.line2g_pab_interest, 8_000);
  assertEquals(p.form6251.amti, 445_000);
  assertEquals(p.form6251.line11_amt, 54_087);
  assertEquals(p.schedule_a.line_9_investment_interest, 18_000);
  assertEquals(p.f1040.line2a_tax_exempt, 9_000);
  assertEquals(p.f1040.line2b_taxable_interest, 18_000);
  assertEquals(p.f1040.line12e_itemized_deductions, 18_000);
  assertEquals(p.f1040.line24_total_tax, 95_150);
  const filer = extractFilerIdentity(p.f1040)!;
  const prepared = await f1040_2025.prepareReturn!(result.pending, filer);
  assertEquals(
    prepared.bundle.xml.includes(
      "<InvestmentInterestAmt>-3000</InvestmentInterestAmt>",
    ),
    true,
  );
  assertEquals(
    prepared.bundle.xml.includes("<TotalTaxAmt>95150</TotalTaxAmt>"),
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
  const dir = Deno.args[0] ?? ".state/research/form4952-pab-multi-source";
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
  const reject = async (change: (x: any) => void) => {
    const altered = structuredClone(input);
    change(altered);
    let attempt;
    try {
      attempt = f1040_2025.executeReturn(altered);
    } catch {
      return;
    }
    if (attempt.diagnostics.length > 0) return;
    await assertRejects(() =>
      f1040_2025.prepareReturn!(attempt.pending, filer)
    );
    await assertRejects(() =>
      buildPdfBytes(attempt.pending, filer, ".pdf-cache")
    );
  };
  for (
    const [index, change] of [
      (x: any) => {
        x.f1099int[1].payer_name = x.f1099int[0].payer_name;
        x.f1099int[1].payer_tin = x.f1099int[0].payer_tin;
        x.f1099int[1].account_number = x.f1099int[0].account_number;
      },
      (x: any) =>
        x.f1099int[1].source_document_reference =
          x.f1099int[0].source_document_reference,
      (x: any) =>
        x.f1099int[1].pab_review_reference = x.f1099int[0].pab_review_reference,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.allocable_deduction =
          999,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .lender_2025_interest_total = 999,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .owner_tin = "999999999",
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .bond_identifier = "other-bond",
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .purchase_record_reference =
            x.form4952.direct_debt_trace.purchase_record_reference,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .loan_id = x.form4952.direct_debt_trace.loan_id,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.bond_debt_trace
          .interest_payments[0].payment_record_reference =
            x.form4952.direct_debt_trace.interest_payments[0]
              .payment_record_reference,
      (x: any) =>
        x.f1099int[0].pab_allocable_deduction_workpaper.expense_classification =
          "bond_custody_expense",
      (x: any) => x.f1099int[0].box9 = 5_001,
    ].entries()
  ) {
    console.log("source conflict", index);
    await reject(change);
  }
  for (
    const change of [
      (x: any) => x.form6251.line2c_investment_interest = -2_999,
      (x: any) => x.form6251.line2g_pab_interest = 7_999,
      (x: any) => x.form4952.source_pab_bond_debt_interest = 999,
      (x: any) =>
        x.form4952.source_private_activity_bond_interest = [5_000, 4_001],
      (x: any) => x.f1040.line2a_tax_exempt = 8_999,
    ]
  ) {
    const changed: any = structuredClone(prepared.bundle.pending);
    change(changed);
    await assertRejects(() => f1040_2025.prepareReturn!(changed, filer));
    await assertRejects(() => buildPdfBytes(changed, filer, ".pdf-cache"));
  }

  const third = structuredClone(input);
  third.f1099int.push({
    payer_name: "Third Municipal Issuer",
    payer_tin: "889900112",
    recipient_tin: input.general.taxpayer_ssn.replaceAll("-", ""),
    account_number: "PAB-2025-C",
    source_document_reference: "issued-PAB-C-1099INT",
    box8: 2_000,
    box9: 2_000,
    investment_property_for_form4952: true,
    pab_eligible_bonds_reviewed: true,
    pab_bond_identifier: "third-2025-project-bond",
    pab_review_reference: "bond-C-eligibility-review",
    pab_allocable_deduction_workpaper: {
      tax_year: 2025,
      reviewed_workpaper_reference: "bond-C-expense-review",
      expense_record_reference: "bond-C-zero-expense-ledger",
      allocable_deduction: 0,
      direct_allocation_to_reported_bond: true,
      deductible_if_interest_taxable: true,
      not_claimed_elsewhere_on_return: true,
    },
  });
  const threeResult = f1040_2025.executeReturn(third);
  assertEquals(threeResult.diagnostics, []);
  const three: any = normalizeAllPending(threeResult.pending);
  assertEquals(three.form4952.source_private_activity_bond_interest, [
    5_000,
    4_000,
    2_000,
  ]);
  assertEquals(three.form6251.line2c_investment_interest, -3_000);
  assertEquals(three.form6251.line2g_pab_interest, 10_000);
  assertEquals(three.form6251.amti, 447_000);
  assertEquals(three.f1040.line2a_tax_exempt, 11_000);
  assertEquals(three.f1040.line24_total_tax, 95_710);
  const threeFiler = extractFilerIdentity(three.f1040)!;
  const threePrepared = await f1040_2025.prepareReturn!(
    threeResult.pending,
    threeFiler,
  );
  const threeOrigins: PdfPageOrigin[] = [];
  const threePdf = await buildPdfBytes(
    threePrepared.bundle.pending,
    threeFiler,
    ".pdf-cache",
    threePrepared.bundle,
    threeOrigins,
  );
  const threeDir = `${dir}/three-issuer`;
  await Deno.mkdir(threeDir, { recursive: true });
  await Promise.all([
    Deno.writeTextFile(
      `${threeDir}/source.json`,
      JSON.stringify(third, null, 2),
    ),
    Deno.writeTextFile(
      `${threeDir}/pending.json`,
      JSON.stringify(three, null, 2),
    ),
    Deno.writeTextFile(
      `${threeDir}/carry.json`,
      JSON.stringify(threeResult.carryforwards, null, 2),
    ),
    Deno.writeTextFile(
      `${threeDir}/origins.json`,
      JSON.stringify(threeOrigins, null, 2),
    ),
    Deno.writeTextFile(`${threeDir}/return.xml`, threePrepared.bundle.xml),
    Deno.writeFile(`${threeDir}/return.pdf`, threePdf),
  ]);

  const four = structuredClone(third);
  four.f1099int.push({
    payer_name: "Ordinary Exempt Issuer",
    payer_tin: "990011223",
    recipient_tin: input.general.taxpayer_ssn.replaceAll("-", ""),
    account_number: "MUNI-2025-D",
    source_document_reference: "issued-ordinary-exempt-D-1099INT",
    box8: 1_000,
    investment_property_for_form4952: false,
  });
  const fourResult = f1040_2025.executeReturn(four);
  assertEquals(fourResult.diagnostics, []);
  const fourPending: any = normalizeAllPending(fourResult.pending);
  assertEquals(fourPending.form4952.source_private_activity_bond_interest, [
    5_000,
    4_000,
    2_000,
  ]);
  assertEquals(fourPending.form6251.line2g_pab_interest, 10_000);
  assertEquals(fourPending.f1040.line2a_tax_exempt, 12_000);
  assertEquals(fourPending.f1040.line24_total_tax, 95_710);
  const fourFiler = extractFilerIdentity(fourPending.f1040)!;
  const fourPrepared = await f1040_2025.prepareReturn!(
    fourResult.pending,
    fourFiler,
  );
  const fourOrigins: PdfPageOrigin[] = [];
  const fourPdf = await buildPdfBytes(
    fourPrepared.bundle.pending,
    fourFiler,
    ".pdf-cache",
    fourPrepared.bundle,
    fourOrigins,
  );
  const fourDir = `${dir}/four-issuer`;
  await Deno.mkdir(fourDir, { recursive: true });
  await Promise.all([
    Deno.writeTextFile(`${fourDir}/source.json`, JSON.stringify(four, null, 2)),
    Deno.writeTextFile(
      `${fourDir}/pending.json`,
      JSON.stringify(fourPending, null, 2),
    ),
    Deno.writeTextFile(
      `${fourDir}/carry.json`,
      JSON.stringify(fourResult.carryforwards, null, 2),
    ),
    Deno.writeTextFile(
      `${fourDir}/origins.json`,
      JSON.stringify(fourOrigins, null, 2),
    ),
    Deno.writeTextFile(`${fourDir}/return.xml`, fourPrepared.bundle.xml),
    Deno.writeFile(`${fourDir}/return.pdf`, fourPdf),
  ]);

  // The gross-versus-net line 4a choice matters when AMT investment income,
  // rather than interest paid, caps line 8. This separately paid $27,000
  // taxable-securities loan retains the same two issued PAB copies.
  const incomeLimited = structuredClone(input);
  incomeLimited.form4952.investment_interest_expense = 27_000;
  incomeLimited.form4952.direct_debt_trace.lender_2025_interest_total = 27_000;
  incomeLimited.form4952.direct_debt_trace.interest_payments[0]
    .interest_amount = 13_500;
  incomeLimited.form4952.direct_debt_trace.interest_payments[1]
    .interest_amount = 13_500;
  const limitedResult = f1040_2025.executeReturn(incomeLimited);
  assertEquals(limitedResult.diagnostics, []);
  const limited: any = normalizeAllPending(limitedResult.pending);
  const limitedAmt = calculateAmtForm4952(limited.form4952).lines;
  assertEquals(limitedAmt.line1, 28_000);
  assertEquals(limitedAmt.line4a, 26_000);
  assertEquals(limitedAmt.line8, 26_000);
  assertEquals(limited.form6251.line2c_investment_interest, -8_000);
  assertEquals(limited.form6251.line2g_pab_interest, 8_000);
  assertEquals(limited.form6251.amti, 440_000);
  assertEquals(limited.f1040.line24_total_tax, 93_750);
  const limitedFiler = extractFilerIdentity(limited.f1040)!;
  const limitedPrepared = await f1040_2025.prepareReturn!(
    limitedResult.pending,
    limitedFiler,
  );
  const limitedOrigins: PdfPageOrigin[] = [];
  const limitedPdf = await buildPdfBytes(
    limitedPrepared.bundle.pending,
    limitedFiler,
    ".pdf-cache",
    limitedPrepared.bundle,
    limitedOrigins,
  );
  const limitedDir = `${dir}/income-limited`;
  await Deno.mkdir(limitedDir, { recursive: true });
  await Promise.all([
    Deno.writeTextFile(
      `${limitedDir}/source.json`,
      JSON.stringify(incomeLimited, null, 2),
    ),
    Deno.writeTextFile(
      `${limitedDir}/pending.json`,
      JSON.stringify(limited, null, 2),
    ),
    Deno.writeTextFile(
      `${limitedDir}/carry.json`,
      JSON.stringify(limitedResult.carryforwards, null, 2),
    ),
    Deno.writeTextFile(
      `${limitedDir}/origins.json`,
      JSON.stringify(limitedOrigins, null, 2),
    ),
    Deno.writeTextFile(
      `${limitedDir}/return.xml`,
      limitedPrepared.bundle.xml,
    ),
    Deno.writeFile(`${limitedDir}/return.pdf`, limitedPdf),
  ]);
});
