import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  spouseOwnedDebtCases,
  spouseOwnedDebtInputs,
} from "./form7203_spouse_owned_debt.fixture.ts";
import { form7203StockLossPdf } from "./pdf/forms/f7203_stock_loss.ts";
const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (const c of spouseOwnedDebtCases) {
  Deno.test(`MFJ owned direct debt ${c.id}: independent basis, required copies, full XML/PDF`, async () => {
    const { inputs, filer } = spouseOwnedDebtInputs(c),
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
    assertEquals(copies.length, c.owners.length);
    const individualAllowed = c.owners.map((owner) =>
      owner === "S"
        ? (c.repaid ? 3100 : 3500)
        : (c.id === "independent_basis_capacity" ? 4000 : 3500)
    );
    assertEquals(
      copies.map((
        x,
      ) => [x.line11_allowable_stock_loss, x.line47_carryover ?? 0]),
      individualAllowed.map((a) => [1500, 4000 - a]),
    );
    if (c.owners.length === 2) {
      for (let i = 0; i < 2; i++) {
        const ssn = i === 0 ? "123456789" : "234567890",
          ein = i === 0 ? "987654321" : "876543210";
        assertEquals(
          r.carryforwards[`qbi_loss_carryforward_${ssn}_${ein}`],
          individualAllowed[i],
        );
        assertEquals(
          r.carryforwards[`suspended_scorp_loss_7203_${ssn}_${ein}`] ?? 0,
          4000 - individualAllowed[i],
        );
      }
    }

    assertEquals(
      copies.map((x) => x.shareholder_ssn),
      c.owners.map((x) => x === "S" ? "234567890" : "123456789"),
    );
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    for (
      const [tag, count] of [["IRS7203", c.owners.length], ["IRS8995", 1], [
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
      c.owners.length === 2 ? [1, 1, 2, 2] : [1, 1],
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
      dir = Deno.env.get("FORM7203_SPOUSE_DEBT_EVIDENCE_DIR");
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
Deno.test("MFJ owned sources reject wrong claimant, shared issuer/source, bank and direct-note conflicts", () => {
  const mutations: [string, (i: any) => void][] = [
    ["wrong actual spouse", (i) => i.general.spouse_ssn = "345-67-8901"],
    ["nonjoint actual return", (i) => i.general.filing_status = "single"],
    [
      "duplicated whole source",
      (i) => i.k1_s_corp[1] = structuredClone(i.k1_s_corp[0]),
    ],
    [
      "spouse bank belongs primary",
      (i) =>
        i.k1_s_corp[1].form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0].funding.payer_ssn =
            "123456789",
    ],
    [
      "unsourced principal",
      (i) => i.k1_s_corp[1].form7203_debt_evidence.cash_advance_amount++,
    ],
    ["detached issuer", (i) => i.k1_s_corp[1].corporation_ein = "987654321"],
    [
      "guarantee",
      (i) =>
        i.k1_s_corp[1].form7203_debt_evidence.owned_current_records
          .complete_current_shareholder_debt_inventory[0]
          .guarantee_or_cosign_only = true,
    ],
    [
      "missing prior basis record",
      (i) =>
        i.k1_s_corp[1].form7203_debt_evidence.owned_current_records
          .opening_stock_record.prior_annual_basis_records.pop(),
    ],
  ];
  for (const [label, change] of mutations) {
    const { inputs } = spouseOwnedDebtInputs(spouseOwnedDebtCases[3]);
    change(inputs);
    let rejected = false;
    try {
      rejected = f1040_2025.executeReturn(inputs).diagnostics.length > 0;
    } catch {
      rejected = true;
    }
    assertEquals(rejected, true, label);
  }
});
Deno.test("MFJ native and PDF reject omitted shareholder copy, pooled loss, owner and finalized-QBI conflicts", async () => {
  const { inputs, filer } = spouseOwnedDebtInputs(spouseOwnedDebtCases[5]),
    r = f1040_2025.executeReturn(inputs),
    base: any = buildPending(r.pending);
  const mutations: [string, (p: any) => void][] = [
    ["delete both mandatory forms", (p) => {
      delete p.form7203;
      delete p.form8995;
    }],
    [
      "delete spouse basis source",
      (p) => p.form7203.owned_debt_loss_sources.pop(),
    ],
    [
      "replace spouse copy by primary",
      (p) =>
        p.form7203.owned_debt_loss_sources[1] = structuredClone(
          p.form7203.owned_debt_loss_sources[0],
        ),
    ],
    [
      "remove spouse QBI business",
      (p) => p.form8995.owned_s_corp_loss_filing_rows.pop(),
    ],
    ["pooled allowed loss", (p) => p.schedule1.line5_schedule_e = -8000],
    [
      "include basis-suspended loss in current carry",
      (p) => p.form8995.line16 = 8000,
    ],
    [
      "detached source",
      (p) => p.k1_s_corp.k1_s_corps[1].source_document_reference = "detached",
    ],
    ["wrong spouse SSN", (p) => p.general.spouse_ssn = "345-67-8901"],
    ["wrong taxable income", (p) => p.f1040.line15_taxable_income++],
    ["nonzero QBI deduction", (p) => p.f1040.line13_qbi_deduction = 1],
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
