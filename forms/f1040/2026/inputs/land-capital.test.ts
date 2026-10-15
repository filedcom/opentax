import { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";
import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCapitalGains2026,
  capital_gains_2026,
} from "../nodes/capital-gains.ts";
import { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { calculateForm6251_2026 } from "../nodes/form6251.ts";
import { calculateCapitalCarryover2027 } from "../nodes/capital-carryover.ts";
import { landNiitExclusion2026 } from "./land-disposition-bridge.ts";
import {
  landCapitalFixture2026,
  landNiitFixture2026,
} from "./land-capital.fixture.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { capitalFixture2026 } from "./capital.fixture.ts";

Deno.test("2026 land capital handoff nets shared 4797 gain once with investment sales", () => {
  const input = landCapitalFixture2026(), before = structuredClone(input);
  const r = calculateCapitalGains2026(input);
  assertEquals([r.line7, r.line11_form4797, r.line15, r.line16], [
    200,
    40000,
    40000,
    40200,
  ]);
  assertEquals([
    r.return_gain,
    r.preferential_gain,
    r.ordinary_disposition_gain_loss,
  ], [40200, 40000, 5000]);
  assertEquals(r.return_gain + r.ordinary_disposition_gain_loss, 45200);
  assertEquals(r.file_schedule_d, true);
  assertEquals(r.file_form8949, false);
  assertEquals(r.direct_distribution, false);
  assertEquals(input, before);
});

Deno.test("2026 land capital handoff retains investment loss offsets and actual 2027 carryover", () => {
  const input = landCapitalFixture2026(), sale = input.claim!.sales[0];
  sale.tax_basis = 101000;
  sale.actual_proceeds_before_additional_expenses = 1000;
  if (sale.reporting.kind !== "1099-B") throw new Error("fixture");
  sale.reporting.box1e_basis = 101000;
  sale.reporting.box1d_proceeds = 1000;
  const r = calculateCapitalGains2026(input);
  assertEquals([
    r.line7,
    r.line15,
    r.line16,
    r.return_gain,
    r.preferential_gain,
  ], [-100000, 40000, -60000, -3000, 0]);
  const carry = calculateCapitalCarryover2027({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    schedule_d_line7: r.line7,
    schedule_d_line15: r.line15,
    form1040_line7a: r.return_gain,
    form1040_line11b: 300000,
    form1040_line14: 16100,
    form1040_line15: 283900,
  });
  assertEquals([carry.short_term, carry.long_term], [57000, 0]);
  const niit = calculateForm8960_2026(landNiitFixture2026(input));
  assertEquals(niit.lines?.line5a_net_gain, 2000);
  assertEquals(niit.lines?.line5b_net_gain_adjustment, -45000);
  // Investment losses absorbed by excluded gains remain part of the NIIT
  // subtraction. Refiguring another Schedule D would incorrectly give -3000.
  assertEquals(niit.lines?.line5d_combined, -43000);
  assertEquals(niit.tax, 0);
});

Deno.test("2026 all-lookback land gain remains ordinary without forcing Schedule D", () => {
  const input = landCapitalFixture2026();
  input.claim!.sales = [];
  input.land_sources_2026!.source.claim.sales[0].closing.gross_sales_price =
    58000;
  const r = calculateCapitalGains2026(input);
  assertEquals([
    r.line11_form4797,
    r.return_gain,
    r.ordinary_disposition_gain_loss,
  ], [0, 0, 3000]);
  assertEquals(r.file_schedule_d, false);
  const n = calculateForm8960_2026(landNiitFixture2026(input));
  assertEquals([
    n.lines?.line5a_net_gain,
    n.lines?.line5b_net_gain_adjustment,
    n.lines?.line5d_combined,
  ], [3000, -3000, 0]);
});

Deno.test("2026 limited land loss keeps the ordinary adjustment and finalized history distinct", () => {
  const input = landCapitalFixture2026(), bridge = input.land_sources_2026!;
  bridge.source.claim.sales[0].closing.gross_sales_price = 52000;
  assertThrows(
    () => calculateCapitalGains2026(input),
    Error,
    "amount taken into account",
  );
  bridge.finalized_loss = {
    amount_taken_into_account: 1000,
    finalized_limitation_workpaper_reference: "synthetic-final-limits",
  };
  const r = calculateCapitalGains2026(input);
  assertEquals([
    r.line11_form4797,
    r.return_gain,
    r.ordinary_disposition_gain_loss,
  ], [0, 200, -3000]);
  assertEquals(r.land?.calculation.opening_2027_losses, [{
    loss_year: 2026,
    remaining_loss: 1000,
  }]);
  const exclusion = landNiitExclusion2026(r.land!);
  assertEquals(exclusion.line5b_adjustment, 3000);
  assertEquals(exclusion.next_year_excluded_capital_loss_adjustment, 0);
});

Deno.test("2026 NIIT excludes documented land character and retains taxable investment gain", () => {
  const raw = landNiitFixture2026();
  const r = calculateForm8960_2026(raw);
  assertEquals([
    r.lines?.line5a_net_gain,
    r.lines?.line5b_net_gain_adjustment,
    r.lines?.line5d_combined,
  ], [45200, -45000, 200]);
  assertEquals(r.tax, 8);
  assertEquals(r.land_exclusion_workpaper?.activities[0].sale_references, [
    "sale-1",
  ]);
  for (
    const delta of [{ ordinary_disposition_gain_from_agi: 4999 }, {
      capital_gain_from_agi: 40201,
    }]
  ) {
    assertThrows(
      () => calculateForm8960_2026({ ...raw, ...delta }),
      Error,
      "disagree with AGI",
    );
  }
  assertThrows(
    () => calculateForm8960_2026({ ...raw, taxpayer_ssn: "987654321" }),
    Error,
    "match return owners",
  );
});

Deno.test("2026 land NIIT requires exact activity ownership and participation sources", () => {
  for (
    const mutate of [
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.niit_review = undefined;
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.niit_review!.activities[0].owner_tin = "987654321";
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.niit_review!.activities[0].activity_reference =
          "wrong";
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.niit_review!.activities.push(
          f.land_sources_2026!.niit_review!.activities[0],
        );
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.niit_review!.activities[0]
          .participation_history_reference = "";
      },
    ]
  ) {
    const f = landCapitalFixture2026();
    mutate(f);
    assertThrows(() => calculateForm8960_2026(landNiitFixture2026(f)));
  }
});

Deno.test("2026 land capital owner and reciprocal inventory checks reject omitted or wrong sources", () => {
  for (
    const mutate of [
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026 = undefined;
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.source.taxpayer_ssn = "987654321";
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.claim = undefined;
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.claim!.land_disposition_inventory_reference = "wrong";
      },
      (f: ReturnType<typeof landCapitalFixture2026>) => {
        f.land_sources_2026!.reconciliation.capital_inventory_reference =
          "wrong";
      },
    ]
  ) {
    const f = landCapitalFixture2026();
    mutate(f);
    assertThrows(() => calculateCapitalGains2026(f));
  }
});

Deno.test("2026 AMT replays the same land and investment preference source", () => {
  const source = landCapitalFixture2026();
  const raw = {
    filing_status: source.filing_status,
    taxpayer_ssn: source.taxpayer_ssn,
    line1a_deductions_without_senior: 16100,
    regular_tax_income: 200000,
    regular_taxable_income: 200000,
    regular_tax: 30000,
    taking_standard_deduction: true,
    line2a_taxes_paid: 0,
    capital_sources_2026: source,
    net_capital_gain: 40000,
  };
  const r = calculateForm6251_2026(raw);
  assertEquals(r.source_input.net_capital_gain, 40000);
  assertEquals(r.partThree !== undefined, true);
  assertThrows(
    () => calculateForm6251_2026({ ...raw, net_capital_gain: 45000 }),
    Error,
    "disagree with regular preference",
  );
});

Deno.test("2026 staged land handoff cannot enter the return graph before its remaining owners", () => {
  const input = landCapitalFixture2026();
  assertThrows(
    () =>
      capital_gains_2026.compute({ taxYear: 2026, formType: "f1040" }, input),
    Error,
    "awaits QBI",
  );
  const publicInput = capitalFixture2026();
  assertEquals(
    sourceRegistry2026.start.inputSchema.safeParse({
      ...publicInput,
      capital_gains: {
        ...publicInput.capital_gains,
        land_sources_2026: input.land_sources_2026,
      },
    }).success,
    false,
  );
});

Deno.test("2026 land NIIT allocates itemized income taxes after the source exclusion", () => {
  const raw = landNiitFixture2026();
  raw.capital_sources_2026!.claim!.state_income_tax_allocation_review = {
    record_reference: "synthetic-tax-allocation",
    method: "nii_to_agi_after_proportional_salt_limit",
    reasonable_for_reported_income_and_tax_payments: true,
  };
  raw.taking_standard_deduction = false;
  raw.itemized_before_overall_limit = 20000;
  raw.itemized_after_overall_limit = 20000;
  raw.schedule_a_tax_facts = {
    tax_election: "income",
    income_taxes: 10000,
    total_taxes_before_limit: 10000,
    allowed_taxes: 10000,
  };
  const r = calculateForm8960_2026(raw);
  assertEquals(r.lines?.line9b_state_local_tax, 7);
  assertEquals(r.tax, 7);
});
Deno.test("2026 land cannot silently bypass QBI in direct deduction finalization", () => {
  const source = landCapitalFixture2026();
  assertThrows(
    () =>
      calculateDeductionSelection2026({
        filing_status: source.filing_status,
        agi: 145200,
        standard_deduction_eligible: true,
        capital_sources_2026: source,
      }),
    Error,
    "QBI and loss-limit owners",
  );
});
