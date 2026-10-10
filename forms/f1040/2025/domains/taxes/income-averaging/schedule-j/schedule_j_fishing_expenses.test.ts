import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import {
  fishingExpenseCases,
  fishingExpenseInput,
} from "./schedule_j_fishing_expenses.fixture.ts";
import { retainedFishingProfit } from "./schedule_j_source_return.ts";

for (const kind of fishingExpenseCases) {
  Deno.test(`Schedule J sourced insurance, repairs and utilities: ${kind}`, async () => {
    const { input, ledger } = fishingExpenseInput(kind);
    const joint = kind.startsWith("joint-");
    const lower = kind === "lower-profit";
    const profit = kind === "fishing" ? 320000 : lower ? 80000 : 120000;
    assertEquals(retainedFishingProfit(input), profit);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    // These totals have the same net source profit as independently reviewed
    // prior packets, but use distinct paid expense categories and receipts.
    // Lower-profit has 40,000 additional repairs: combined profit 280,000.
    assertEquals(pending.schedule1.line3_schedule_c, profit);
    assertEquals(
      pending.schedule1.line6_schedule_f ?? 0,
      kind === "fishing" ? 0 : 200000,
    );
    assertEquals(
      pending.schedule1.line15_se_deduction,
      joint ? 22074 : lower ? 14668 : 15203,
    );
    assertEquals(
      pending.f1040.line11_agi,
      joint ? 297926 : lower ? 300332 : 339797,
    );
    assertEquals(pending.f1040.line13_qbi_deduction, joint ? 52965 : undefined);
    assertEquals(
      pending.f1040.line15_taxable_income,
      joint ? 211861 : lower ? 282582 : 322047,
    );
    assertEquals(
      pending.schedule_j.line23,
      joint ? 34637 : lower ? 59332 : 72757,
    );
    assertEquals(
      pending.f1040.line16_income_tax,
      joint ? 34637 : lower ? 60162 : 73587,
    );
    if (!joint) {
      assertEquals(pending.form6251.regular_tax, lower ? 62451 : 76264);
    }
    // SE: 92.35% of business profit, 12.4% up to the 176,100 cap per
    // owner, plus 2.9%; joint owners retain separate Social Security caps.
    assertEquals(
      pending.schedule2.line4_se_tax,
      joint ? 44148 : lower ? 29335 : 30406,
    );
    // Additional Medicare: 0.9% above 200,000 single / 250,000 joint.
    assertEquals(
      pending.schedule2.line11_additional_medicare,
      joint ? 410 : lower ? 527 : 860,
    );
    assertEquals(pending.schedule2.line12_niit ?? 0, joint ? 0 : 1330);
    // Single AMT: AGI + 240,000 ISO less 88,100 exemption; ordinary
    // excess uses 26%/28% at 239,100, and 30,000 dividends use 15%.
    // Subtract regular tax recomputed without the Schedule J election.
    assertEquals(
      pending.schedule2.line2_amt ?? 0,
      joint ? 0 : lower ? 55492 : 52729,
    );
    const totalTax = joint ? 79195 : lower ? 146846 : 158912;
    assertEquals(pending.f1040.line24_total_tax, totalTax);
    assertEquals(pending.f1040.line33_total_payments, 0);
    assertEquals(pending.f1040.line37_amount_owed, totalTax);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const bytes = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      (await PDFDocument.load(bytes)).getPageCount(),
      origins.length,
    );
    const root = Deno.env.get("OPENTAX_SCHEDULE_J_EXPENSE_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${kind}.pdf`, bytes);
      await Deno.writeTextFile(`${root}/${kind}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${kind}.json`,
        JSON.stringify(
          { input, ledger, pending, filer, origins, acceptanceVerified: false },
          null,
          2,
        ),
      );
    }
    const business = input.schedule_c[0];
    for (
      const changed of [
        { ...business, line_15_insurance: 3001 },
        { ...business, line_21_repairs: business.line_21_repairs + 1 },
        { ...business, line_25_utilities: 5001 },
        { ...business, line_18_office_expense: 1 },
      ]
    ) {
      assertThrows(
        () => f1040_2025.executeReturn({ ...input, schedule_c: [changed] }),
        Error,
      );
      const altered = {
        ...pending,
        schedule_c: { ...pending.schedule_c, schedule_cs: [changed] },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  });
}

Deno.test("Schedule J rejects rehashed paid-expense qualification and receipt conflicts", () => {
  const { input, ledger } = fishingExpenseInput("mixed-one-farm");
  const [insurance, repair, repair2, utilities] = ledger.expenses;
  const variants = [
    { ...ledger, expenses: undefined },
    {
      ...ledger,
      expenses: [{ ...insurance, amount: 3001 }, repair, repair2, utilities],
    },
    {
      ...ledger,
      expenses: [
        { ...insurance, no_health_life_lost_earnings_or_self_insurance: false },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        insurance,
        { ...repair, incidental_maintenance_not_capital_improvement: false },
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        insurance,
        { ...repair, no_owner_labor_value: false },
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [insurance, repair, repair2, {
        ...utilities,
        no_personal_home_office_or_residential_phone: false,
      }],
    },
    {
      ...ledger,
      expenses: [
        { ...insurance, paid_for_2025_services: false },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        { ...insurance, entirely_for_this_fishing_business: false },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        { ...insurance, paid_on: "2025-02-30" },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        { ...insurance, paid_on: "2024-12-31" },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [
        {
          ...insurance,
          paid_receipt_reference: ledger.supplies[0].paid_receipt_reference,
        },
        repair,
        repair2,
        utilities,
      ],
    },
    {
      ...ledger,
      expenses: [insurance, repair, {
        ...repair2,
        paid_receipt_reference: repair.paid_receipt_reference,
      }, utilities],
    },
    { ...ledger, taxpayer_ssn: "999887777" },
  ];
  for (const altered of variants) {
    const bytes = new TextEncoder().encode(JSON.stringify(altered));
    const business = input.schedule_c[0];
    const evidence = business.schedule_j_fishing_evidence;
    const changed = {
      ...input,
      schedule_c: [{
        ...business,
        schedule_j_fishing_evidence: {
          ...evidence,
          retained_catch_ledger: {
            ...evidence.retained_catch_ledger,
            bytes_base64: btoa(String.fromCharCode(...bytes)),
            sha256: createHash("sha256").update(bytes).digest("hex"),
          },
        },
      }],
    };
    assertThrows(() => f1040_2025.executeReturn(changed), Error);
  }
});
