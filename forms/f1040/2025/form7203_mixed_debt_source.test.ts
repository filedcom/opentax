import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";
import {
  mixedDebtCases,
  mixedDebtInputs,
  mixedFamilyCase,
  mixedFamilyInputs,
} from "./form7203_mixed_debt.fixture.ts";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (const c of [...mixedDebtCases, mixedFamilyCase]) {
  Deno.test(`mixed ${c.id}: public source/basis/QBI/native/fullXSD/PDF`, async () => {
    const { inputs, filer } = c.owner === "both"
        ? mixedFamilyInputs()
        : mixedDebtInputs(c),
      r = f1040_2025.executeReturn(inputs as any),
      p: any = buildPending(r.pending);
    assertEquals(r.diagnostics, []);
    const joint = c.owner !== "T",
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
    assertEquals([
      r.carryforwards.suspended_scorp_loss_7203 ?? 0,
      r.carryforwards.basis_suspended_scorp_qbi_loss_7203 ?? 0,
      r.carryforwards.qbi_loss_carryforward,
    ], [
      (c.owner === "both" ? 8000 : 4000) - c.allowed,
      (c.owner === "both" ? 8000 : 4000) - c.allowed,
      c.allowed,
    ]);
    assertEquals([
      p.form8995.line2,
      p.form8995.line15,
      p.form8995.line16,
      p.f1040.line13_qbi_deduction,
    ], [-c.allowed, 0, c.allowed, 0]);
    const copies: any = form7203StockLossPdf.instances!(p.form7203, filer, p)!;
    assertEquals(copies.length, c.owner === "both" ? 2 : 1);
    const specs = c.owner === "both"
      ? [mixedDebtCases[1], mixedDebtCases[5]]
      : [c];
    for (let i = 0; i < specs.length; i++) {
      const c = specs[i];
      const formal = 2000 - c.formalRepayment,
        open = c.events.reduce((a, b) => a + b, 0),
        total = formal + open,
        loss = c.allowed - 1500;
      const first = total ? Math.round(loss * formal / total) : 0,
        second = loss - first;
      assertEquals([
        copies[i].formal_note_debt1,
        copies[i].open_account_debt2,
        copies[i].formal_note_debt2,
        copies[i].line17_debt1,
        copies[i].line17_debt2,
        copies[i].line19_debt1 ?? 0,
        copies[i].line19_debt2 ?? 0,
        copies[i].line20_debt1,
        copies[i].line20_debt2,
        copies[i].line30_debt1,
        copies[i].line30_debt2,
        copies[i].line30_total,
        copies[i].line31_debt1,
        copies[i].line31_debt2,
      ], [
        true,
        true,
        undefined,
        2000,
        open,
        c.formalRepayment,
        0,
        formal,
        open,
        first,
        second,
        loss,
        formal - first,
        open - second,
      ]);
      assertEquals(copies[i].line25_debt2, open ? "1.0000" : undefined);
      const key = `${copies[i].shareholder_ssn}_${copies[i].corporation_ein}`;
      assertEquals([
        r.carryforwards[`formal_note_principal_7203_${key}`],
        r.carryforwards[`open_account_principal_7203_${key}`],
        r.carryforwards[`formal_note_debt_basis_7203_${key}`],
        r.carryforwards[`open_account_debt_basis_7203_${key}`],
      ], [formal, open, formal - first, open - second]);
      assertEquals([
        r.carryforwards[`formal_note_exact_basis_numerator_7203_${key}`],
        r.carryforwards[`open_account_exact_basis_numerator_7203_${key}`],
      ], [
        formal * (total || 1) - loss * formal,
        open * (total || 1) - loss * open,
      ]);
      assertEquals([
        r.carryforwards[`formal_note_exact_loss_numerator_7203_${key}`],
        r.carryforwards[`open_account_exact_loss_numerator_7203_${key}`],
        r.carryforwards[`mixed_debt_exact_loss_denominator_7203_${key}`],
      ], [loss * formal, loss * open, total || 1]);
    }
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    assertEquals(
      (xml.match(/<IRS7203\b/g) ?? []).length,
      c.owner === "both" ? 2 : 1,
    );
    assertEquals(
      (xml.match(/<ShareholderDebtBasisGrp>/g) ?? []).length,
      c.owner === "both" ? 4 : 2,
    );
    assertEquals(
      (xml.match(/<OpenAccountDebtInd>X<\/OpenAccountDebtInd>/g) ?? []).length,
      c.owner === "both" ? 2 : 1,
    );
    assertEquals(
      (xml.match(/<FormalNoteInd>X<\/FormalNoteInd>/g) ?? []).length,
      c.owner === "both" ? 2 : 1,
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
    assertEquals(doc.getPageCount(), c.owner === "both" ? 10 : 8);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      origins.filter((o) => o.formKey === "form7203").map((o) => o.formCopy),
      c.owner === "both" ? [1, 1, 2, 2] : [1, 1],
    );
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM7203_MIXED_DEBT_EVIDENCE_DIR");
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
            basisSuspended: (c.owner === "both" ? 8000 : 4000) - c.allowed,
            qbiCarry: c.allowed,
            tax,
            pages: c.owner === "both" ? 10 : 8,
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

Deno.test("mixed current debt rejects incomplete/cross-owned/borrowed basis and cash sources", () => {
  const mutations: [string, (k: any) => void][] = [
    [
      "missing corporate cash",
      (k) =>
        delete k.form7203_debt_evidence.owned_current_records
          .complete_current_corporate_bank_ledger,
    ],
    [
      "missing unrelated credit",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory = [],
    ],
    [
      "corporate opening cash",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_corporate_bank_ledger.opening_cash++,
    ],
    [
      "unrecorded corporate funds",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_corporate_bank_ledger.transactions[0].cash_after++,
    ],
    [
      "shareholder guarantee",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0]
          .no_shareholder_guarantee_or_cosign = false,
    ],
    [
      "bank becomes shareholder creditor",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0]
          .creditor_relationship = "shareholder",
    ],
    [
      "borrower mismatch",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0].corporation_ein =
            "876543210",
    ],
    [
      "detached lender bank debit",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0].funding
          .bank_debit++,
    ],
    [
      "corporate credit used as basis",
      (k) => k.form7203_debt_evidence.cash_advance_amount += 5000,
    ],
    [
      "credit omitted from closing loan",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0].closing_principal =
            0,
    ],
    [
      "bank credit wrong calendar",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_unrelated_corporate_credit_inventory[0].executed_on =
            "2025-02-30",
    ],
    [
      "open loan owner",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[1].shareholder_ssn =
            "234567890",
    ],
    [
      "open account written instrument",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[1]
          .no_separate_written_instrument = false,
    ],
    [
      "open net scalar",
      (k) => k.form7203_debt_evidence.open_account_net_advance_amount++,
    ],
    [
      "debt inventory wrong order",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory.reverse(),
    ],
    ["issued gross repayments", (k) => k.box16_code_e_loan_repayment++],
    [
      "missing loan column",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory.pop(),
    ],
    [
      "prior reduced debt",
      (k) => k.form7203_debt_evidence.beginning_debt_basis = 100,
    ],
  ];
  for (const [label, mutate] of mutations) {
    const { inputs } = mixedDebtInputs(mixedDebtCases[0]);
    mutate(inputs.k1_s_corp[0]);
    const r = f1040_2025.executeReturn(inputs as any);
    assertEquals(
      r.diagnostics.some((d) => d.severity === "error"),
      true,
      label,
    );
  }
});
Deno.test("mixed native/PDF reject altered debt totals/owner/QBI and duplicate copies", async () => {
  const { inputs, filer } = mixedDebtInputs(mixedDebtCases[0]),
    r = f1040_2025.executeReturn(inputs as any);
  assertEquals(r.diagnostics, []);
  const mutations: [string, (p: any) => void][] = [
    ["loan basis scalar", (p) => p.form7203.new_loans++],
    ["ordinary loss", (p) => p.form7203.ordinary_loss++],
    [
      "source net",
      (p) =>
        p.k1_s_corp.k1_s_corps[0].form7203_debt_evidence
          .open_account_net_advance_amount++,
    ],
    ["owner", (p) => p.k1_s_corp.k1_s_corps[0].recipient_tin = "234567890"],
    [
      "duplicate issued source",
      (p) =>
        p.k1_s_corp.k1_s_corps.push(structuredClone(p.k1_s_corp.k1_s_corps[0])),
    ],
    ["QBI carry", (p) => p.form8995.line16++],
    ["final AGI", (p) => p.f1040.line11_agi++],
  ];
  for (const [label, mutate] of mutations) {
    const raw = structuredClone(r.pending);
    mutate(raw);
    await assertRejects(
      () => f1040_2025.prepareReturn(raw, filer),
      label,
    );
    const p = buildPending(raw);
    await assertRejects(
      () => buildPdfBytes(p, filer, ".pdf-cache"),
      label,
    );
  }
});

Deno.test("legacy shared source cannot acquire unrelated corporate credit without reviewed mixed contract", async () => {
  const { multiOwnedDebtInputs, multiOwnedDebtCases } = await import(
    "./form7203_multi_owned_debt.fixture.ts"
  );
  const { inputs } = multiOwnedDebtInputs(multiOwnedDebtCases[0]);
  const bank: any =
    (inputs as any).k1_s_corp[0].form7203_debt_evidence.owned_current_records
      .co_owned_corporate_inventory.corporate_bank_ledger;
  bank.transactions[0].credit_reference = "unreviewed corporate bank credit";
  const r = f1040_2025.executeReturn(inputs as any);
  assertEquals(r.diagnostics.some((d) => d.severity === "error"), true);
});

/** Preserve all declared funding amounts and synchronize cash throughout the source.
 * A balances-only replay would accept this phantom500; complete source partition must reject it. */
function addPhantomMixedFunding(n: any) {
  const s = n.owned_current_records,
    bank = s.complete_current_corporate_bank_ledger;
  const before = bank.transactions[0].cash_after;
  const phantom = {
    date: "2025-02-01",
    transaction_reference: "phantom unowned capital transfer",
    corporate_bank_record_reference: "phantom corporate cash credit",
    kind: "capital",
    amount: 500,
    cash_before: before,
    cash_after: before + 500,
  };
  for (const t of bank.transactions.slice(1)) {
    t.cash_before += 500;
    t.cash_after += 500;
  }
  bank.transactions.splice(1, 0, phantom);
  bank.closing_cash += 500;
  const shift = (r: any) => {
    r.corporate_cash_before += 500;
    r.corporate_cash_after += 500;
  };
  shift(s.current_cash_capital_record);
  const formal = s.complete_current_shareholder_debt_inventory[0];
  shift(formal.funding);
  formal.repayments.forEach(shift);
  s.complete_current_shareholder_debt_inventory[1].transactions.forEach(shift);
}
Deno.test("mixed complete cash inventory rejects synchronized unowned phantom funding through public/native/directPDF", async () => {
  const { inputs, filer } = mixedDebtInputs(mixedDebtCases[0]);
  addPhantomMixedFunding(inputs.k1_s_corp[0].form7203_debt_evidence);
  const rejected = f1040_2025.executeReturn(inputs as any);
  assertEquals(
    rejected.diagnostics.some((d) =>
      d.message.includes("Unjoined shareholder capital/debt")
    ),
    true,
  );
  const valid = mixedDebtInputs(mixedDebtCases[0]),
    r = f1040_2025.executeReturn(valid.inputs as any);
  assertEquals(r.diagnostics, []);
  const raw: any = structuredClone(r.pending);
  const notes = new Set([
    raw.k1_s_corp.k1_s_corps[0].form7203_debt_evidence,
    raw.form7203.reviewed_debt_evidence,
  ]);
  for (const n of notes) addPhantomMixedFunding(n);
  await assertRejects(
    () => f1040_2025.prepareReturn(raw, filer),
    Error,
    "Unjoined shareholder capital/debt",
  );
  await assertRejects(
    () => buildPdfBytes(buildPending(raw), filer, ".pdf-cache"),
    Error,
    "Unjoined shareholder capital/debt",
  );
});
