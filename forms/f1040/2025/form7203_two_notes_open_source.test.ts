import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";
import {
  twoNotesFamilyCase,
  twoNotesFamilyInputs,
  twoNotesOpenCases,
  twoNotesOpenInputs,
} from "./form7203_two_notes_open.fixture.ts";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
// Independently worked PartII line30 columns, source face values remain fixed.
const reductions: Record<string, number[]> = {
  primary_fractional: [1053, 526, 921],
  primary_limited: [1600, 0, 500],
  first_formal_fully_repaid: [0, 714, 1786],
  open_fully_repaid: [1786, 714, 0],
  all_three_fully_repaid: [0, 0, 0],
  spouse_fractional: [1053, 526, 921],
  spouse_net_advance: [833, 417, 1250],
};
for (const c of [...twoNotesOpenCases, twoNotesFamilyCase]) {
  Deno.test(`two formal plus open ${c.id}: public/native/fullXSD/PDF`, async () => {
    const jointFamily = c.id === "independent_owners",
      { inputs, filer } = jointFamily
        ? twoNotesFamilyInputs()
        : twoNotesOpenInputs(c);
    const r = f1040_2025.executeReturn(inputs as any),
      p: any = buildPending(r.pending);
    assertEquals(r.diagnostics, []);
    const joint = inputs.general.filing_status === "mfj",
      taxable = 50000 - c.allowed - (joint ? 31500 : 15750),
      midpoint = Math.floor(taxable / 50) * 50 + 25;
    const tax = joint
      ? Math.round(midpoint * .1)
      : Math.round(11925 * .1 + (midpoint - 11925) * .12);
    assertEquals([
      p.schedule1.line5_schedule_e,
      p.f1040.line11_agi,
      p.f1040.line15_taxable_income,
      p.f1040.line16_income_tax,
      p.f1040.line24_total_tax,
      p.f1040.line35a_refund,
    ], [-c.allowed, 50000 - c.allowed, taxable, tax, tax, 8000 - tax]);
    const suspended = (jointFamily ? 8000 : 4000) - c.allowed;
    assertEquals([
      r.carryforwards.suspended_scorp_loss_7203 ?? 0,
      r.carryforwards.basis_suspended_scorp_qbi_loss_7203 ?? 0,
      r.carryforwards.qbi_loss_carryforward,
    ], [suspended, suspended, c.allowed]);
    assertEquals([
      p.form8995.line2,
      p.form8995.line15,
      p.form8995.line16,
      p.f1040.line13_qbi_deduction,
    ], [-c.allowed, 0, c.allowed, 0]);
    const copies: any = form7203StockLossPdf.instances!(p.form7203, filer, p)!;
    assertEquals(copies.length, jointFamily ? 2 : 1);
    const specs = jointFamily
      ? [twoNotesOpenCases[1], twoNotesOpenCases[5]]
      : [c];
    for (let i = 0; i < copies.length; i++) {
      const copy = copies[i],
        spec = specs[i],
        note: any = (inputs.k1_s_corp[i] as any).form7203_debt_evidence;
      const firstRepay = (note.principal_repayments ?? []).reduce(
          (a: number, b: any) => a + b.amount,
          0,
        ),
        open = note.open_account_net_advance_amount;
      const caps = [2000 - firstRepay, 1000 - spec.secondRepayment, open],
        filed = reductions[spec.id],
        total = caps.reduce((a, b) => a + b, 0),
        loss = spec.allowed - 1500;
      assertEquals([
        copy.formal_note_debt1,
        copy.formal_note_debt2,
        copy.open_account_debt2,
        copy.open_account_debt3,
      ], [true, true, undefined, true]);
      assertEquals([
        copy.line17_debt1,
        copy.line17_debt2,
        copy.line17_debt3,
        copy.line17_total,
      ], [2000, 1000, open, 3000 + open]);
      assertEquals([
        copy.line19_debt1 ?? 0,
        copy.line19_debt2 ?? 0,
        copy.line19_debt3 ?? 0,
        copy.line19_total ?? 0,
      ], [
        firstRepay,
        spec.secondRepayment,
        0,
        firstRepay + spec.secondRepayment,
      ]);
      assertEquals([
        copy.line20_debt1,
        copy.line20_debt2,
        copy.line20_debt3,
        copy.line20_total,
      ], [...caps, total]);
      assertEquals([
        copy.line30_debt1,
        copy.line30_debt2,
        copy.line30_debt3,
        copy.line30_total,
      ], [...filed, loss]);
      assertEquals([
        copy.line31_debt1,
        copy.line31_debt2,
        copy.line31_debt3,
        copy.line31_total,
      ], [...caps.map((v, i) => v - filed[i]), total - loss]);
      assertEquals(copy.line25_debt3, open ? "1.0000" : undefined);
      const key = `${note.shareholder_ssn}_${note.corporation_ein}`;
      ["formal_note", "second_formal_note", "open_account"].forEach(
        (label, j) => {
          assertEquals(
            r.carryforwards[`${label}_principal_7203_${key}`],
            caps[j],
          );
          assertEquals(
            r.carryforwards[`${label}_debt_basis_7203_${key}`],
            caps[j] - filed[j],
          );
          assertEquals(
            r.carryforwards[`${label}_exact_loss_numerator_7203_${key}`],
            caps[j] * loss,
          );
          assertEquals(
            r.carryforwards[`${label}_exact_basis_numerator_7203_${key}`],
            caps[j] * (total || 1) - caps[j] * loss,
          );
        },
      );
      assertEquals(
        r.carryforwards[`mixed_debt_exact_loss_denominator_7203_${key}`],
        total || 1,
      );
    }
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS7203\b/g) ?? []).length, copies.length);
    assertEquals(
      (xml.match(/<ShareholderDebtBasisGrp>/g) ?? []).length,
      3 * copies.length,
    );
    assertEquals(
      (xml.match(/<FormalNoteInd>X<\/FormalNoteInd>/g) ?? []).length,
      2 * copies.length,
    );
    assertEquals(
      (xml.match(/<OpenAccountDebtInd>X<\/OpenAccountDebtInd>/g) ?? []).length,
      copies.length,
    );
    assertStringIncludes(
      xml,
      `<TotQlfyBusLossCarryforwardAmt>${c.allowed}</TotQlfyBusLossCarryforwardAmt>`,
    );
    const child = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stderr: "piped",
      stdout: "piped",
    }).spawn();
    const w = child.stdin.getWriter();
    await w.write(new TextEncoder().encode(xml));
    await w.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [],
      pdf = await buildPdfBytes(
        p,
        filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      ),
      doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), c.id === "independent_owners" ? 10 : 8);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      origins.filter((o) => o.formKey === "form7203").map((o) => o.formCopy),
      c.id === "independent_owners" ? [1, 1, 2, 2] : [1, 1],
    );
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM7203_TWO_NOTES_OPEN_EVIDENCE_DIR");
    } catch (e) {
      if (!(e instanceof Deno.errors.NotCapable)) throw e;
    }
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      const stem = `${dir}/${c.id}`;
      for (
        const [ext, value] of Object.entries({
          "source.json": inputs,
          "filer.json": filer,
          "pending.json": p,
          "carry.json": r.carryforwards,
          "origins.json": origins,
          "expected.json": {
            allowed: c.allowed,
            basisSuspended: (c.id === "independent_owners" ? 8000 : 4000) -
              c.allowed,
            qbiCarry: c.allowed,
            tax,
            pages: c.id === "independent_owners" ? 10 : 8,
            debtColumns: copies,
          },
        })
      ) {
        await Deno.writeTextFile(
          `${stem}.${ext}`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${stem}.xml`, xml);
      await Deno.writeFile(`${stem}.pdf`, pdf);
    }
  });
}

Deno.test("two written notes and open account reject incomplete/cross-owned/duplicate repayment sources", () => {
  const mutate: [string, (n: any) => void][] = [
    [
      "missing second note",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory
          .splice(1, 1),
    ],
    ["wrong note order", (n) => {
      const rows =
        n.owned_current_records.complete_current_shareholder_debt_inventory;
      [rows[0], rows[1]] = [rows[1], rows[0]];
    }],
    [
      "duplicate instrument",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory[1]
          .instrument_reference = n.owned_current_records
            .complete_current_shareholder_debt_inventory[0]
            .instrument_reference,
    ],
    [
      "outer second lender",
      (n) => n.second_formal_note.shareholder_lender_ssn = "234567890",
    ],
    [
      "issued second recipient",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory[1]
          .shareholder_ssn = "234567890",
    ],
    [
      "second repayment flag",
      (n) => n.second_formal_note.no_2025_repayments_confirmed = true,
    ],
    [
      "second repayment scalar",
      (n) => n.second_formal_note.principal_repayment.amount++,
    ],
    [
      "second note cash source",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory[1]
          .funding.bank_debit++,
    ],
    ["missing owned bank note", (n) => {
      const s = n.owned_current_records;
      const id =
        s.complete_current_shareholder_debt_inventory[1].formal_note_id;
      s.complete_current_corporate_bank_ledger.transactions = s
        .complete_current_corporate_bank_ledger.transactions.filter((r: any) =>
          r.formal_note_id !== id
        );
    }],
    [
      "open account as invented written loan",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory[2]
          .no_separate_written_instrument = false,
    ],
    [
      "prior second debt",
      (n) => n.second_formal_note.beginning_note_debt_basis = 500,
    ],
    [
      "fourth debt without required overflow",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory
          .splice(
            2,
            0,
            structuredClone(
              n.owned_current_records
                .complete_current_shareholder_debt_inventory[1],
            ),
          ),
    ],
  ];
  for (const [label, change] of mutate) {
    const { inputs } = twoNotesOpenInputs(twoNotesOpenCases[0]);
    change((inputs.k1_s_corp[0] as any).form7203_debt_evidence);
    assertEquals(
      f1040_2025.executeReturn(inputs as any).diagnostics.some((d) =>
        d.severity === "error"
      ),
      true,
      label,
    );
  }
});
Deno.test("three debt columns reject native/directPDF final source/owner/tax/QBI/copy conflicts", async () => {
  const { inputs, filer } = twoNotesFamilyInputs(),
    r = f1040_2025.executeReturn(inputs as any);
  assertEquals(r.diagnostics, []);
  const changes: [string, (p: any) => void][] = [
    [
      "new debt scalar",
      (p) =>
        p.form7203.owned_debt_loss_sources[0].form7203_debt_evidence
          .cash_advance_amount++,
    ],
    [
      "second source repayment",
      (p) =>
        p.k1_s_corp.k1_s_corps[0].form7203_debt_evidence.second_formal_note
          .principal_repayment.amount++,
    ],
    [
      "cross owner note",
      (p) =>
        p.k1_s_corp.k1_s_corps[1].form7203_debt_evidence.second_formal_note
          .shareholder_lender_ssn = "123456789",
    ],
    ["omitted owner copy", (p) => p.form7203.owned_debt_loss_sources.pop()],
    [
      "duplicate owner",
      (p) =>
        p.k1_s_corp.k1_s_corps.push(structuredClone(p.k1_s_corp.k1_s_corps[0])),
    ],
    ["AGI", (p) => p.f1040.line11_agi++],
    ["QBI carry", (p) => p.form8995.line16++],
  ];
  for (const [label, change] of changes) {
    const p = structuredClone(r.pending);
    change(p);
    await assertRejects(() => f1040_2025.prepareReturn(p, filer), label);
    await assertRejects(
      () => buildPdfBytes(buildPending(p), filer, ".pdf-cache"),
      label,
    );
  }
});
