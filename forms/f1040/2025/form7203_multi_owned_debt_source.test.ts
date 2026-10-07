import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  multiOwnedDebtCases,
  multiOwnedDebtInputs,
} from "./form7203_multi_owned_debt.fixture.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (const c of multiOwnedDebtCases) {
  Deno.test(`MFJ multi-owned direct debt ${c.id}: independent basis, required copies, full XML/PDF`, async () => {
    const { inputs, filer } = multiOwnedDebtInputs(c),
      r = f1040_2025.executeReturn(inputs);
    assertEquals(r.diagnostics, []);
    const p: any = buildPending(r.pending), f = p.f1040;
    assertEquals([
      p.schedule1.line5_schedule_e,
      f.line8_additional_income,
      f.line11_agi,
      f.line12c_deduction_total,
      f.line15_taxable_income,
    ], [-c.allowed, -c.allowed, 50000 - c.allowed, 31500, 18500 - c.allowed]);
    // Independent 2025 MFJ Tax Table: $50 intervals, tax at midpoint; all TI below $23,850.
    assertEquals([f.line16_income_tax, f.line24_total_tax, f.line35a_refund], [
      c.tax,
      c.tax,
      8000 - c.tax,
    ]);
    assertEquals([
      r.carryforwards.suspended_scorp_loss_7203,
      r.carryforwards.basis_suspended_scorp_qbi_loss_7203,
      r.carryforwards.qbi_loss_carryforward,
    ], [c.suspended, c.suspended, c.allowed]);
    assertEquals([
      p.form8995.line2,
      p.form8995.line15,
      p.form8995.line16,
      f.line13_qbi_deduction,
    ], [-c.allowed, 0, c.allowed, 0]);
    const copies: readonly any[] = form7203StockLossPdf.instances!(
      p.form7203,
      filer,
      p,
    )!;
    assertEquals(copies.length, inputs.k1_s_corp.length);
    assertEquals(
      copies.map((x) => x.shareholder_ssn),
      inputs.k1_s_corp.map((x: any) => x.recipient_tin),
    );
    assertEquals(
      copies.map(
        (x) => [x.line11_allowable_stock_loss, x.line47_carryover ?? 0],
      ),
      c.individual.map((a) => [1500, 4000 - a]),
    );
    for (let i = 0; i < inputs.k1_s_corp.length; i++) {
      const src = inputs.k1_s_corp[i],
        key = `${src.recipient_tin}_${src.corporation_ein}`;
      assertEquals(
        r.carryforwards[`qbi_loss_carryforward_${key}`],
        c.individual[i],
      );
      assertEquals(
        r.carryforwards[`basis_suspended_scorp_qbi_loss_7203_${key}`] ?? 0,
        4000 - c.individual[i],
      );
    }
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    for (
      const [tag, count] of [["IRS7203", inputs.k1_s_corp.length], [
        "IRS8995",
        1,
      ], [
        "IRS1040ScheduleE",
        1,
      ], ["IRS1040Schedule1", 1]] as const
    ) {
      assertEquals(
        (xml.match(new RegExp(`<${tag}\\b`, "g")) ?? []).length,
        count,
        c.id + tag,
      );
    }
    assertEquals(
      (xml.match(/<QualifiedBusinessIncomeDedGrp\b/g) ?? []).length,
      c.businesses,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
        p,
        filer,
        ".pdf-cache",
        prepared.bundle,
        origins,
      ),
      doc = await PDFDocument.load(pdf);
    assertEquals(doc.getPageCount(), c.pages);
    const textCommand = new Deno.Command("pdftotext", {
      args: ["-layout", "-", "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const textWriter = textCommand.stdin.getWriter();
    await textWriter.write(pdf);
    await textWriter.close();
    const extracted = await textCommand.output();
    assertEquals(extracted.code, 0);
    const shownNames = new TextDecoder().decode(extracted.stdout);
    const textPages = shownNames.split("\f");
    assertEquals(
      textPages[4].includes("Alex Taxpayer and Casey Taxpayer"),
      true,
      "Schedule E joint names",
    );
    assertEquals(
      textPages[c.pages - 1].includes("Alex Taxpayer and Casey Taxpayer"),
      true,
      "Form8995 joint names",
    );
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      origins.filter((o) => o.formKey === "form7203").map((o) => o.formCopy),
      inputs.k1_s_corp.flatMap((_: any, i: number) => [i + 1, i + 1]),
    );
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
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM7203_MULTI_DEBT_EVIDENCE_DIR");
    } catch (e) {
      if (!(e instanceof Deno.errors.NotCapable)) throw e;
    }
    if (dir) {
      await Deno.mkdir(dir, { recursive: true });
      const stem = `${dir}/${c.id}`;
      for (
        const [suffix, value] of Object.entries({
          source: inputs,
          filer,
          pending: p,
          carry: r.carryforwards,
          origins,
          expected: c,
        })
      ) {
        await Deno.writeTextFile(
          `${stem}.${suffix}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${stem}.xml`, xml);
      await Deno.writeFile(`${stem}.pdf`, pdf);
    }
  });
}
Deno.test("Shared/multiple corporations reject incomplete books, owner manifest, allocation and notes", () => {
  const mutations: [string, (i: any) => void][] = [
    ["omit spouse source", (i) => i.k1_s_corp.pop()],
    [
      "duplicate recipient issuer",
      (i) => i.k1_s_corp[1] = structuredClone(i.k1_s_corp[0]),
    ],
    [
      "no shared source",
      (i) =>
        delete i.k1_s_corp[0].form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory,
    ],
    [
      "detached reciprocal books",
      (i) =>
        i.k1_s_corp[1].form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.current_account.paid_ordinary_costs[0]
          .amount++,
    ],
    ["shared bank record detached", (i) => {
      for (const k of i.k1_s_corp) {
        k.form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.corporate_bank_ledger.transactions[2]
          .corporate_bank_record_reference = "detached statement";
      }
    }],
    ["allocated share mismatch", (i) => {
      for (const k of i.k1_s_corp) {
        k.form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.complete_unchanged_stock_register[0]
          .shares++;
      }
    }],
    ["isolated note reconciles but shared bank gap", (i) => {
      const r = i.k1_s_corp[1].form7203_debt_evidence.owned_current_records
        .complete_current_shareholder_debt_inventory[0];
      r.funding.corporate_cash_before++;
      r.funding.corporate_cash_after++;
      for (const k of i.k1_s_corp) {
        const e = k.form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.corporate_bank_ledger.transactions.find(
            (x: any) =>
              x.transaction_reference === r.funding.transfer_reference,
          );
        e.cash_before++;
        e.cash_after++;
      }
    }],
    ["omitted shared repayment", (i) => {
      for (const k of i.k1_s_corp) {
        k.form7203_debt_evidence.owned_current_records
          .co_owned_corporate_inventory.corporate_bank_ledger.transactions
          .pop();
      }
    }],
    ["wrong actual spouse", (i) => i.general.spouse_ssn = "345-67-8901"],
    [
      "duplicate issued reference",
      (i) =>
        i.k1_s_corp[1].source_document_reference =
          i.k1_s_corp[0].source_document_reference,
    ],
  ];
  for (const [label, change] of mutations) {
    const { inputs } = multiOwnedDebtInputs(multiOwnedDebtCases[2]);
    change(inputs);
    let rejected = false;
    try {
      rejected = f1040_2025.executeReturn(inputs).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, label);
  }
  for (const kind of ["missing", "downgraded", "detached"]) {
    const { inputs } = multiOwnedDebtInputs(multiOwnedDebtCases[5]);
    const r = inputs.k1_s_corp[2].form7203_debt_evidence.owned_current_records;
    if (kind === "missing") {
      delete r.complete_current_shareholder_source_inventory;
    }
    if (kind === "downgraded") {
      r.issued_k1_record.no_other_shareholder_trades_or_businesses = true;
    }
    if (kind === "detached") {
      r.complete_current_shareholder_source_inventory.pop();
    }
    let rejected = false;
    try {
      rejected = f1040_2025.executeReturn(inputs).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, kind + " other corporation");
  }
});
Deno.test("Shared/multiple owner native and PDF reject missing copies, pooled basis, detached owner/business/carry", async () => {
  const { inputs, filer } = multiOwnedDebtInputs(multiOwnedDebtCases[5]),
    r = f1040_2025.executeReturn(inputs),
    base: any = buildPending(r.pending);
  const mutations: [string, (p: any) => void][] = [
    ["delete required basis copies", (p) => delete p.form7203],
    [
      "omit fourth source copy",
      (p) => p.form7203.owned_debt_loss_sources.pop(),
    ],
    [
      "swap owner source",
      (p) =>
        p.form7203.owned_debt_loss_sources[1] = structuredClone(
          p.form7203.owned_debt_loss_sources[0],
        ),
    ],
    [
      "pool independently limited loss",
      (p) => p.schedule1.line5_schedule_e = -16000,
    ],
    ["basis-suspended in current carry", (p) => p.form8995.line16 = 16000],
    [
      "omit owner QBI row",
      (p) => p.form8995.owned_s_corp_loss_filing_rows.pop(),
    ],
    [
      "detached shared trade grouping",
      (p) => p.form8995.owned_s_corp_qbi_business_rows[0].qbi = -4000,
    ],
    [
      "changed owned K1",
      (p) => p.k1_s_corp.k1_s_corps[2].source_document_reference = "detached",
    ],
    ["taxable income", (p) => p.f1040.line15_taxable_income++],
    ["manual QBI deduction", (p) => p.f1040.line13_qbi_deduction = 1],
  ];
  for (const [label, change] of mutations) {
    const p = structuredClone(base);
    change(p);
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
