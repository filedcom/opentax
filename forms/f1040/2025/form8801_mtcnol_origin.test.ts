import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateForm8801MtcnolOrigin,
  form8801MtcnolOriginSchema,
} from "./form8801_mtcnol_origin.ts";
import {
  calculateForm8801Mtcnol,
  form8801MtcnolSchema,
} from "./form8801_mtcnol.ts";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import { stageForm8801SettledReturn } from "./form8801_settled_return.ts";
function origin() {
  return {
    tax_year: 2019,
    owner_ssn: "111223333",
    reference: "exclusion-172d-2019",
    filing_status: "single" as const,
    basis: "amt_exclusion_items_only" as const,
    personal_exemptions_already_removed: true as const,
    section1202_exclusion_already_restored: true as const,
    nol_and_qbi_deductions_excluded: true as const,
    noncapital_income: [{
      item_id: "business-income",
      reference: "exclusion-income",
      business: true,
      amount: 10000,
    }],
    noncapital_deductions: [{
      item_id: "business-deductions",
      reference: "exclusion-deductions",
      business: true,
      amount: 60000,
    }],
    capital_gains: [] as {
      item_id: string;
      reference: string;
      business: boolean;
      amount: number;
    }[],
    capital_losses: [] as {
      item_id: string;
      reference: string;
      business: boolean;
      amount: number;
    }[],
  };
}
const row = (item_id: string, business: boolean, amount: number) => ({
  item_id,
  reference: item_id,
  business,
  amount,
});
Deno.test("MTCNOL origin computes the loss from separately reviewed exclusion-only items", () => {
  const r = calculateForm8801MtcnolOrigin(origin());
  assertEquals([
    r.lines[1],
    r.lines[9],
    r.lines[22],
    r.lines[23],
    r.lines[24],
    r.origin_nol,
  ], [-50000, 0, 0, 0, -50000, 50000]);
  assertEquals([
    r.originLossWorkpaperArithmeticReconciled,
    r.sourceBasisVerified,
    r.workpaperAuthenticityVerified,
    r.filingReady,
  ], [true, false, false, false]);
});
Deno.test("MTCNOL origin applies nonbusiness deductions only up to exclusion-only nonbusiness income", () => {
  const f = origin();
  f.noncapital_income.push(row("nonbusiness-income", false, 3000));
  f.noncapital_deductions[0].amount = 70000;
  f.noncapital_deductions.push(row("nonbusiness-deductions", false, 20000));
  const r = calculateForm8801MtcnolOrigin(f);
  assertEquals([
    r.lines[1],
    r.lines[6],
    r.lines[7],
    r.lines[8],
    r.lines[9],
    r.lines[24],
    r.origin_nol,
  ], [-77000, 20000, 3000, 3000, 17000, -60000, 60000]);
});
Deno.test("MTCNOL origin removes nonbusiness net capital loss and respects the prior MFS capital deduction", () => {
  const f = form8801MtcnolOriginSchema.parse(origin());
  f.capital_losses.push(row("capital-loss", false, 5000));
  let r = calculateForm8801MtcnolOrigin(f);
  assertEquals([
    r.lines[1],
    r.lines[4],
    r.lines[16],
    r.lines[19],
    r.lines[20],
    r.lines[22],
    r.origin_nol,
  ], [-53000, 5000, 5000, 3000, 2000, 3000, 50000]);
  f.filing_status = "married_filing_separately";
  r = calculateForm8801MtcnolOrigin(f);
  assertEquals([
    r.lines[1],
    r.lines[19],
    r.lines[20],
    r.lines[22],
    r.origin_nol,
  ], [-51500, 1500, 3500, 1500, 50000]);
});
Deno.test("MTCNOL origin modifies business capital loss against nonbusiness capital-gain surplus", () => {
  const f = origin();
  f.capital_gains.push(row("nonbusiness-gain", false, 10000));
  f.capital_losses.push(row("business-loss", true, 7000));
  f.noncapital_deductions.push(row("nonbusiness-deduction", false, 4000));
  const r = calculateForm8801MtcnolOrigin(f);
  assertEquals([
    r.lines[1],
    r.lines[5],
    r.lines[10],
    r.lines[13],
    r.lines[14],
    r.lines[22],
    r.origin_nol,
  ], [-51000, 10000, 6000, 6000, 1000, 1000, 50000]);
  assertEquals(r.lines[16], undefined);
  assertEquals(r.lines[17], undefined);
});
Deno.test("MTCNOL origin no-loss stop never manufactures a carry from positive income", () => {
  const f = origin();
  f.noncapital_deductions[0].amount = 9000;
  assertEquals([
    calculateForm8801MtcnolOrigin(f).lines[24],
    calculateForm8801MtcnolOrigin(f).origin_nol,
  ], [0, 0]);
});
Deno.test("MTCNOL origin rejects duplicate sources, a regular basis and unreviewed adjustments", () => {
  const f = origin();
  f.noncapital_deductions.push({ ...f.noncapital_income[0] });
  assertThrows(
    () => calculateForm8801MtcnolOrigin(f),
    Error,
    "Duplicate MTCNOL origin",
  );
  for (
    const patch of [
      { basis: "regular_tax" },
      { section1202_exclusion_already_restored: false },
      { nol_and_qbi_deductions_excluded: false },
      { tax_year: 2017 },
      { personal_exemption: 1 },
    ]
  ) {
    assertThrows(() =>
      calculateForm8801MtcnolOrigin({ ...origin(), ...patch })
    );
  }
});
function history() {
  return {
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    reference: "loss-vintage-review",
    vintages: [{
      item_id: "loss2019",
      owner_ssn: "111223333",
      origin_year: 2019,
      direction: "carryforward",
      origin_exclusion_only_nol: {
        reference: "2019-origin",
        amount: 50000,
        refiguring: origin(),
      },
      eligibility_workpaper: {
        reference: "carry-eligibility",
        eligible_for_2024: true,
      },
      uses_before_2024: [
        { tax_year: 2020, reference: "2020-use", amount: 10000 },
        { tax_year: 2021, reference: "2021-use", amount: 15000 },
        { tax_year: 2023, reference: "2023-use", amount: 5000 },
      ],
    }],
  };
}
Deno.test("MTCNOL origin refigure binds vintage owner, year and declared amount", () => {
  const h = history(),
    context = { taxpayer_ssn: "111223333", prior_filing_status: "single" };
  const r = calculateForm8801Mtcnol(h, context);
  assertEquals([r.form8801_line3, r.originLossWorkpaperArithmeticReconciled], [
    20000,
    true,
  ]);
  h.vintages[0].origin_exclusion_only_nol.amount = 50001;
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "origin loss differs",
  );
  h.vintages[0].origin_exclusion_only_nol.amount = 50000;
  h.vintages[0].origin_exclusion_only_nol.refiguring.tax_year = 2020;
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "owner/year differs",
  );
  h.vintages[0].origin_exclusion_only_nol.refiguring.tax_year = 2019;
  h.vintages[0].origin_exclusion_only_nol.refiguring.owner_ssn = "444556666";
  assertThrows(
    () => calculateForm8801Mtcnol(h, context),
    Error,
    "owner/year differs",
  );
});
Deno.test("MTCNOL mixed computed and reviewed origins retain partial arithmetic provenance", () => {
  const h = form8801MtcnolSchema.parse(history());
  h.vintages.push({
    ...structuredClone(h.vintages[0]),
    item_id: "loss2022",
    origin_year: 2022,
    origin_exclusion_only_nol: {
      reference: "reviewed-origin-only",
      amount: 5000,
    },
    uses_before_2024: [],
  });
  const r = calculateForm8801Mtcnol(h, {
    taxpayer_ssn: "111223333",
    prior_filing_status: "single",
  });
  assertEquals(r.form8801_line3, 25000);
  assertEquals(r.originLossWorkpaperArithmeticReconciled, false);
  assertEquals(
    r.vintages.map((v) => v.originLossWorkpaperArithmeticReconciled),
    [true, false],
  );
});
Deno.test("MTCNOL computed origin reaches canonical current tax and rejects changed origin facts", async () => {
  const h = history();
  const facts = {
    ...packageFacts(),
    minimum_tax_credit_nol_workpaper: {
      reference: "derived-nol",
      amount: 20000,
      method: "reviewed_vintage_history",
      vintage_history: h,
    },
  };
  const f = await fixture(facts);
  f.inputs.w2[0].box1_wages = 30000;
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals([
    r.lines[3],
    r.lines[4],
    r.lines[11],
    r.final_schedule3.line6b_prior_year_min_tax_credit,
    r.lines[26],
  ], [20000, 100000, 3718, 1475, 4625]);
  assertEquals(r.mtcnolHistory!.originLossWorkpaperArithmeticReconciled, true);
  assertEquals([
    r.priorAcceptanceVerified,
    r.workpaperAuthenticityVerified,
    r.filingReady,
  ], [false, false, false]);
  h.vintages[0].origin_exclusion_only_nol.refiguring.noncapital_deductions[0]
    .amount++;
  const changed = await fixture(facts);
  await assertRejects(
    () =>
      stageForm8801SettledReturn(
        changed.inputs,
        changed.binding,
        changed.documents,
      ),
    Error,
    "origin loss differs",
  );
});
