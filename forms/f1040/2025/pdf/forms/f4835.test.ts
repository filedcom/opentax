import { assertEquals, assertThrows } from "@std/assert";
import { form4835Pdf } from "./f4835.ts";

function copies(pending: Record<string, Record<string, unknown>>) {
  const projected = form4835Pdf.projectFields?.(
    pending.f4835 ?? {},
    pending,
  ) ?? {};
  return form4835Pdf.instances?.(projected) ?? [];
}

Deno.test("Form 4835 PDF projects one copy per source activity and printed totals", () => {
  const pending = {
    f4835: {
      f4835s: [{
        activity_name: "North field",
        ein: "123456789",
        actively_participated: true,
        livestock_crop_income: 10_000,
        cooperative_distributions_gross: 1_000,
        cooperative_distributions_taxable: 600,
        crop_insurance_disaster_received: 2_000,
        crop_insurance_disaster_taxable: 1_500,
        expense_feed: 1_000,
        expense_other_details: [{ description: "Tolls", amount: 100 }],
        expense_capitalized_263a: 300,
      }, {
        activity_name: "South field",
        livestock_crop_income: 500,
        other_income: 50,
      }],
    },
  };
  const [north, south] = copies(pending);
  assertEquals(copies(pending).length, 2);
  assertEquals(north.ein, "123456789");
  assertEquals(north.participation, "yes");
  assertEquals(north.line7_gross, 12_100);
  assertEquals(north.other_1_description, "Tolls");
  assertEquals(north.other_1_amount, 100);
  assertEquals(north.other_7_description, "263A");
  assertEquals(north.other_7_amount, "(300)");
  assertEquals(north.line31_expenses, 800);
  assertEquals(north.line32_income, 11_300);
  assertEquals(north.risk_status, undefined);
  assertEquals(south.line7_gross, 550);
  assertEquals(south.line32_income, 550);
  assertEquals(form4835Pdf.pageIndices?.(north), [0]);
});

Deno.test("Form 4835 PDF field map uses the 2025 AcroForm widgets", () => {
  const byKey = Object.fromEntries(
    form4835Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    byKey.ein,
    "topmostSubform[0].Page1[0].Comb[0].f1_03[0]",
  );
  assertEquals(
    byKey.expense_feed,
    "topmostSubform[0].Page1[0].Part2_LeftCol[0].f1_23[0]",
  );
  assertEquals(
    byKey.expense_pension,
    "topmostSubform[0].Page1[0].f1_31[0]",
  );
  assertEquals(
    byKey.other_7_amount,
    "topmostSubform[0].Page1[0].f1_54[0]",
  );
  assertEquals(
    byKey.line34c_allowed_loss,
    "topmostSubform[0].Page1[0].f1_58[0]",
  );
});

Deno.test("Form 4835 PDF blocks losses without linked Form 8582 allocation", () => {
  assertThrows(() => copies({
    f4835: {
      f4835s: [{
        activity_name: "Loss farm",
        livestock_crop_income: 1_000,
        expense_feed: 3_000,
        some_investment_not_at_risk: false,
      }],
    },
  }), Error, "computed Form 8582 activity allocation");
});

Deno.test("Form 4835 PDF blocks source paths requiring unrepresented annotations", () => {
  assertThrows(() => copies({
    f4835: {
      f4835s: [{
        activity_name: "Carryover farm",
        livestock_crop_income: 5_000,
        prior_unallowed_passive_operating: 400,
      }],
    },
  }), Error, "PAL annotation");
  assertThrows(() => copies({
    f4835: {
      f4835s: [{
        activity_name: "Loan farm",
        livestock_crop_income: 0,
        ccc_loans_reported_election: 400,
        ccc_loan_details: [{ description: "Corn", amount: 400 }],
      }],
    },
  }), Error, "CCC loan election supporting statement");
  assertThrows(() => copies({
    f4835: {
      f4835s: [{
        activity_name: "Crop farm",
        livestock_crop_income: 0,
        crop_insurance_disaster_received: 400,
        crop_insurance_disaster_taxable: 0,
        defer_crop_insurance: true,
        crop_insurance_deferral_details: {
          cash_method: true,
          normal_practice_next_year_percent: 75,
          damaged_crops: [{
            crop: "Corn",
            damage_date: "2025-08-15",
            cause: "Hail",
          }],
          payments: [{
            crop: "Corn",
            received_date: "2025-10-01",
            amount: 400,
            carrier: "Farm Mutual",
          }],
        },
      }],
    },
  }), Error, "crop-insurance deferral supporting statement");
});
