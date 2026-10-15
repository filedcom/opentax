import { amtFixture2026 } from "./form6251.fixture.ts";
import { assertEquals, assertObjectMatch, assertThrows } from "@std/assert";
import { FilingStatus as F } from "../../nodes/types.ts";
import {
  calculateForm6251_2026,
  form6251_2026,
  type Form6251Input2026,
} from "./form6251.ts";
import { calculateIsoSources2026 } from "../inputs/iso-source.ts";
import { syntheticIso2026 } from "../inputs/iso.fixture.ts";
import { f3921_2026 } from "../inputs/f3921.ts";
import { buildStartNode } from "../../start.ts";
import { inputNodes } from "../inputs.ts";

const ctx = { taxYear: 2026, formType: "f1040" } as const;
function atAmti(amti: number, status = F.Single) {
  return calculateForm6251_2026({
    ...amtFixture2026,
    filing_status: status,
    iso_sources_2026: undefined,
    regular_tax_income: amti,
    line2a_taxes_paid: 0,
  });
}

Deno.test("2026 AMT exemptions use 50% phaseout with filed-dollar rounding for all statuses", () => {
  for (
    const [status, full, start, finish] of [
      [F.Single, 90100, 500000, 680200],
      [F.HOH, 90100, 500000, 680200],
      [F.MFJ, 140200, 1000000, 1280400],
      [F.QSS, 140200, 1000000, 1280400],
      [F.MFS, 70100, 500000, 640200],
    ] as const
  ) {
    assertEquals(atAmti(start - 1, status).lines.line5, full);
    assertEquals(atAmti(start, status).lines.line5, full);
    assertEquals(atAmti(start + 1, status).lines.line5, full);
    assertEquals(atAmti(start + 2, status).lines.line5, full - 1);
    assertEquals(atAmti(finish - 1, status).lines.line5, 1);
    assertEquals(atAmti(finish, status).lines.line5, 0);
    assertEquals(atAmti(finish + 1, status).lines.line5, 0);
  }
});
Deno.test("2026 married-separate AMTI addition starts at 640200, uses 50%, and caps at 70100", () => {
  for (
    const [base, addition] of [
      [640199, 0],
      [640200, 0],
      [640201, 1],
      [640202, 1],
      [700000, 29900],
      [780399, 70100],
      [780400, 70100],
      [900000, 70100],
    ]
  ) {
    const result = atAmti(base, F.MFS);
    assertEquals(result.mfsAddition, addition);
    assertEquals(result.lines.line4, base + addition);
  }
  assertEquals(atAmti(700000).mfsAddition, 0);
});
Deno.test("2026 ordinary AMT brackets and negative/zero taxable excess match printed form", () => {
  for (
    const [status, exemption, threshold, atThreshold] of [
      [F.Single, 90100, 244500, 63570],
      [F.MFS, 70100, 122250, 31785],
      [F.MFJ, 140200, 244500, 63570],
    ] as const
  ) {
    assertEquals(
      atAmti(exemption + threshold, status).lines.line7,
      atThreshold,
    );
    assertEquals(
      atAmti(exemption + threshold + 100, status).lines.line7,
      atThreshold + 28,
    );
    assertEquals(
      atAmti(exemption + threshold - 100, status).lines.line7,
      atThreshold - 26,
    );
  }
  assertObjectMatch(atAmti(-10000), {
    file_form6251: false,
    lines: {
      line1b: -10000,
      line4: -10000,
      line5: 90100,
      line6: 0,
      line7: 0,
      line9: 0,
      line11: 0,
    },
  });
  assertEquals(atAmti(90100).lines.line6, 0);
});
Deno.test("2026 ISO sources reconcile cents, ownership and the retained basis ledger", () => {
  const source = {
    ...syntheticIso2026(),
    filing_status: F.Single,
    taxpayer_ssn: "111223333",
  };
  assertObjectMatch(calculateIsoSources2026(source), {
    line2i: 100000,
    ledger: [{
      tax_year: 2026,
      regular_basis_cents: 1000000,
      amt_adjustment_cents: 10000000,
      amt_basis_cents: 11000000,
    }],
  });
  source.f3921s[0].box3_exercise_price_per_share = 1;
  source.f3921s[0].box4_fmv_per_share = 1.004;
  source.f3921s[0].box5_shares_transferred = 100;
  source.f3921s.push({
    ...source.f3921s[0],
    source_document_reference: "second-copy",
  });
  source.year_end_holdings_review.source_document_references.push(
    "second-copy",
  );
  assertEquals(calculateIsoSources2026(source).line2i, 1); // 40c + 40c, not rounded per lot.
  assertThrows(
    () => calculateIsoSources2026({ ...source, taxpayer_ssn: "222334444" }),
    Error,
    "employee must match",
  );
  assertEquals(
    calculateIsoSources2026({
      ...source,
      filing_status: F.MFJ,
      taxpayer_ssn: "222334444",
      spouse_ssn: "111223333",
    }).line2i,
    1,
  );
  assertThrows(
    () =>
      calculateIsoSources2026({
        ...source,
        filing_status: F.MFS,
        taxpayer_ssn: "222334444",
        spouse_ssn: "111223333",
      }),
    Error,
    "employee must match",
  );
});
Deno.test("2026 ISO sources reject duplicate copies, wrong years, partial holdings and unsupported rights/sales", () => {
  const source = () => ({
    ...syntheticIso2026(),
    filing_status: F.Single,
    taxpayer_ssn: "111223333",
  });
  const duplicate = source();
  duplicate.f3921s.push(duplicate.f3921s[0]);
  assertThrows(
    () => calculateIsoSources2026(duplicate),
    Error,
    "cannot be entered twice",
  );
  const old = source();
  old.f3921s[0].box2_date_option_exercised = "2025-06-01";
  assertThrows(() => calculateIsoSources2026(old), Error, "must occur in 2026");
  const missing = source();
  missing.year_end_holdings_review.source_document_references = ["different"];
  assertThrows(
    () => calculateIsoSources2026(missing),
    Error,
    "each issued Form 3921",
  );
  for (
    const patch of [{ shares_disposed_during_exercise_year: 1 }, {
      amount_paid_for_option: 10,
    }, {
      rights_transferable_and_not_subject_to_substantial_risk_on_exercise:
        false,
    }]
  ) {
    const bad = source();
    Object.assign(bad.f3921s[0], patch);
    assertThrows(() => calculateIsoSources2026(bad));
  }
  assertThrows(() =>
    f3921_2026.compute(ctx, {
      filing_status: F.Single,
      taxpayer_ssn: "111223333",
      tax_year: 2026,
    })
  );
});
Deno.test("2026 Part III uses current 0/15/20% thresholds and isolates 1250/28% gains", () => {
  const result = calculateForm6251_2026({
    ...amtFixture2026,
    iso_sources_2026: undefined,
    regular_tax_income: 500000,
    line2a_taxes_paid: 0,
    regular_taxable_income: 500000,
    qualified_dividends: 50000,
    net_capital_gain: 50000,
  });
  assertObjectMatch(result.lines, {
    line6: 409900,
    line13: 100000,
    line15: 100000,
    line17: 309900,
    line18: 81882,
    line19: 49450,
    line20: 400000,
    line23: 0,
    line25: 545500,
    line30: 100000,
    line31: 15000,
    line38: 96882,
    line39: 109882,
    line40: 96882,
    line7: 96882,
  });
  const special = calculateForm6251_2026({
    ...amtFixture2026,
    iso_sources_2026: undefined,
    regular_tax_income: 500000,
    line2a_taxes_paid: 0,
    regular_taxable_income: 500000,
    qualified_dividends: 10000,
    net_capital_gain: 100000,
    unrecaptured_1250_gain: 30000,
    rate_28_gain: 20000,
  });
  assertObjectMatch(special.lines, {
    line13: 60000,
    line14: 30000,
    line15: 90000,
    line17: 319900,
    line18: 84682,
    line20: 440000,
    line27: 390000,
    line31: 9000,
    line36: 30000,
    line37: 7500,
    line40: 101182,
  });
  const allZeroRate = calculateForm6251_2026({
    ...amtFixture2026,
    iso_sources_2026: undefined,
    regular_tax_income: 100000,
    line2a_taxes_paid: 0,
    regular_taxable_income: 20000,
    qualified_dividends: 20000,
  });
  assertEquals(allZeroRate.lines.line7, 0);
  assertEquals(allZeroRate.partThree?.line33, undefined);
});
Deno.test("2026 AMT rejects unowned adjustments and public asserted tax inputs", () => {
  for (
    const patch of [
      { iso_adjustment: 100000 },
      { amtftc: 1 },
      { line2b_tax_refund: 100 },
      { form4952_amt_election: 1 },
      { foreign_earned_income_exclusion: 10000 },
      { schedule2_line1z_tax: 1 },
      { must_file_for_credit: true },
    ]
  ) {
    assertThrows(() =>
      calculateForm6251_2026(
        { ...amtFixture2026, ...patch } as unknown as Form6251Input2026,
      )
    );
  }
  assertThrows(() =>
    buildStartNode(inputNodes).inputSchema.parse({ form6251: amtFixture2026 })
  );
  assertThrows(
    () => form6251_2026.compute({ ...ctx, taxYear: 2025 }, amtFixture2026),
    Error,
    "f1040:2026",
  );
  assertObjectMatch(calculateForm6251_2026(amtFixture2026), {
    file_form6251: true,
    lines: {
      line4: 250000,
      line5: 90100,
      line6: 159900,
      line7: 41574,
      line9: 41574,
      line10: 24734,
      line11: 16840,
    },
  });
});

Deno.test("2026 Part III crosses both capital-gain rate boundaries for every filing status", () => {
  for (
    const [status, exemption, zero, fifteen] of [
      [F.Single, 90100, 49450, 545500],
      [F.HOH, 90100, 66200, 579600],
      [F.MFJ, 140200, 98900, 613700],
      [F.QSS, 140200, 98900, 613700],
      [F.MFS, 70100, 49450, 306850],
    ] as const
  ) {
    // Isolate the printed Part III worksheet operands: 20,000 taxable excess
    // and dividends, with 10,000 on each side of the tested regular-tax limit.
    for (const [ceiling, expectedTax] of [[zero, 1500], [fifteen, 3500]]) {
      const result = calculateForm6251_2026({
        ...amtFixture2026,
        filing_status: status,
        iso_sources_2026: undefined,
        regular_tax_income: exemption + 20000,
        line2a_taxes_paid: 0,
        regular_taxable_income: ceiling + 10000,
        qualified_dividends: 20000,
      });
      assertEquals(result.lines.line7, expectedTax);
      assertEquals(result.partThree?.line19, zero);
      assertEquals(result.partThree?.line25, fifteen);
    }
  }
});
