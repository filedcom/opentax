import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateForm8801Mtcnol,
  form8801MtcnolSchema,
} from "./form8801_mtcnol.ts";
import {
  calculateForm8801,
  form8801CalculationSchema,
} from "./form8801_calculation.ts";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import { stageForm8801SettledReturn } from "./form8801_settled_return.ts";
const context = { taxpayer_ssn: "111223333", prior_filing_status: "single" };
function history() {
  return {
    tax_year: 2024 as const,
    taxpayer_ssn: "111223333",
    reference: "mtcnol-review",
    vintages: [{
      item_id: "loss2019",
      owner_ssn: "111223333",
      origin_year: 2019,
      direction: "carryforward" as const,
      origin_exclusion_only_nol: {
        reference: "2019-exclusion-only-172d",
        amount: 50000,
      },
      eligibility_workpaper: {
        reference: "carry-eligibility",
        eligible_for_2024: true as const,
      },
      uses_before_2024: [
        { tax_year: 2020, reference: "2020-usage", amount: 10000 },
        { tax_year: 2021, reference: "2021-usage", amount: 15000 },
        { tax_year: 2023, reference: "2023-usage", amount: 5000 },
      ],
    }, {
      item_id: "loss2025",
      owner_ssn: "111223333",
      origin_year: 2025,
      direction: "carryback" as const,
      origin_exclusion_only_nol: {
        reference: "2025-exclusion-only-172d",
        amount: 8000,
      },
      eligibility_workpaper: {
        reference: "back-eligibility",
        eligible_for_2024: true as const,
      },
      uses_before_2024: [{
        tax_year: 2023,
        reference: "2023-back-usage",
        amount: 2000,
      }],
    }],
  };
}
function facts() {
  return {
    ...packageFacts(),
    minimum_tax_credit_nol_workpaper: {
      reference: "mtcnol",
      amount: 26000,
      method: "reviewed_vintage_history" as const,
      vintage_history: history(),
    },
  };
}
Deno.test("MTCNOL separate vintage history derives the 2024 carry amount without regular NOL substitution", () => {
  const r = calculateForm8801Mtcnol(history(), context);
  assertEquals(
    r.vintages.map((v) => [v.origin_year, v.prior_used, v.available_to_2024]),
    [[2019, 30000, 20000], [2025, 2000, 6000]],
  );
  assertEquals(r.form8801_line3, 26000);
  assertEquals([
    r.originLossCalculationVerified,
    r.carryEligibilityVerified,
    r.workpaperAuthenticityVerified,
    r.filingReady,
  ], [false, false, false, false]);
});
Deno.test("MTCNOL history rejects overused origin and permits a fully consumed vintage", () => {
  const h = history();
  h.vintages[0].uses_before_2024[2].amount = 25000;
  assertEquals(
    calculateForm8801Mtcnol(h, context).vintages[0].available_to_2024,
    0,
  );
  h.vintages[0].uses_before_2024[2].amount++;
  assertThrows(() => calculateForm8801Mtcnol(h, context), Error, "uses exceed");
});
Deno.test("MTCNOL history rejects repeated vintage owners and duplicate source items", () => {
  const h = history();
  h.vintages.push(structuredClone(h.vintages[0]));
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "Duplicate MTCNOL",
  );
  h.vintages[2].item_id = "other-id";
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "Duplicate MTCNOL",
  );
});
Deno.test("MTCNOL year checks reject own-year losses and reversed carry direction", () => {
  for (
    const [direction, origin_year] of [
      ["carryforward", 2024],
      ["carryforward", 2025],
      ["carryback", 2024],
      ["carryback", 2023],
    ] as const
  ) {
    const h = form8801MtcnolSchema.parse(history());
    h.vintages[0].direction = direction;
    h.vintages[0].origin_year = origin_year;
    assertThrows(() => calculateForm8801Mtcnol(h, context), Error, "direction");
  }
});
Deno.test("MTCNOL earlier-use history rejects duplicate, reversed and origin-ineligible years", () => {
  for (
    const years of [[2020, 2020, 2023], [2021, 2020, 2023], [2019, 2021, 2023]]
  ) {
    const h = history();
    h.vintages[0].uses_before_2024.forEach((v, i) => v.tax_year = years[i]);
    assertThrows(
      () => calculateForm8801Mtcnol(h, context),
      Error,
      "chronological",
    );
  }
});
Deno.test("MTCNOL spouse vintages require a reviewed joint owner and workpaper identity", () => {
  const h = history();
  h.vintages[1].owner_ssn = "444556666";
  assertThrows(() => calculateForm8801Mtcnol(h, context), Error, "owner");
  assertEquals(
    calculateForm8801Mtcnol(h, {
      ...context,
      prior_filing_status: "married_filing_jointly",
      prior_spouse_ssn: "444556666",
    }).form8801_line3,
    26000,
  );
  h.taxpayer_ssn = "444556666";
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "taxpayer differs",
  );
});
Deno.test("MTCNOL calculated history binds Form 8801 line 3 and rejects changed aggregate", () => {
  const f = {
    ...facts(),
    current_return: {
      reference: "current",
      form1040_line16: 20000,
      schedule2_line1z: 0,
      form1040_line19: 1000,
      form6251_line9: 15000,
      schedule3_credits: [],
    },
  };
  const r = calculateForm8801(form8801CalculationSchema.parse(f));
  assertEquals(
    [r.lines[3], r.lines[4], r.lines[11], r.lines[15], r.lines[21]],
    [26000, 94000, 2158, 0, 6100],
  );
  assertEquals(r.mtcnolWorkpaperArithmeticReconciled, true);
  f.minimum_tax_credit_nol_workpaper.amount++;
  assertThrows(
    () => calculateForm8801(form8801CalculationSchema.parse(f)),
    Error,
    "differs from vintage",
  );
});
Deno.test("MTCNOL canonical review rejects method/history omission and unexpected acceptance fields", async () => {
  for (
    const patch of [{ method: "reviewed_vintage_history" }, {
      vintage_history: history(),
    }, {
      amount: 26000,
      method: "reviewed_vintage_history",
      vintage_history: history(),
      accepted: true,
    }]
  ) {
    const f = await fixture({
      ...packageFacts(),
      minimum_tax_credit_nol_workpaper: {
        reference: "mtcnol",
        amount: 0,
        ...patch,
      },
    });
    await assertRejects(() =>
      stageForm8801SettledReturn(f.inputs, f.binding, f.documents)
    );
  }
});
Deno.test("MTCNOL canonical source history joins current Schedule 3 and tax while source eligibility stays unproved", async () => {
  const f = await fixture(facts());
  f.inputs.w2[0].box1_wages = 30000;
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals([
    r.lines[3],
    r.final_schedule3.line6b_prior_year_min_tax_credit,
    r.lines[26],
    r.final_form1040.line22_tax_after_credits,
  ], [26000, 1475, 4625, 0]);
  assertEquals(r.mtcnolWorkpaperArithmeticReconciled, true);
  assertEquals([
    r.filingReady,
    r.priorAcceptanceVerified,
    r.workpaperAuthenticityVerified,
  ], [false, false, false]);
});
Deno.test("MTCNOL total above AMTI stops exclusion tax without fabricating a same-year origin", async () => {
  const h = history();
  h.vintages[0].origin_exclusion_only_nol.amount = 160000;
  const f = await fixture({
    ...packageFacts(),
    minimum_tax_credit_nol_workpaper: {
      reference: "mtcnol",
      amount: 136000,
      method: "reviewed_vintage_history",
      vintage_history: h,
    },
  });
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(
    [r.lines[3], r.lines[4], r.lines[11], r.lines[15], r.lines[21]],
    [136000, 0, undefined, 0, 6100],
  );
});
