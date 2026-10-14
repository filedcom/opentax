import { assertEquals, assertExists, assertRejects } from "@std/assert";
import {
  ownedDebtInputs,
  ownedDebtSource,
} from "./form7203_owned_debt.fixture.ts";
import { inputSchema as k1Schema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { reviewedNewFormalNotesSchema } from "../../../../../nodes/intermediate/forms/income/business/form7203/debt-note.ts";
import { ownedCurrentDebtRecordsBaseSchema } from "../../../../../nodes/intermediate/forms/income/business/form7203/owned-current-source.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
for (const second of [false, true]) {
  Deno.test(`Form7203 dated repayment inventories on ${second ? "two" : "one"} formal notes`, async () => {
    const first =
      k1Schema.parse({ k1_s_corps: [ownedDebtSource([400], second, false)] })
        .k1_s_corps[0];
    const note = reviewedNewFormalNotesSchema.parse(
      first.form7203_debt_evidence,
    );
    const records = ownedCurrentDebtRecordsBaseSchema.parse(
      note.owned_current_records,
    );
    note.owned_current_records = records;
    for (
      const [i, record] of records.complete_current_shareholder_debt_inventory
        .entries()
    ) {
      const prior = record.repayments[0];
      const outer = i === 0 ? note : note.second_formal_note;
      assertExists(outer);
      const amount = prior.principal_amount;
      const amounts = [amount / 4, amount / 4, amount / 2];
      let principal = record.stated_principal,
        corporate = prior.corporate_cash_before,
        shareholder = prior.shareholder_cash_before;
      record.repayments = amounts.map((part, j) => {
        const beforeCorporate = corporate, beforeShareholder = shareholder;
        corporate -= part;
        shareholder += part;
        return {
          ...prior,
          date: `2025-10-${10 + j}`,
          principal_amount: part,
          corporate_loan_ledger_reference:
            `${prior.corporate_loan_ledger_reference} part${j}`,
          shareholder_bank_deposit_reference:
            `${prior.shareholder_bank_deposit_reference} part${j}`,
          corporate_bank_reference:
            `${prior.corporate_bank_reference} part${j}`,
          corporate_cash_before: beforeCorporate,
          corporate_cash_after: corporate,
          shareholder_cash_before: beforeShareholder,
          shareholder_cash_after: shareholder,
        };
      });
      record.principal_entries = [
        record.principal_entries[0],
        ...record.repayments.map((p) => {
          principal -= p.principal_amount;
          return {
            date: p.date,
            transaction_reference: p.corporate_loan_ledger_reference,
            kind: "repayment" as const,
            principal_amount: p.principal_amount,
            closing_principal: principal,
          };
        }),
      ];
      if ("principal_repayment" in outer) outer.principal_repayment = undefined;
      outer.principal_repayments = record.repayments.map((p) => ({
        formal_note_id: record.formal_note_id,
        date: p.date,
        amount: p.principal_amount,
        corporate_loan_ledger_reference: p.corporate_loan_ledger_reference,
        shareholder_bank_deposit_reference:
          p.shareholder_bank_deposit_reference,
        principal_only_confirmed: true as const,
      }));
    }
    const inputs = ownedDebtInputs({ ...first, form7203_debt_evidence: note });
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const allowed = second ? 2900 : 2100, taxable = 50000 - allowed - 15750;
    const tax = Math.round((Math.floor(taxable / 50) * 50 + 25) * .12 - 238.5);
    assertEquals(pending.f1040.line11_agi, 50000 - allowed);
    assertEquals(pending.f1040.line15_taxable_income, taxable);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(result.carryforwards.qbi_loss_carryforward, allowed);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = (() => {
        try {
          return Deno.env.get("FORM7203_REPAYMENT_INVENTORY_DIR");
        } catch (error) {
          if (error instanceof Deno.errors.NotCapable) return undefined;
          throw error;
        }
      })(),
      id = second ? "two-formal" : "one-formal";
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            origins,
            carryforwards: result.carryforwards,
            expected: { allowed, taxable, tax, refund: 8000 - tax },
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${id}.pdf`, pdf);
    }
    const altered = {
      ...pending,
      f1040: { ...pending.f1040, line11_agi: 50001 - allowed },
    };
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer), Error);
    await assertRejects(() => buildPdfBytes(altered, filer), Error);
  });
}
