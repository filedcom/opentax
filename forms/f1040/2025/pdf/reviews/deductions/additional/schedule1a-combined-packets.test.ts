import { assert, assertEquals, assertExists, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import {
  claimInputSchema,
  inputSchema as scheduleSchema,
} from "../../../../../nodes/intermediate/forms/deductions/additional/schedule1a/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { schedule1aPdf } from "../../../forms/deductions/additional/schedule1a/schedule1a.ts";

const base = pdfReviewFixtures.find((f) => f.id === "joint-mixed-schedule1a")!;
const sourceGeneral = generalSchema.parse(base.inputs.general);
const sourceSchedule = claimInputSchema.parse(base.inputs.schedule1a);
const loan = sourceSchedule.vehicle_loans![0];
const cases = [
  { id: "single-100000", wages: 100000, tax: 3395, joint: false },
  { id: "single-100001", wages: 100001, tax: 3419, joint: false },
  { id: "single-125000", wages: 125000, tax: 8505, joint: false },
  { id: "joint-150000", wages: 150000, tax: 5802, joint: true },
  { id: "joint-200001", wages: 200001, tax: 13698, joint: true },
  { id: "joint-210001", wages: 210001, tax: 16602, joint: true },
  { id: "single-175000", wages: 175000, tax: 0, joint: false },
  { id: "joint-301001", wages: 301001, tax: 0, joint: true },
];

function inputsFor(entry: typeof cases[number]) {
  const general = {
    ...sourceGeneral,
    filing_status: entry.joint ? FilingStatus.MFJ : FilingStatus.Single,
    taxpayer_dob: "1955-06-15",
    spouse_first_name: entry.joint ? "Sam" : undefined,
    spouse_last_name: entry.joint ? "Example" : undefined,
    spouse_ssn: entry.joint ? "444556666" : undefined,
    spouse_dob: entry.joint ? "1958-03-10" : undefined,
    spouse_ssn_valid_for_employment: entry.joint,
    spouse_ssn_issued_before_due_date: entry.joint,
    spouse_tin_issued_by_due_date: entry.joint,
  };
  const w2 = [0, 1, 2, 3].map((i) => {
    const wages = Math.floor(entry.wages / 4) + (i === 0 ? entry.wages % 4 : 0);
    const ssn = entry.joint && i % 2 === 1 ? "444556666" : "111223333";
    const ein = `${12 + i}3456789`;
    const identity = {
      tax_year: 2025 as const,
      employee_ssn: ssn,
      employer_ein: ein,
      furnished_to_employee: true as const,
    };
    return w2ItemSchema.parse({
      employee_ssn: ssn,
      employer_address_line1: "1 Main Street",
      employer_address_city: "Albany",
      employer_address_state: "NY",
      employer_address_zip: "12201",
      employer_ein: ein,
      employer_name: `Restaurant ${i + 1}`,
      box1_wages: wages,
      box2_fed_withheld: 10000,
      box3_ss_wages: wages - 7500,
      box4_ss_withheld: Math.round(wages * 6.2) / 100,
      box5_medicare_wages: wages,
      box6_medicare_withheld: Math.round(wages * 1.45) / 100,
      box7_ss_tips: 7500,
      box14b_tipped_code: "102",
      ...(i === 0
        ? {
          box14_entries: [{
            description: "FLSA Overtime Premium",
            amount: 4000,
            is_state_sdi_pfml: false,
          }],
        }
        : {}),
      flsa_overtime_review: {
        covered_nonexempt_employee: true,
        premium_included_in_box1: true,
        source_reference: `Coverage and wages-${i}`,
        ...(i === 1
          ? {
            employer_statement: {
              ...identity,
              qualified_overtime_premium: 4000,
              statement_reference: `Premium-${i}`,
            },
          }
          : {}),
        ...(i === 2
          ? {
            aggregate_overtime_statement: {
              ...identity,
              aggregate_time_and_half_overtime_pay: 12000,
              time_and_half_rate_confirmed: true,
              all_hours_exceed_forty_per_workweek_confirmed: true,
              covers_full_tax_year: true,
              premium_not_separately_stated: true,
              statement_reference: `Aggregate-${i}`,
            },
          }
          : {}),
        ...(i === 3
          ? {
            double_time_excess_statement: {
              ...identity,
              excess_over_regular_pay: 8000,
              double_time_rate_confirmed: true,
              all_hours_exceed_forty_per_workweek_confirmed: true,
              covers_full_tax_year: true,
              statement_reference: `Double-time-${i}`,
            },
          }
          : {}),
      },
    });
  });
  return {
    general,
    w2,
    schedule1a: {
      ...sourceSchedule,
      vehicle_loans: [0, 1, 2].map((i) => ({
        ...loan,
        vin: `1HGCV1F30SA00000${i + 1}`,
        borrower_ssn: entry.joint && i === 1 ? "444556666" : "111223333",
        lender_interest_statement_reference: `Interest-${i}`,
        purchase_and_lien_reference: `Purchase-${i}`,
        final_assembly_reference: `Assembly-${i}`,
        ...(i === 2
          ? {
            refinance: {
              refinanced_date: "2025-07-01",
              lender_name: "Refinance Credit Union",
              interest_statement_reference: "Refinance interest-2",
              refinance_and_first_lien_reference: "Refinance lien-2",
              outstanding_original_principal_at_refinance: 20000,
              refinanced_principal: 20000,
              original_loan_interest_paid_before_refinance: 1500,
              refinanced_loan_interest_paid: 2500,
              first_lien_secured_on_same_vehicle: true as const,
              no_cash_out_or_ineligible_debt: true as const,
            },
          }
          : {}),
      })),
    },
  };
}

for (const entry of cases) {
  Deno.test(`Schedule 1-A combined full-return sources: ${entry.id}`, async () => {
    const inputs = inputsFor(entry);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const root = Deno.env.get("OPENTAX_SCHEDULE1A_COMBINED_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const phase = Math.floor(
      Math.max(0, entry.wages - (entry.joint ? 300000 : 150000)) / 1000,
    ) * 100;
    const tips = Math.max(0, 25000 - phase);
    const overtime = Math.max(0, (entry.joint ? 16000 : 12500) - phase);
    const vehicle = Math.max(
      0,
      10000 -
        Math.ceil(
            Math.max(0, entry.wages - (entry.joint ? 200000 : 100000)) / 1000,
          ) * 200,
    );
    const senior = Math.round(
      Math.max(
        0,
        6000 -
          Math.max(0, entry.wages - (entry.joint ? 150000 : 75000)) * .06,
      ),
    ) * (entry.joint ? 2 : 1);
    const deduction = tips + overtime + vehicle + senior;
    assertEquals(pending.f1040.line11_agi, entry.wages);
    assertEquals(pending.f1040.line13b_additional_deductions, deduction);
    const expected = { tips, overtime, vehicle, senior, deduction };
    if (vehicle === 0) {
      await assertRejects(
        () => f1040_2025.prepareReturn(result.pending, filer),
        Error,
        "vehicle interest deduction does not reconcile",
      );
      await assertRejects(
        () => buildPdfBytes(pending, filer),
        Error,
        "vehicle interest deduction does not reconcile",
      );
      if (root) {
        await Deno.writeTextFile(
          `${root}/${entry.id}-blocked.json`,
          JSON.stringify(
            {
              expected,
              nativeRejected: true,
              freshPdfRejected: true,
              reason:
                "Zero vehicle deduction rejects despite retained qualified loan sources",
            },
            null,
            2,
          ),
        );
      }
      return;
    }
    const standard = entry.joint ? 34700 : 17750;
    assertEquals(pending.f1040.line12a_standard_deduction, standard);
    assertEquals(
      pending.f1040.line15_taxable_income,
      entry.wages - standard - deduction,
    );
    assertEquals(pending.f1040.line16_income_tax, entry.tax);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 40000 - entry.tax);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const projected = schedule1aPdf.projectFields?.(
      pending.schedule1a,
      pending,
    );
    for (
      const [key, value] of Object.entries({
        line13_tips: tips,
        line21_overtime: overtime,
        line30_vehicle_interest: vehicle,
        line37_senior: senior,
        line38_total: deduction,
      })
    ) assertEquals(projected?.[key], value, key);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      (prepared.bundle.xml.match(/<QlfyPassengerVehicleLoanIntGrp>/g) ?? [])
        .length,
      3,
    );
    assertEquals((prepared.bundle.xml.match(/<IRSW2\b/g) ?? []).length, 4);
    if (root) {
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(
        `${root}/${entry.id}-expected.json`,
        JSON.stringify({ expected, origins }, null, 2),
      );
    }
    const schedule = scheduleSchema.parse(pending.schedule1a);
    assertExists(schedule.qualified_employee_tips);
    assertExists(schedule.qualified_w2_overtime);
    assertExists(schedule.vehicle_loans);
    const changed = [
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line13b_additional_deductions: deduction + 1,
        },
      },
      { ...pending, f1040: { ...pending.f1040, line11_agi: entry.wages + 1 } },
      {
        ...pending,
        schedule1a: {
          ...schedule,
          qualified_employee_tips: schedule.qualified_employee_tips.map((
            s,
            i,
          ) => i ? s : { ...s, amount: s.amount + 1 }),
        },
      },
      {
        ...pending,
        schedule1a: {
          ...schedule,
          qualified_w2_overtime: schedule.qualified_w2_overtime.map((s, i) =>
            i ? s : { ...s, amount: s.amount + 1 }
          ),
        },
      },
      {
        ...pending,
        schedule1a: {
          ...schedule,
          vehicle_loans: schedule.vehicle_loans.map((s, i) =>
            i ? s : { ...s, borrower_ssn: "999887777" }
          ),
        },
      },
    ];
    for (const mutation of changed) {
      await assertRejects(
        () => f1040_2025.prepareReturn(mutation, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutation, filer), Error);
    }
    for (
      const mutation of [
        {
          ...inputs,
          w2: inputs.w2.map((w, i) =>
            i ? w : { ...w, employee_ssn: "999887777" }
          ),
        },
        {
          ...inputs,
          schedule1a: {
            ...inputs.schedule1a,
            vehicle_loans: [
              ...inputs.schedule1a.vehicle_loans,
              inputs.schedule1a.vehicle_loans[0],
            ],
          },
        },
        {
          ...inputs,
          schedule1a: {
            ...inputs.schedule1a,
            vehicle_loans: inputs.schedule1a.vehicle_loans.map((l, i) =>
              i ? l : { ...l, borrower_ssn: "999887777" }
            ),
          },
        },
      ]
    ) {
      const rejected = f1040_2025.executeReturn(mutation);
      if (rejected.diagnostics.length === 0) {
        await assertRejects(
          () => f1040_2025.prepareReturn(rejected.pending, filer),
          Error,
        );
      } else assert(rejected.diagnostics.length > 0);
    }
  });
}
