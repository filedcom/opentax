import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  inputSchema,
  itemSchema,
  VehicleMethod,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { cases, fixture } from "./form2106_fee_basis.fixture.ts";

// Independent tax worksheet values for $150,000 wages and $30,000 withholding.
const travelCases = [
  {
    name: "single-travel",
    base: 0,
    vehicles: ["none"],
    deduction: 1600,
    taxable: 132650,
    tax: 24683,
  },
  {
    name: "single-owned-mileage",
    base: 0,
    vehicles: ["owned"],
    deduction: 4400,
    taxable: 129850,
    tax: 24011,
  },
  {
    name: "joint-spouse-leased-mileage",
    base: 1,
    vehicles: ["leased"],
    deduction: 5100,
    taxable: 113400,
    tax: 14776,
  },
  {
    name: "joint-two-vehicles",
    base: 2,
    vehicles: ["owned", "leased"],
    deduction: 9500,
    taxable: 109000,
    tax: 13808,
  },
  {
    name: "single-meals-only",
    base: 0,
    vehicles: ["none"],
    deduction: 400,
    taxable: 133850,
    tax: 24971,
  },
  {
    name: "joint-nonmeal-fully-reimbursed",
    base: 1,
    vehicles: ["none"],
    deduction: 200,
    taxable: 118300,
    tax: 15854,
  },
] as const;

for (const c of travelCases) {
  Deno.test(`Form 2106 ${c.name} carries sourced expenses and reimbursements into the full packet`, async () => {
    const original = fixture(cases[c.base]);
    const jobs = c.vehicles.map((ownership, i) => {
      const originalJob = original.f2106[i];
      const mealsOnly = c.name === "single-meals-only";
      return itemSchema.parse({
        ...originalJob,
        vehicle: ownership === "none" ? { method: VehicleMethod.NONE } : {
          method: VehicleMethod.STANDARD_MILEAGE,
          placed_in_service_date: ownership === "owned"
            ? "2023-04-15"
            : "2024-02-20",
          total_miles: ownership === "owned" ? 10000 : 15000,
          business_miles: ownership === "owned" ? 4000 : 5000,
          average_daily_roundtrip_commuting_miles: 10,
          commuting_miles: 2000,
          available_for_personal_use_off_duty: ownership === "owned",
          other_personal_vehicle_available: ownership === "leased",
          written_mileage_evidence_reference:
            `${c.name} owner ${i} allocated mileage ledger`,
          no_personal_to_business_conversion_during_year_confirmed: true,
          standard_mileage_eligibility: ownership === "owned"
            ? {
              ownership,
              used_standard_mileage_first_business_year: true,
              method_history_reference:
                "2023 first business year standard mileage election",
            }
            : {
              ownership,
              used_standard_mileage_entire_lease: true,
              method_history_reference:
                "2024–2025 continuous lease mileage history",
            },
        },
        expenses: {
          ...originalJob.expenses,
          line2_parking_tolls_local_transportation: mealsOnly ? 0 : 300,
          line3_overnight_travel_excluding_meals: mealsOnly ? 0 : 1600,
          line4_other_business_expenses: mealsOnly ? 0 : 200,
          line5_meals: mealsOnly ? 1000 : 600,
          expense_records_reference: `${c.name} owner ${i} expense ledger`,
          job_business_purpose: "County hearings away from Austin tax home",
        },
        reimbursements: {
          ...originalJob.reimbursements,
          line7_column_a_nonmeals: mealsOnly
            ? 0
            : c.name === "joint-nonmeal-fully-reimbursed"
            ? 2100
            : 700,
          line7_column_b_meals: 200,
          employer_reimbursement_record_reference:
            `${c.name} owner ${i} separately paid nonmeal and meal reimbursements`,
        },
      });
    });
    const source = { ...original, f2106: jobs };
    const result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, []);
    const prepared = buildPending(result.pending);
    const pending = { ...prepared, f2106: inputSchema.parse(prepared.f2106) };
    const f = pending.f1040!;
    assertEquals([
      pending.schedule1?.line12_business_expenses,
      f.line10_adjustments,
      f.line11_agi,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      c.deduction,
      c.deduction,
      150000 - c.deduction,
      c.taxable,
      c.tax,
      c.tax,
      30000 - c.tax,
    ]);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals((bundle.xml.match(/<IRS2106 /g) ?? []).length, jobs.length);
    assertStringIncludes(
      bundle.xml,
      `<BusExpnsReservistsAndOthersAmt referenceDocumentId=`,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const first = jobs[0];
    const alteredJobs = [
      {
        ...first,
        expenses: {
          ...first.expenses,
          line3_overnight_travel_excluding_meals:
            first.expenses.line3_overnight_travel_excluding_meals + 1,
        },
      },
      {
        ...first,
        reimbursements: {
          ...first.reimbursements,
          line7_column_a_nonmeals: 999999,
        },
      },
      {
        ...first,
        reimbursements: {
          ...first.reimbursements,
          line7_column_b_meals: first.expenses.line5_meals + 1,
        },
      },
      { ...first, job: { ...first.job, employee_ssn: "999-88-7777" } },
      {
        ...first,
        reimbursements: { ...first.reimbursements, line7_column_b_meals: 0 },
      },
    ];
    if (first.vehicle.method === VehicleMethod.STANDARD_MILEAGE) {
      alteredJobs.push({
        ...first,
        vehicle: {
          ...first.vehicle,
          business_miles: first.vehicle.business_miles + 100,
        },
      });
    }
    const variants: typeof pending[] = alteredJobs.map((job) => ({
      ...pending,
      f2106: { f2106s: [job, ...jobs.slice(1)] },
    }));
    variants.push({
      ...pending,
      schedule1: {
        ...pending.schedule1,
        line12_business_expenses: c.deduction + 1,
      },
    });
    if (
      jobs.length === 2 &&
      first.vehicle.method === VehicleMethod.STANDARD_MILEAGE &&
      jobs[1].vehicle.method === VehicleMethod.STANDARD_MILEAGE
    ) {
      variants.push({
        ...pending,
        f2106: {
          f2106s: [first, {
            ...jobs[1],
            vehicle: {
              ...jobs[1].vehicle,
              written_mileage_evidence_reference:
                first.vehicle.written_mileage_evidence_reference,
            },
          }],
        },
      });
    }
    for (const altered of variants) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `.state/research/form2106-travel-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", source],
          ["pending", result.pending],
          ["expected", { ...c, rejections: variants.length }],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
