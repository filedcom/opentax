import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  filedReturn,
  filer,
  ownedDebtCases,
  ownedDebtInputs,
  ownedDebtSource,
} from "./form7203_owned_debt.fixture.ts";
import { ownedSCorpLossLines } from "../nodes/intermediate/forms/form8995/owned-s-corp-loss.ts";
import { form8995 } from "./mef/forms/f8995.ts";
import { form8995Pdf } from "./pdf/forms/f8995.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";

const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
// Independent 2025 single Tax Table rows: TI30750,31150,32150,31350.
// Each row spans $50; tax is calculated at the midpoint.
const expectedTax: Record<string, number> = {
  new_note: 3455,
  partial_repayment: 3503,
  two_repayments: 3623,
  two_notes: 3527,
};
for (const c of ownedDebtCases) {
  Deno.test(`owned direct-note ${c.id}: full source to basis/allowed-QBI loss and complete XML/PDF`, async () => {
    const source = ownedDebtSource(c.repayments, c.second, c.capital);
    const r = filedReturn(source);
    assertEquals(r.diagnostics, []);
    const p: any = buildPending(r.pending), f = p.f1040;
    assertEquals([
      p.schedule1.line5_schedule_e,
      f.line8_additional_income,
      f.line11_agi,
      f.line12c_deduction_total,
      f.line15_taxable_income,
    ], [-c.allowed, -c.allowed, 50000 - c.allowed, 15750, 34250 - c.allowed]);
    assertEquals([f.line16_income_tax, f.line24_total_tax, f.line35a_refund], [
      expectedTax[c.id],
      expectedTax[c.id],
      8000 - expectedTax[c.id],
    ]);
    assertEquals([
      r.carryforwards.suspended_scorp_loss_7203,
      r.carryforwards.qbi_loss_carryforward,
      r.carryforwards.basis_suspended_scorp_qbi_loss_7203,
    ], [c.carry, c.allowed, c.carry]);
    assertEquals([
      p.form8995.line1_qbi,
      p.form8995.line2,
      p.form8995.line4,
      p.form8995.line15,
      p.form8995.line16,
      f.line13_qbi_deduction,
    ], [-c.allowed, -c.allowed, 0, 0, c.allowed, 0]);
    const printed: any =
      form7203StockLossPdf.instances!(p.form7203, filer, p)![0];
    assertEquals([
      printed.line1_beginning_basis,
      printed.line11_allowable_stock_loss,
      printed.line47_carryover,
    ], [500, c.capital ? 1500 : 500, c.carry]);
    assertEquals(printed.line21_debt1, 0);
    assertEquals(printed.line25_debt1, "1.0000");
    const qbi: any = form8995Pdf.projectFields!(p.form8995, p);
    assertEquals([qbi.line1_qbi, qbi.line16, qbi.line15], [
      -c.allowed,
      c.allowed,
      0,
    ]);
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    for (
      const name of [
        "IRS7203",
        "IRS8995",
        "IRS1040ScheduleE",
        "IRS1040Schedule1",
        "IRSW2",
      ]
    ) {
      assertEquals(
        (xml.match(new RegExp(`<${name}\\b`, "g")) ?? []).length,
        1,
        c.id + " " + name,
      );
    }
    assertStringIncludes(
      xml,
      `<QlfyBusinessIncomeOrLossAmt>-${c.allowed}</QlfyBusinessIncomeOrLossAmt>`,
    );
    assertStringIncludes(
      xml,
      `<TotQlfyBusLossCarryforwardAmt>${c.allowed}</TotQlfyBusLossCarryforwardAmt>`,
    );
    const dir = (() => {
      try {
        return Deno.env.get("FORM7203_OWNED_DEBT_EVIDENCE_DIR");
      } catch (e) {
        if (e instanceof Deno.errors.NotCapable) return undefined;
        throw e;
      }
    })();
    const stem = dir ? `${dir}/${c.id}` : undefined;
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      p,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const doc = await PDFDocument.load(pdf);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(origins.map((o) => [o.formKey, o.formCopy]), [
      ["f1040", 1],
      ["f1040", 1],
      ["schedule1", 1],
      ["schedule1", 1],
      ["schedule_e", 1],
      ["form7203", 1],
      ["form7203", 1],
      ["form8995", 1],
    ]);
    assertEquals(doc.getPageCount(), 8);
    const cmd = new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, "-"],
      stdin: "piped",
      stderr: "piped",
      stdout: "piped",
    }).spawn();
    const w = cmd.stdin.getWriter();
    await w.write(new TextEncoder().encode(xml));
    await w.close();
    const checked = await cmd.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    if (stem) {
      await Deno.mkdir(dir!, { recursive: true });
      await Deno.writeTextFile(
        `${stem}.source.json`,
        JSON.stringify(ownedDebtInputs(source), null, 2),
      );
      await Deno.writeTextFile(
        `${stem}.pending.json`,
        JSON.stringify(p, null, 2),
      );
      await Deno.writeTextFile(
        `${stem}.carry.json`,
        JSON.stringify(r.carryforwards, null, 2),
      );
      await Deno.writeTextFile(
        `${stem}.origins.json`,
        JSON.stringify(origins, null, 2),
      );
      await Deno.writeTextFile(
        `${stem}.expected.json`,
        JSON.stringify(
          {
            allowed: c.allowed,
            basisSuspended: c.carry,
            qbiCarry: c.allowed,
            tax: expectedTax[c.id],
            pages: doc.getPageCount(),
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${stem}.xml`, xml);
      await Deno.writeFile(`${stem}.pdf`, pdf);
    }
  });
}

Deno.test("owned direct debt rejects altered ownership, guarantees, funding, source stock history, issued loss and QBI records", () => {
  const changes: [string, (s: any) => void][] = [
    [
      "missing owned records",
      (s) => delete s.form7203_debt_evidence.owned_current_records,
    ],
    [
      "guarantee only",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .guarantee_or_cosign_only = true,
    ],
    [
      "corporate lender",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].creditor_kind =
            "corporation",
    ],
    [
      "pass through funds",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].funding.funds_origin =
            "passthrough_funds",
    ],
    [
      "bank owner",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].funding.payer_ssn =
            "999999999",
    ],
    [
      "cash not received",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].funding
          .corporate_cash_after++,
    ],
    [
      "principal ledger",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].principal_entries[1]
          .closing_principal++,
    ],
    [
      "missing prior basis year",
      (s) =>
        s.form7203_debt_evidence.owned_current_records.opening_stock_record
          .prior_annual_basis_records.pop(),
    ],
    [
      "prior debt loss",
      (s) =>
        s.form7203_debt_evidence.owned_current_records.opening_stock_record
          .prior_annual_basis_records[5].debt_basis_reductions = 1,
    ],
    [
      "unproved stock payment",
      (s) =>
        s.form7203_debt_evidence.owned_current_records.opening_stock_record
          .original_cash_bank_record.bank_debit++,
    ],
    ["impossible calendar date joined", (s) => {
      s.form7203_debt_evidence.note_execution_date = "2025-02-30";
      let a = s.form7203_debt_evidence.owned_current_records
        .complete_current_shareholder_debt_inventory[0];
      a.executed_on = "2025-02-30";
      a.funding.transferred_on = "2025-02-30";
      a.principal_entries[0].date = "2025-02-30";
    }],
    [
      "corporate ordinary costs",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .current_corporate_ordinary_account.paid_ordinary_costs[0].amount++,
    ],
    [
      "passive work",
      (s) =>
        s.form7203_debt_evidence.owned_current_records
          .shareholder_participation_records.monthly_service_hours.forEach((
            r: any,
          ) => r.hours = 40),
    ],
    [
      "issued QBI loss",
      (s) =>
        s.form7203_debt_evidence.owned_current_records.issued_k1_record
          .qualified_business_ordinary_loss_before_basis++,
    ],
    ["manual QBI", (s) => s.qbi_amount = -4000],
    ["wrong shareholder", (s) => s.recipient_tin = "999999999"],
    ["codeE amount", (s) => s.box16_code_e_loan_repayment++],
  ];
  for (const [name, mutate] of changes) {
    const s = ownedDebtSource([400]);
    mutate(s);
    assertThrows(() => ownedSCorpLossLines(s, 32150), Error, undefined, name);
    let rejected = false;
    try {
      rejected = filedReturn(s).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, name + " public source");
  }
});

Deno.test("owned basis-limited QBI loss rejects detached native/PDF carry, basis, source and finalized tax", async () => {
  const r = filedReturn(ownedDebtSource([400]));
  const base: any = buildPending(r.pending);
  const mutations: [string, (p: any) => void][] = [
    ["missing required both copies", (p) => {
      delete p.form7203;
      delete p.form8995;
    }],
    ["line16 includes basis suspended loss", (p) => p.form8995.line16 = 4000],
    ["qbi scalar", (p) => p.form8995.qbi = -4000],
    [
      "negative line1 includes suspended loss",
      (p) => p.form8995.line1_qbi = -4000,
    ],
    ["deleted source", (p) => delete p.form8995.owned_s_corp_loss_source],
    [
      "changed actual issued statement",
      (p) =>
        p.k1_s_corp.k1_s_corps[0].form7203_debt_evidence.owned_current_records
          .issued_k1_record.section199a_statement_reference =
            "detached statement",
    ],
    ["allowed Schedule1 loss", (p) => p.schedule1.line5_schedule_e--],
    ["loan input", (p) => p.form7203.new_loans++],
    ["taxable income", (p) => p.f1040.line15_taxable_income++],
    ["deduction", (p) => p.f1040.line13_qbi_deduction = 1],
    ["filer SSN", (p) => p.general.taxpayer_ssn = "999-99-9999"],
  ];
  for (const [name, mutate] of mutations) {
    const p = structuredClone(base);
    mutate(p);
    assertThrows(
      () => form8995.build!(p.form8995, { filer, pending: p } as any),
      Error,
      undefined,
      name,
    );
    assertThrows(
      () => form8995Pdf.projectFields!(p.form8995, p),
      Error,
      undefined,
      name,
    );
    await assertRejects(
      () => buildPdfBytes(p, filer, ".pdf-cache"),
      Error,
      undefined,
      name + " full PDF",
    );
    await assertRejects(
      () => f1040_2025.prepareReturn(p, filer),
      Error,
      undefined,
      name,
    );
  }
});

Deno.test("provided owned records cannot be ignored by downgrading the legacy source kind", () => {
  const s = ownedDebtSource([400]);
  s.form7203_debt_evidence.kind = "new_2025_formal_notes";
  const r = filedReturn(s);
  assertEquals(r.diagnostics, []);
  assertEquals(r.carryforwards.qbi_loss_carryforward, 2100);
  assertEquals(r.carryforwards.basis_suspended_scorp_qbi_loss_7203, 1900);
  s.form7203_debt_evidence.owned_current_records
    .complete_current_shareholder_debt_inventory[0].funding.bank_credit++;
  assertEquals(filedReturn(s).diagnostics.length > 0, true);
});

Deno.test("owned current cash-capital source must independently match the actual contribution ledger", () => {
  for (const kind of ["missing", "credit", "shareholder", "date", "amount"]) {
    const s = ownedDebtSource([400], false, true),
      records = s.form7203_debt_evidence.owned_current_records;
    if (kind === "missing") delete records.current_cash_capital_record;
    if (kind === "credit") {
      records.current_cash_capital_record.corporate_bank_credit++;
    }
    if (kind === "shareholder") {
      records.current_cash_capital_record.shareholder_ssn = "999999999";
    }
    if (kind === "date") {
      records.current_cash_capital_record.contributed_on = "2025-02-11";
    }
    if (kind === "amount") {
      s.form7203_stock_loss_ledger.cash_capital_contribution.amount++;
    }
    assertThrows(() => ownedSCorpLossLines(s, 31150), Error, undefined, kind);
    assertEquals(
      filedReturn(s).diagnostics.length > 0,
      true,
      kind + " public source",
    );
  }
});
