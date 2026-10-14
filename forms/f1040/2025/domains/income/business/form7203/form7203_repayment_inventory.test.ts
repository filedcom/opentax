import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  repaymentCases,
  repaymentInventoryInputs,
} from "./form7203_repayment_inventory.fixture.ts";
import { reviewedMixedCurrentDebtSchema } from "../../../../../nodes/intermediate/forms/income/business/form7203/debt-note.ts";
import { form7203StockLossPdf } from "../../../../pdf/forms/income/business/f7203_stock_loss.ts";
import { inputSchema as k1Schema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";

for (const entry of repaymentCases) {
  Deno.test(`Form7203 complete principal repayment inventories: ${entry.id}`, async () => {
    const inputs = repaymentInventoryInputs(entry);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const joint = inputs.general.filing_status === "mfj";
    const taxable = 50000 - entry.allowed - (joint ? 31500 : 15750);
    const mid = Math.floor(taxable / 50) * 50 + 25;
    const tax = Math.round(joint ? mid * .1 : mid * .12 - 238.5);
    assertEquals(pending.schedule1.line5_schedule_e, -entry.allowed);
    assertEquals(pending.f1040.line11_agi, 50000 - entry.allowed);
    assertEquals(pending.f1040.line15_taxable_income, taxable);
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line35a_refund, 8000 - tax);
    assertEquals(result.carryforwards.qbi_loss_carryforward, entry.allowed);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const copies = form7203StockLossPdf.instances?.(
      pending.form7203,
      filer,
      pending,
    );
    assertExists(copies);
    const root = (() => {
      try {
        return Deno.env.get("FORM7203_REPAYMENT_INVENTORY_DIR");
      } catch (error) {
        if (error instanceof Deno.errors.NotCapable) return undefined;
        throw error;
      }
    })();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            origins,
            copies,
            carryforwards: result.carryforwards,
            expected: {
              allowed: entry.allowed,
              taxable,
              tax,
              refund: 8000 - tax,
            },
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
    }
    const first = inputs.k1_s_corp[0];
    const note = reviewedMixedCurrentDebtSchema.parse(
      first.form7203_debt_evidence,
    );
    assertExists(note.second_formal_note?.principal_repayments);
    const second = note.second_formal_note;
    const payments = second.principal_repayments!;
    assertEquals(payments.length, 3);
    const changedSources = [
      {
        ...note,
        second_formal_note: {
          ...second,
          principal_repayments: payments.slice(1),
        },
      },
      {
        ...note,
        second_formal_note: { ...second, principal_repayment: payments[0] },
      },
      {
        ...note,
        second_formal_note: {
          ...second,
          principal_repayments: [payments[1], payments[0], payments[2]],
        },
      },
      {
        ...note,
        second_formal_note: {
          ...second,
          principal_repayments: payments.map((p, i) =>
            i ? p : { ...p, amount: p.amount + 1 }
          ),
        },
      },
      {
        ...note,
        second_formal_note: {
          ...second,
          principal_repayments: payments.map((p, i) =>
            i ? p : { ...p, formal_note_id: note.formal_note_id }
          ),
        },
      },
      {
        ...note,
        owned_current_records: {
          ...note.owned_current_records,
          complete_current_corporate_bank_ledger: {
            ...note.owned_current_records
              .complete_current_corporate_bank_ledger,
            transactions: note.owned_current_records
              .complete_current_corporate_bank_ledger.transactions.filter((t) =>
                t.transaction_reference !==
                  payments[0].corporate_loan_ledger_reference
              ),
          },
        },
      },
    ];
    for (const changed of changedSources) {
      const altered = {
        ...inputs,
        k1_s_corp: [
          { ...first, form7203_debt_evidence: changed },
          ...inputs.k1_s_corp.slice(1),
        ],
      };
      const rejected = f1040_2025.executeReturn(altered);
      if (rejected.diagnostics.length === 0) {
        await assertRejects(
          () => f1040_2025.prepareReturn(rejected.pending, filer),
          Error,
        );
      } else assert(rejected.diagnostics.length > 0);
      const retained = k1Schema.parse(pending.k1_s_corp);
      const mutated = {
        ...pending,
        k1_s_corp: {
          ...retained,
          k1_s_corps: [{
            ...retained.k1_s_corps[0],
            form7203_debt_evidence: changed,
          }, ...retained.k1_s_corps.slice(1)],
        },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(mutated, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutated, filer), Error);
    }
    for (
      const mutated of [
        {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: 50000 - entry.allowed + 1 },
        },
        {
          ...pending,
          schedule1: {
            ...pending.schedule1,
            line5_schedule_e: -entry.allowed + 1,
          },
        },
      ]
    ) {
      await assertRejects(
        () => f1040_2025.prepareReturn(mutated, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutated, filer), Error);
    }
  });
}
