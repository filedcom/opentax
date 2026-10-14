import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { inputSchema as farmSchema } from "../../../../../nodes/inputs/income/business/f4835/index.ts";
import { inputSchema as rentalSchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { inputSchema as wageSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  buildForm8582Ledger,
  readForm8582Ledger,
} from "../../../../../nodes/intermediate/forms/income/business/form8582/ledger.ts";
import { reconcileForm8582NextYearOpening } from "../../../../../nodes/intermediate/forms/income/business/form8582/next_year_import.ts";

export const farmRentalW2 = {
  employer_ein: "987654321",
  employer_name: "Austin Employer",
  employer_address_line1: "2 Main St",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  employee_ssn: "111223333",
  source_document_reference: "2025 Alex Farmer W-2",
  box1_wages: 50000,
  box2_fed_withheld: 8000,
  box3_ss_wages: 50000,
  box4_ss_withheld: 3100,
  box5_medicare_wages: 50000,
  box6_medicare_withheld: 725,
};

/** Five existing no-prior, other-passive allocations, extended to real packets.
 * IRS 2025 Tax Table, single 34,250–34,300 => 3,875; wages 50,000 and
 * standard deduction 15,750; allowed passive losses exactly offset profits.
 * https://www.irs.gov/publications/p1040
 */
export async function verifyFarmRentalPacket(
  result: ReturnType<typeof f1040_2025.executeReturn>,
  id: string,
  expectedCarry: ReadonlyArray<{
    activityId: string;
    reportingForm: "schedule_e" | "form4835";
    amount: number;
  }>,
) {
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line11_agi, 50000);
  assertEquals(pending.f1040.line12a_standard_deduction, 15750);
  assertEquals(pending.f1040.line15_taxable_income, 34250);
  assertEquals(pending.f1040.line16_income_tax, 3875);
  assertEquals(pending.f1040.line24_total_tax, 3875);
  assertEquals(pending.f1040.line33_total_payments, 8000);
  assertEquals(pending.f1040.line34_overpayment, 4125);
  assertEquals(pending.f1040.line35a_refund, 4125);
  assertEquals(pending.schedule1.line5_schedule_e, 0);
  const total = expectedCarry.reduce((sum, row) => sum + row.amount, 0);
  assertEquals(result.carryforwards.suspended_pal_8582, total);
  for (const row of expectedCarry) {
    assertEquals(
      result.carryforwards[`suspended_pal_8582:${row.activityId}`],
      row.amount,
    );
  }

  // Contract proof only: this reference does not assert an accepted filing.
  const reference = `synthetic-unfiled-contract-only:${id}`;
  const ledger = buildForm8582Ledger(pending.form8582, reference);
  assertEquals(ledger.ending_unallowed_loss, total);
  assertEquals(
    readForm8582Ledger(
      JSON.parse(JSON.stringify(ledger)),
      pending.form8582,
      reference,
    ),
    ledger,
  );
  const opening = {
    tax_year: 2026 as const,
    prior_accepted_return_reference: reference,
    rows: expectedCarry.map((row) => ({
      activity_id: row.activityId,
      reporting_part: "viii" as const,
      reporting_form: row.reportingForm,
      prior_unallowed_loss: row.amount,
    })),
  };
  assertEquals(
    reconcileForm8582NextYearOpening(
      opening,
      ledger,
      pending.form8582,
      reference,
    ),
    opening,
  );
  for (
    const first of [
      { ...opening.rows[0], activity_id: "different-activity" },
      {
        ...opening.rows[0],
        prior_unallowed_loss: opening.rows[0].prior_unallowed_loss + 1,
      },
      { ...opening.rows[0], reporting_form: "form4797_part2" },
    ]
  ) {
    assertThrows(() =>
      reconcileForm8582NextYearOpening(
        { ...opening, rows: [first, ...opening.rows.slice(1)] },
        ledger,
        pending.form8582,
        reference,
      ), Error);
  }

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
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), origins.length);
  assertEquals(origins.filter((page) => page.formKey === "form8582").length, 3);
  const root = Deno.env.get("OPENTAX_FORM8582_FARM_PROOF_DIR");
  if (root) {
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeFile(`${root}/${id}.pdf`, bytes);
    await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${root}/${id}.json`,
      JSON.stringify(
        {
          pending,
          filer,
          origins,
          carryforwards: result.carryforwards,
          expectedCarry,
          ledger,
          opening,
          acceptanceVerified: false,
        },
        null,
        2,
      ),
    );
  }
  const farms = farmSchema.parse(pending.f4835).f4835s;
  const rentals = rentalSchema.parse(pending.schedule_e).schedule_es;
  const wages = wageSchema.parse(pending.w2).w2s;
  for (
    const altered of [
      { ...pending, form8582: undefined },
      {
        ...pending,
        form8582: {
          ...pending.form8582,
          current_income: Number(pending.form8582.current_income) + 1,
        },
      },
      {
        ...pending,
        f4835: {
          f4835s: [{
            ...farms[0],
            expense_repairs_maintenance:
              (farms[0].expense_repairs_maintenance ?? 0) + 1,
          }, ...farms.slice(1)],
        },
      },
      {
        ...pending,
        f4835: {
          f4835s: [
            { ...farms[0], activity_id: "different-farm" },
            ...farms.slice(1),
          ],
        },
      },
      {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{
            ...rentals[0],
            rent_income: (rentals[0].rent_income ?? 0) + 1,
          }, ...rentals.slice(1)],
        },
      },
      {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [
            { ...rentals[0], activity_id: "different-rental" },
            ...rentals.slice(1),
          ],
        },
      },
      { ...pending, w2: { w2s: [{ ...wages[0], employee_ssn: "999887777" }] } },
      { ...pending, schedule1: { ...pending.schedule1, line5_schedule_e: 1 } },
      { ...pending, f1040: { ...pending.f1040, line11_agi: 50001 } },
    ]
  ) {
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer), Error);
    await assertRejects(() => buildPdfBytes(altered, filer), Error);
  }
}
