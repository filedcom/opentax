import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm1062Tax2026,
  type Form1062TaxSource2026,
} from "./form1062-tax.ts";
import { form1062TaxFixture2026 } from "./form1062-tax.fixture.ts";
import { form1062Fixture2026 } from "./form1062.fixture.ts";
import { refigureForm1062Gain2026 } from "./form1062-gain-replay.ts";
import { landCapitalFixture2026 } from "./land-capital.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { energyClaimFixture2026 } from "./energy.fixture.ts";
import { syntheticIso2026 } from "./iso.fixture.ts";
import { capitalSale2026 } from "./capital.fixture.ts";
import { syntheticInvestmentClaim2026 } from "./investment.fixture.ts";

function credits(wages = 40000) {
  const land = landGraphFixture2026(45000, [], wages);
  const care = dependentCareFixture2026(wages),
    education = educationFixture2026("aotc", wages);
  const energy = energyClaimFixture2026(1000);
  const {
    no_nonrefundable_credits_other_than_dependent_care_and_education: _no,
    ...child
  } = care.f8812;
  return {
    ...land,
    general: care.general,
    w2s: care.w2s,
    form2441: care.form2441,
    f8863: education.f8863,
    f5695: energy,
    f8812: {
      ...child,
      energy_inventory_reference: energy.claim.record_reference,
    },
  };
}
function iso() {
  const source = syntheticIso2026();
  source.f3921s[0].employee_tin = "123456789";
  return source;
}

Deno.test("2026 Form 1062 reuses tax worksheets and preserves actual QBI, AGI and history", () => {
  const { input } = form1062TaxFixture2026(), before = structuredClone(input);
  const r = calculateForm1062Tax2026(input);
  // $27,900 ordinary income: table tax $3,103; $18,450 at 15%: $2,768.
  // Without $45,000 gain, taxable income $22,900: table tax $2,503.
  assertEquals([
    r.lines.line1,
    r.lines.line6,
    r.lines.line7,
    r.lines.line8,
    r.lines.line9,
    r.lines.line14,
    r.lines.line15,
  ], [5871, 67900, 45000, 22900, 2503, 3368, 842]);
  assertEquals(r.unchanged_return_facts.agi, 85000);
  assertEquals(r.without_elected_gain.amt.lines.line1a, 17100);
  assertEquals(r.gain_replay.actual.land!.calculation.opening_2027_losses, []);
  assertEquals(input, before);
  assertEquals(r.filing_ready, false);
});

Deno.test("2026 Form 1062 renets a selected subset against original section 1231 history", () => {
  const capital = landCapitalFixture2026(),
    sales = capital.land_sources_2026!.source.claim.sales;
  const second = structuredClone(sales[0]);
  second.sale_reference = "retained-sale";
  second.property_reference = "retained-parcel";
  second.acquisition_record_reference = "retained-acquisition";
  second.closing.closing_record_reference = "retained-closing";
  second.closing.selling_expenses[0].record_reference = "retained-commission";
  second.closing.gross_sales_price = 58000; // $3,000 gain after $5,000 costs.
  sales.push(second);
  const before = structuredClone(capital);
  const r = refigureForm1062Gain2026(capital, form1062Fixture2026().election);
  assertEquals([
    r.actual.line11_form4797,
    r.without_elected_gain.land_capital_gain,
    r.without_elected_gain.land_ordinary_gain_loss,
  ], [43000, 0, 3000]);
  assertEquals(r.without_elected_gain.opening_nonrecaptured_loss, 5000);
  assertEquals(r.without_elected_gain.retained_sale_references, [
    "retained-sale",
  ]);
  assertEquals(r.without_elected_gain.return_capital_gain, 200);
  assertEquals(capital, before);
});

Deno.test("2026 Form 1062 recomputes ordinary lookback gain with retained QBI deductions", () => {
  const r = calculateForm1062Tax2026(
    form1062TaxFixture2026(landGraphFixture2026(3000, [], 40000)).input,
  );
  assertEquals(r.gain_replay.actual.line11_form4797, 0);
  assertEquals(r.gain_replay.actual.ordinary_disposition_gain_loss, 3000);
  // Deduction stays $16,100 + $600 QBI; tax-table rows are $26,300 and $23,300.
  assertEquals([
    r.lines.line6,
    r.lines.line7,
    r.lines.line8,
    r.lines.line1,
    r.lines.line9,
    r.lines.line14,
    r.lines.line15,
  ], [26300, 3000, 23300, 2911, 2551, 360, 90]);
});

Deno.test("2026 Form 1062 hypothetical net land loss does not create a filed loss vintage", () => {
  const capital = landCapitalFixture2026(),
    sales = capital.land_sources_2026!.source.claim.sales;
  const loss = structuredClone(sales[0]);
  loss.sale_reference = "retained-loss";
  loss.property_reference = "loss-parcel";
  loss.acquisition_record_reference = "loss-acquisition";
  loss.closing.closing_record_reference = "loss-closing";
  loss.closing.selling_expenses[0].record_reference = "loss-commission";
  loss.closing.gross_sales_price = 45000;
  sales.push(loss);
  const r = refigureForm1062Gain2026(capital, form1062Fixture2026().election);
  assertEquals(r.actual.line11_form4797, 30000);
  assertEquals(r.without_elected_gain.land_ordinary_gain_loss, -10000);
  assertEquals(r.without_elected_gain.land_capital_gain, 0);
  assertEquals(r.actual.land!.calculation.opening_2027_losses, []);
  assertEquals("opening_2027_losses" in r.without_elected_gain, false);
});

Deno.test("2026 Form 1062 keeps investment losses in shared netting instead of subtracting a preferred gain blindly", () => {
  const capital = landCapitalFixture2026(), sale = capital.claim!.sales[0];
  sale.tax_basis = 100800.2;
  if (sale.reporting.kind !== "1099-B") throw new Error("fixture");
  sale.reporting.box1e_basis = sale.tax_basis;
  const r = refigureForm1062Gain2026(capital, form1062Fixture2026().election);
  assertEquals([
    r.actual.preferential_gain,
    r.without_elected_gain.preferential_gain,
  ], [0, 0]);
  assertEquals([
    r.actual.return_gain,
    r.without_elected_gain.return_capital_gain,
  ], [-3000, -3000]);
  assertEquals(r.qualification.elected_gain, 45000);
});

Deno.test("2026 Form 1062 reruns care, education and child/energy credits in dependency order", () => {
  const r = calculateForm1062Tax2026(form1062TaxFixture2026(credits()).input);
  // AGI stays $85,000: care $900 and nonrefundable AOTC $750 remain eligible.
  // Actual energy $1,000 and CTC $2,200; hypothetical tax permits only
  // $353 energy and $500 CTC after the shared credit-limit worksheets.
  assertEquals([
    r.lines.line4b,
    r.lines.line4d,
    r.lines.line12b,
    r.lines.line12d,
  ], [2650, 2200, 2003, 500]);
  assertEquals(
    [r.lines.line5, r.lines.line13, r.lines.line14, r.lines.line15],
    [1021, 0, 1021, 255],
  );
  assertEquals(
    r.without_elected_gain.credits.education.source_input.agi,
    85000,
  );
  assertEquals(
    r.without_elected_gain.credits.child.energy_credit?.lines.line3,
    353,
  );
  assertEquals([
    r.actual.credits.child.lines?.line27,
    r.without_elected_gain.credits.child.lines?.line27,
  ], [0, 1700]);
  assertEquals(r.unchanged_return_facts.refundable_actc, 0);
  assertEquals(r.unchanged_return_facts.refundable_aotc, 500);
});

Deno.test("2026 Form 1062 zero taxable-income floor does not make negative tax or refund credits into deferral", () => {
  const r = calculateForm1062Tax2026(
    form1062TaxFixture2026(credits(17000)).input,
  );
  assertEquals([
    r.lines.line6,
    r.lines.line7,
    r.lines.line8,
    r.lines.line9,
    r.lines.line14,
    r.lines.line15,
  ], [44900, 45000, 0, 0, 0, 0]);
  assertEquals(r.unchanged_return_facts.refundable_actc, 1700);
});

Deno.test("2026 Form 1062 retains qualified dividends and unrelated capital distributions", () => {
  const graph = landGraphFixture2026(45000, [], 40000),
    investment = syntheticInvestmentClaim2026();
  investment.f1099divs[0].box2a = 1000;
  const r = calculateForm1062Tax2026(
    form1062TaxFixture2026({
      ...graph,
      investment_income: {
        ...investment,
        capital_gain_inventory_review: {
          record_reference: "synthetic-linked-investments",
          capital_transaction_inventory_reference:
            graph.capital_gains.claim.record_reference,
        },
      },
    }).input,
  );
  assertEquals(r.actual.income.source_input.qualified_dividends, 500);
  assertEquals(
    r.without_elected_gain.income.source_input.qualified_dividends,
    500,
  );
  assertEquals([
    r.actual.income.source_input.net_capital_gain,
    r.without_elected_gain.income.source_input.net_capital_gain,
  ], [41000, 1000]);
  assertEquals(
    r.without_elected_gain.income.method,
    "qualified-dividends-capital-gain-worksheet",
  );
});

Deno.test("2026 Form 1062 derives AMT credit limits without deferring AMT", () => {
  const graph = { ...landGraphFixture2026(45000, [], 40000), f3921: iso() };
  const r = calculateForm1062Tax2026(form1062TaxFixture2026(graph).input);
  // Actual AMTI $184,000, exemption $90,100, preferred portion $40,000;
  // hypothetical AMTI $139,000, ordinary AMT base $48,900 at 26%.
  assertEquals([
    r.actual.amt.lines.line11,
    r.without_elected_gain.amt.lines.line11,
  ], [10911, 10211]);
  assertEquals(r.without_elected_gain.amt.lines.line7, 12714);
  assertEquals([r.lines.line2, r.lines.line10, r.lines.line14], [0, 0, 3368]);
  assertEquals(r.unchanged_return_facts.actual_amt, 10911);
});

Deno.test("2026 Form 1062 caps line 12z as printed when credits also offset AMT", () => {
  const graph = {
    ...landGraphFixture2026(45000, [], 40000),
    f3921: iso(),
    f5695: energyClaimFixture2026(100000),
  };
  const r = calculateForm1062Tax2026(form1062TaxFixture2026(graph).input);
  assertEquals([
    r.lines.line4b,
    r.lines.line5,
    r.lines.line12b,
    r.lines.line12z,
    r.lines.line13,
    r.lines.line14,
  ], [16782, -10911, 12714, 2503, 0, 0]);
});

Deno.test("2026 Form 1062 leaves SE, NIIT and payroll taxes on the actual return", () => {
  const graph = landGraphFixture2026(45000, [10000], 146000);
  graph.capital_gains.claim.sales = [capitalSale2026("investment")];
  const r = calculateForm1062Tax2026(form1062TaxFixture2026(graph).input);
  assert(r.source_input.schedule2.line4_self_employment_tax! > 0);
  assert(r.source_input.schedule2.line6_niit! > 0);
  assert(r.unchanged_return_facts.other_taxes > 0);
  assertEquals([r.lines.line2, r.lines.line10], [0, 0]);
});

Deno.test("2026 Form 1062 rejects stale tax, credit and owner handoffs", () => {
  const mutations: ((f: Form1062TaxSource2026) => void)[] = [
    (f) => {
      f.return_lines.line16_income_tax++;
    },
    (f) => {
      f.return_lines.line15_taxable_income++;
    },
    (f) => {
      f.return_lines.line19_child_tax_credit++;
    },
    (f) => {
      f.return_lines.line20_nonrefundable_credits++;
    },
    (f) => {
      f.return_lines.line23_other_taxes++;
    },
    (f) => {
      f.return_lines.line28_actc++;
    },
    (f) => {
      f.return_lines.line29_refundable_aotc++;
    },
    (f) => {
      f.child.auto_agi++;
    },
    (f) => {
      f.care.regular_tax++;
    },
    (f) => {
      f.education.finalized_dependent_care_credit++;
    },
    (f) => {
      f.child.finalized_education_credit = 1;
    },
    (f) => {
      f.child.taxpayer_ssn = "987654321";
    },
    (f) => {
      f.income_tax.net_capital_gain = 39999;
    },
    (f) => {
      f.schedule2.line2_amt = 1;
    },
    (f) => {
      f.amt.qualified_dividends = 1;
    },
    (f) => {
      f.child.wage_income_from_agi++;
    },
    (f) => {
      f.education.education_context.taxpayer_dob = "1981-06-01";
    },
  ];
  for (const mutate of mutations) {
    const f = form1062TaxFixture2026().input;
    mutate(f);
    assertThrows(() => calculateForm1062Tax2026(f));
  }
});

Deno.test("2026 Form 1062 rejects omitted land, unsupported sources and asserted tax differences", () => {
  const f = form1062TaxFixture2026().input;
  delete f.amt.capital_sources_2026;
  assertThrows(
    () => calculateForm1062Tax2026(f),
    Error,
    "land/capital inventory",
  );
  const g = form1062TaxFixture2026().input;
  g.income_tax.rate_28_gain = 100;
  assertThrows(() => calculateForm1062Tax2026(g), Error, "source replay");
  assertThrows(() =>
    calculateForm1062Tax2026(
      {
        ...form1062TaxFixture2026().input,
        applicable_tax: 1,
      } as Form1062TaxSource2026,
    )
  );
});
