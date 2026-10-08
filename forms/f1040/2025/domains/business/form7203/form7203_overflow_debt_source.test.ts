import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../index.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { form7203StockLossPdf } from "../../../pdf/forms/business/f7203_stock_loss.ts";
import {
  overflowDebtCases,
  overflowDebtInputs,
  overflowFamilyInputs,
} from "./form7203_overflow_debt.fixture.ts";

const xsd =
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
for (
  const c of [...overflowDebtCases, { id: "independent_owners", allowed: 7600 }]
) {
  Deno.test(`overflow ${c.id}: complete source/PartII copies/native/fullXSD/PDF`, async () => {
    const family = c.id === "independent_owners",
      { inputs, filer } = family
        ? overflowFamilyInputs()
        : overflowDebtInputs(c as typeof overflowDebtCases[number]);
    const r = f1040_2025.executeReturn(inputs as any),
      p: any = buildPending(r.pending);
    assertEquals(r.diagnostics, []);
    const joint = inputs.general.filing_status === "mfj",
      taxable = 50000 - c.allowed - (joint ? 31500 : 15750),
      mid = Math.floor(taxable / 50) * 50 + 25,
      tax = joint
        ? Math.round(mid * .1)
        : Math.round(11925 * .1 + (mid - 11925) * .12);
    assertEquals([
      p.schedule1.line5_schedule_e,
      p.f1040.line11_agi,
      p.f1040.line15_taxable_income,
      p.f1040.line24_total_tax,
      p.f1040.line35a_refund,
    ], [-c.allowed, 50000 - c.allowed, taxable, tax, 8000 - tax]);
    const suspended = (family ? 8000 : 4000) - c.allowed;
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
    const ownerSpecs = family
      ? [overflowDebtCases[1], overflowDebtCases[3]]
      : [c as typeof overflowDebtCases[number]];
    let offset = 0, debtCount = 0;
    for (let owner = 0; owner < ownerSpecs.length; owner++) {
      const spec = ownerSpecs[owner],
        note: any = (inputs.k1_s_corp[owner] as any).form7203_debt_evidence;
      const formal = [
        {
          ...note,
          payment: (note.principal_repayments ?? []).reduce(
            (n: number, r: any) => n + r.amount,
            0,
          ),
        },
        ...[note.second_formal_note, ...note.additional_formal_notes].map(
          (n) => ({ ...n, payment: n.principal_repayment?.amount ?? 0 }),
        ),
      ];
      const rows = [
        ...formal.map((n) => ({
          id: n.formal_note_id,
          advance: n.cash_advance_amount,
          repayment: n.payment,
          open: false,
        })),
        {
          id: note.owned_current_records
            .complete_current_shareholder_debt_inventory.at(-1)
            .account_reference,
          advance: note.open_account_net_advance_amount,
          repayment: 0,
          open: true,
        },
      ];
      debtCount += rows.length;
      const capacities = rows.map((n) => n.advance - n.repayment),
        total = capacities.reduce((n, v) => n + v, 0),
        loss = spec.allowed - 1500,
        expected = spec.lossColumns;
      for (let start = 0; start < rows.length; start += 3) {
        const copy = copies[offset++];
        assertEquals(copy.part_ii_continuation, start > 0 ? true : undefined);
        assertEquals(copy.shareholder_ssn, note.shareholder_ssn);
        assertEquals(copy.corporation_ein, note.corporation_ein);
        assertEquals(copy.debt_column_start, start + 1);
        assertEquals(copy.debt_column_count, rows.length);
        assertEquals(
          copy.debt_source_references,
          rows.slice(start, start + 3).map((n) => n.id),
        );
        if (start === 0) {
          assertEquals([
            copy.line17_total,
            copy.line19_total,
            copy.line20_total,
            copy.line30_total,
            copy.line31_total,
          ], [
            rows.reduce((n, r) => n + r.advance, 0),
            rows.reduce((n, r) => n + r.repayment, 0),
            total,
            loss,
            total - loss,
          ]);
        } else {assertEquals(
            Object.keys(copy).some((k) =>
              k.endsWith("_total") ||
              /^line(1_|2_|5_|7_|10_|11_|14_|15_|35_|47_)/.test(k)
            ),
            false,
          );}
        for (let j = 0; j < 3; j++) {
          const row = rows[start + j], col = j + 1;
          if (!row) {
            assertEquals(copy[`line17_debt${col}`], undefined);
            continue;
          }
          assertEquals(
            copy[`${row.open ? "open_account" : "formal_note"}_debt${col}`],
            true,
          );
          assertEquals([
            copy[`line17_debt${col}`],
            copy[`line19_debt${col}`] ?? 0,
            copy[`line20_debt${col}`],
            copy[`line30_debt${col}`],
            copy[`line31_debt${col}`],
          ], [
            row.advance,
            row.repayment,
            capacities[start + j],
            expected[start + j],
            capacities[start + j] - expected[start + j],
          ]);
          assertEquals(
            copy[`line25_debt${col}`],
            row.advance ? "1.0000" : undefined,
          );
        }
      }
      const key = `${note.shareholder_ssn}_${note.corporation_ein}`;
      for (const [i, row] of rows.entries()) {
        const label = `current_debt_${row.id}`;
        assertEquals([
          r.carryforwards[`${label}_principal_7203_${key}`],
          r.carryforwards[`${label}_debt_basis_7203_${key}`],
          r.carryforwards[`${label}_exact_loss_numerator_7203_${key}`],
          r.carryforwards[`${label}_exact_basis_numerator_7203_${key}`],
        ], [
          capacities[i],
          capacities[i] - expected[i],
          capacities[i] * loss,
          capacities[i] * (total || 1) - capacities[i] * loss,
        ]);
      }
      assertEquals(
        r.carryforwards[`mixed_debt_exact_loss_denominator_7203_${key}`],
        total || 1,
      );
    }
    assertEquals(copies.length, offset);
    const prepared = await f1040_2025.prepareReturn(r.pending, filer),
      xml = prepared.bundle.xml;
    assertEquals((xml.match(/<IRS7203\b/g) ?? []).length, ownerSpecs.length);
    assertEquals(
      (xml.match(/<ShareholderDebtBasisGrp>/g) ?? []).length,
      debtCount,
    );
    assertEquals(
      (xml.match(/<OpenAccountDebtInd>X<\/OpenAccountDebtInd>/g) ?? []).length,
      ownerSpecs.length,
    );
    const child = new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, "-"],
        stdin: "piped",
        stderr: "piped",
        stdout: "piped",
      }).spawn(),
      w = child.stdin.getWriter();
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
      doc = await PDFDocument.load(pdf),
      pages = 6 + 2 * copies.length;
    assertEquals(doc.getPageCount(), pages);
    assertEquals(doc.getForm().getFields().length, 0);
    assertEquals(
      origins.filter((o) => o.formKey === "form7203").map((o) => o.formCopy),
      copies.flatMap((_: any, i: number) => [i + 1, i + 1]),
    );
    let dir: string | undefined;
    try {
      dir = Deno.env.get("FORM7203_OVERFLOW_DEBT_EVIDENCE_DIR");
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
            basisSuspended: suspended,
            qbiCarry: c.allowed,
            tax,
            pages,
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
Deno.test("overflow rejects missing/cross-owned/colliding instruments and unjoined cash", () => {
  const mutations: [string, (n: any) => void][] = [
    ["missing outer note", (n) => n.additional_formal_notes.pop()],
    [
      "missing source note",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory
          .splice(2, 1),
    ],
    [
      "duplicate instrument",
      (n) =>
        n.additional_formal_notes[0].formal_note_id =
          n.second_formal_note.formal_note_id,
    ],
    [
      "wrong owner",
      (n) => n.additional_formal_notes[0].shareholder_lender_ssn = "234567890",
    ],
    [
      "prior basis",
      (n) => n.additional_formal_notes[0].beginning_note_debt_basis = 100,
    ],
    [
      "repayment conflict",
      (n) => n.additional_formal_notes[0].principal_repayment.amount++,
    ],
    [
      "missing funding",
      (n) =>
        n.owned_current_records.complete_current_shareholder_debt_inventory[2]
          .funding.bank_credit++,
    ],
    [
      "phantom note",
      (n) =>
        n.owned_current_records.complete_current_corporate_bank_ledger
          .transactions.push({
            ...n.owned_current_records.complete_current_corporate_bank_ledger
              .transactions[0],
            kind: "note_advance",
            amount: 200,
            shareholder_ssn: undefined,
            formal_note_id: undefined,
          }),
    ],
    ["open incorrectly moved into notes", (n) => {
      const rows =
        n.owned_current_records.complete_current_shareholder_debt_inventory;
      [rows[2], rows[3]] = [rows[3], rows[2]];
    }],
  ];
  for (const [label, change] of mutations) {
    const { inputs } = overflowDebtInputs(overflowDebtCases[0]);
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
Deno.test("overflow native/directPDF reject altered owner inventory, loss/carry and final tax", async () => {
  const { inputs, filer } = overflowFamilyInputs(),
    r = f1040_2025.executeReturn(inputs as any);
  assertEquals(r.diagnostics, []);
  const mutations: [string, (p: any) => void][] = [
    [
      "extra advance",
      (p) =>
        p.k1_s_corp.k1_s_corps[1].form7203_debt_evidence
          .additional_formal_notes[2].cash_advance_amount++,
    ],
    [
      "extra repayment",
      (p) =>
        p.k1_s_corp.k1_s_corps[0].form7203_debt_evidence
          .additional_formal_notes[0].principal_repayment.amount++,
    ],
    ["source copy omitted", (p) => p.form7203.owned_debt_loss_sources.pop()],
    [
      "duplicate owner",
      (p) =>
        p.k1_s_corp.k1_s_corps.push(structuredClone(p.k1_s_corp.k1_s_corps[0])),
    ],
    [
      "cross owner",
      (p) =>
        p.k1_s_corp.k1_s_corps[1].form7203_debt_evidence
          .additional_formal_notes[0].shareholder_lender_ssn = "123456789",
    ],
    ["AGI", (p) => p.f1040.line11_agi++],
    ["QBI carry", (p) => p.form8995.line16++],
  ];
  for (const [label, change] of mutations) {
    const p = structuredClone(r.pending);
    change(p);
    await assertRejects(() => f1040_2025.prepareReturn(p, filer), label);
    await assertRejects(
      () => buildPdfBytes(buildPending(p), filer, ".pdf-cache"),
      label,
    );
  }
});
