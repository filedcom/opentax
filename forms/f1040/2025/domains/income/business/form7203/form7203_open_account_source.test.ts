import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form7203StockLossPdf } from "../../../../pdf/forms/income/business/f7203_stock_loss.ts";
import {
  openAccountCases,
  openAccountInputs,
} from "./form7203_open_account.fixture.ts";
import { replayOpenAccount } from "../../../../../nodes/intermediate/forms/income/business/form7203/open-account.ts";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (const c of openAccountCases) {
  Deno.test(`owned open-account ${c.id}: public basis/netting/QBI/full native/XSD/PDF`, async () => {
    const { inputs, filer } = openAccountInputs(c),
      r = f1040_2025.executeReturn(inputs as any),
      p: any = buildPending(r.pending),
      f = p.f1040;
    assertEquals(r.diagnostics, []);
    const joint = inputs.general.filing_status === "mfj",
      taxable = 50000 - c.allowed - (joint ? 31500 : 15750);
    const midpoint = Math.floor(taxable / 50) * 50 + 25;
    const tax = joint
      ? Math.round(midpoint * .1)
      : Math.round(11925 * .1 + (midpoint - 11925) * .12);
    assertEquals([
      p.schedule1.line5_schedule_e,
      f.line11_agi,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], [-c.allowed, 50000 - c.allowed, taxable, tax, tax, 8000 - tax]);
    assertEquals([
      r.carryforwards.suspended_scorp_loss_7203 ?? 0,
      r.carryforwards.basis_suspended_scorp_qbi_loss_7203 ?? 0,
      r.carryforwards.qbi_loss_carryforward,
    ], [c.carry, c.carry, c.allowed]);
    assertEquals([
      p.form8995.line2,
      p.form8995.line15,
      p.form8995.line16,
      f.line13_qbi_deduction,
    ], [-c.allowed, 0, c.allowed, 0]);
    const sources: any[] = (p.k1_s_corp as any).k1_s_corps;
    const copies: readonly any[] = form7203StockLossPdf.instances!(
      p.form7203,
      filer,
      p,
    )!;
    assertEquals(copies.length, sources.length);
    const accounts = sources.map((s: any, i: number) => {
      const n = s.form7203_debt_evidence;
      if (n.kind !== "owned_2025_open_account") return undefined;
      const calc = replayOpenAccount(
        n.owned_current_records.complete_current_shareholder_debt_inventory[0],
      );
      assertEquals([
        copies[i].open_account_debt1,
        copies[i].formal_note_debt1,
        copies[i].line17_debt1,
        copies[i].line19_debt1 ?? 0,
        copies[i].line20_debt1,
      ], [true, undefined, calc.netAdvance, 0, calc.endingPrincipal]);
      assertEquals(
        copies[i].line25_debt1,
        calc.netAdvance === 0 ? undefined : "1.0000",
      );
      assertEquals(s.box16_code_e_loan_repayment, calc.repayments);
      const key = `${s.recipient_tin}_${s.corporation_ein}`;
      assertEquals([
        r.carryforwards[`open_account_principal_7203_${key}`],
        r.carryforwards[`open_account_debt_basis_7203_${key}`],
        r.carryforwards[`open_account_next_year_separate_debt_7203_${key}`],
      ], [
        calc.endingPrincipal,
        calc.endingPrincipal - copies[i].line30_debt1,
        calc.endingPrincipal > 25000 ? 1 : 0,
      ]);
      if (c.id === "year_end_25000") {
        assertEquals(calc.nextYearTreatment, "open_account");
      }
      if (c.id === "year_end_25001") {
        assertEquals(
          calc.nextYearTreatment,
          "separately_tracked_debt_under_1_1367_2_a_2_ii",
        );
      }
      if (c.id === "peak_not_year_end") {
        assertEquals([
          calc.peakPrincipal,
          calc.endingPrincipal,
          calc.nextYearTreatment,
        ], [28000, 24000, "open_account"]);
      }
      return calc;
    });
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS7203\b/g) ?? []).length, sources.length);
    assertEquals(
      (xml.match(/<OpenAccountDebtInd>X<\/OpenAccountDebtInd>/g) ?? []).length,
      accounts.filter(Boolean).length,
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
    assertEquals(doc.getPageCount(), c.pages);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      origins.filter((o) => o.formKey === "form7203").map((o) => o.formCopy),
      sources.flatMap((_: unknown, i: number) => [i + 1, i + 1]),
    );
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM7203_OPEN_ACCOUNT_EVIDENCE_DIR");
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
            basisSuspended: c.carry,
            qbiCarry: c.allowed,
            tax,
            pages: c.pages,
            accounts,
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
Deno.test("open-account rejects detached direct funding/repayment/history/issued and owner source", () => {
  const mutate: [string, (k: any) => void][] = [
    [
      "no written instrument false",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .no_separate_written_instrument = false,
    ],
    [
      "missing oral creditor terms",
      (k) =>
        delete k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .oral_creditor_terms_record,
    ],
    [
      "oral terms owner",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .oral_creditor_terms_record.shareholder_ssn = "345678901",
    ],
    [
      "2026 without prior evidence",
      (k) => k.form7203_debt_evidence.owned_current_records.tax_year = 2026,
    ],
    [
      "fake signed note",
      (k) =>
        k.form7203_debt_evidence.signed_note_document_reference =
          "fictional instrument",
    ],
    [
      "prior principal",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].opening_principal =
            100,
    ],
    [
      "reduced prior basis",
      (k) =>
        k.form7203_debt_evidence.owned_current_records.opening_stock_record
          .prior_annual_basis_records[0].debt_basis_reductions = 1,
    ],
    [
      "guaranteed debt",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .guarantee_or_cosign_only = true,
    ],
    [
      "corporate lender",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].creditor_kind =
            "corporation",
    ],
    [
      "detached owner",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].transactions[0]
          .shareholder_ssn = "345678901",
    ],
    [
      "cash mismatch",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].transactions[1]
          .shareholder_cash_after++,
    ],
    [
      "principal rollforward",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].transactions[2]
          .closing_principal++,
    ],
    [
      "missing repayment",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].transactions.splice(
            1,
            1,
          ),
    ],
    ["duplicate bank record", (k) => {
      const t = k.form7203_debt_evidence.owned_current_records
        .complete_current_shareholder_debt_inventory[0].transactions;
      t[1].shareholder_bank_reference = t[0].shareholder_bank_reference;
    }],
    [
      "impossible calendar",
      (k) =>
        k.form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].transactions[0].date =
            "2025-02-30",
    ],
    [
      "manual net deduction",
      (k) => k.form7203_debt_evidence.cash_advance_amount++,
    ],
    ["issued gross repayment", (k) => k.box16_code_e_loan_repayment++],
  ];
  for (const [label, fn] of mutate) {
    const { inputs } = openAccountInputs(openAccountCases[0]);
    fn((inputs as any).k1_s_corp[0]);
    let rejected = false;
    try {
      rejected = f1040_2025.executeReturn(inputs as any).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, label);
  }
  const { inputs } = openAccountInputs(
    openAccountCases.find((c) => c.id === "shared_mixed_debt")!,
  );
  const rows = (inputs as any).k1_s_corp;
  rows[1].form7203_debt_evidence.owned_current_records
    .co_owned_corporate_inventory.corporate_bank_ledger.transactions[1]
    .amount++;
  assertEquals(f1040_2025.executeReturn(inputs).diagnostics.length > 0, true);
});
Deno.test("open-account export rejects altered source, omitted owner copies and basis/QBI/tax conflicts", async () => {
  const { inputs, filer } = openAccountInputs(
      openAccountCases.find((c) => c.id === "spouse_accounts")!,
    ),
    r = f1040_2025.executeReturn(inputs as any);
  const mutations: [string, (p: any) => void][] = [
    ["copy omission", (p) => delete p.form7203],
    ["QBI copy omission", (p) => delete p.form8995],
    ["owner omitted", (p) => p.form7203.owned_debt_loss_sources.pop()],
    [
      "source crossjoin",
      (p) => p.k1_s_corp.k1_s_corps[1].recipient_tin = "123456789",
    ],
    [
      "pretend formal source",
      (p) =>
        p.k1_s_corp.k1_s_corps[1].form7203_debt_evidence.kind =
          "owned_2025_formal_notes",
    ],
    ["suspended QBI loss", (p) => p.form8995.line16 += 1400],
    ["loss pooling", (p) => p.schedule1.line5_schedule_e = -7000],
    ["tax", (p) => p.f1040.line16_income_tax++],
  ];
  for (const [label, mutate] of mutations) {
    const p: any = structuredClone(buildPending(r.pending));
    mutate(p);
    await assertRejects(
      () => f1040_2025.prepareReturn(p, filer),
      Error,
      undefined,
      label + " native",
    );
    await assertRejects(
      () => buildPdfBytes(p, filer, ".pdf-cache"),
      Error,
      undefined,
      label + " PDF",
    );
  }
});
