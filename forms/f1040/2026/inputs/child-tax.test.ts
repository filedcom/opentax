import { syntheticPabReview2026 } from "./investment.fixture.ts";
import { capitalFixture2026 } from "./capital.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { childTaxFixture2026, parentReturn2026 } from "./child-tax.fixture.ts";
import { childTaxInput2026Schema, resolveChildTax2026 } from "./child-tax.ts";
import { resolveChildTaxFamily2026 } from "./child-tax-family.ts";
import { syntheticMedical2026 } from "../schedule-a.fixture.ts";
const run = (raw: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, raw, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(raw: Record<string, unknown>) {
  const result = run(raw);
  assertEquals(result.diagnostics, []);
  return result.pending;
}
function reviewed(wages = 0) {
  const p = complete(childTaxFixture2026(wages));
  return childTaxInput2026Schema.parse(
    (p.f8615.calculation_2026 as ReturnType<typeof resolveChildTax2026>)
      .source_input,
  );
}
Deno.test("2026 child sources reach shared Form 8615 and replace regular tax before credits and AMT", () => {
  const p = complete(childTaxFixture2026());
  assertEquals(p.f1040.line12e_standard_or_itemized, 1350);
  assertEquals(p.f1040.line15_taxable_income, 3650);
  assertEquals(p.form8615.line9_family_tax, 9383);
  assertEquals(p.form8615.line17_child_regular_tax, 368);
  assertEquals(p.f1040.line16_income_tax, 412);
  assertEquals(p.form6251.regular_tax, 412);
  assertEquals(p.f2441.regular_tax, 412);
  assertEquals(p.f8863.regular_tax, 412);
  assertEquals(p.f8812.auto_income_tax_liability, 412);
});
Deno.test("2026 child source eligibility preserves January 1 and exact half-support boundaries", () => {
  const input = reviewed(10000);
  for (
    const [dob, months, support, applies] of [
      ["2009-01-02", [], 0, true],
      ["2009-01-01", [], 19999.99, false],
      ["2009-01-01", [], 20000, true],
      ["2008-01-01", [1, 2, 3, 4], 20000, false],
      ["2008-01-01", [1, 2, 3, 4, 5], 20000, true],
      ["2003-01-02", [1, 2, 3, 4, 5], 20000, true],
      ["2003-01-01", [1, 2, 3, 4, 5], 20000, false],
    ] as const
  ) {
    const r = resolveChildTax2026({
      ...input,
      child_context: { ...input.child_context, taxpayer_dob: dob },
      claim: {
        ...input.claim!,
        full_time_student_months: [...months],
        support_records: [{
          record_reference: "support",
          kind: "ordinary_support",
          amount: support,
        }],
      },
    });
    assertEquals(r.eligibility?.applies, applies, dob);
  }
});
Deno.test("2026 child no-parent, no-student and higher earned-support reviews release the blanket age guard", () => {
  const f = childTaxFixture2026();
  f.f8615.claim.parent_life_records.forEach((p) =>
    p.alive_on_2026_12_31 = false
  );
  assertEquals(complete(f).f1040.line16_income_tax, 368);
  const older = childTaxFixture2026(10000);
  older.general.taxpayer_dob = "2005-06-01";
  older.f8615.claim.full_time_student_months = [1, 2, 3, 4];
  assertEquals(complete(older).form8615, undefined);
  older.f8615.claim.full_time_student_months = [1, 2, 3, 4, 5];
  older.f8615.claim.support_records[0].amount = 19999.99;
  assertEquals(complete(older).form8615, undefined);
});
Deno.test("2026 child support excludes scholarships only for a full-time student", () => {
  const input = reviewed(10000);
  input.child_context.taxpayer_dob = "2008-06-01";
  input.claim!.support_records = [{
    record_reference: "ordinary",
    kind: "ordinary_support",
    amount: 19000,
  }, { record_reference: "grant", kind: "scholarship", amount: 5000 }];
  assertEquals(resolveChildTax2026(input).eligibility?.applies, false);
  input.claim!.full_time_student_months = [];
  assertEquals(resolveChildTax2026(input).eligibility?.support, 24000);
  assertEquals(resolveChildTax2026(input).eligibility?.applies, true);
});
Deno.test("2026 child line 1 subtracts issued early-withdrawal penalties and retains a stop form", () => {
  const f = childTaxFixture2026(1000, 3000);
  Object.assign(f.investment_income.f1099ints[0], { box2: 1000 });
  const p = complete(f);
  assertEquals(p.form8615.line1_child_unearned_income, 2000);
  assertEquals(p.form8615.line3_adjusted_unearned_income, -700);
  assertEquals(p.form8615.line4_child_taxable_income, undefined);
  assertEquals(p.f1040.line16_income_tax, 156);
});
Deno.test("2026 child deductions can stop Form 8615 after line 5", () => {
  const f = childTaxFixture2026(20000, 3000);
  const medical = {
    ...syntheticMedical2026(),
    payer_ssn: f.general.taxpayer_ssn,
    patient_ssn: f.general.taxpayer_ssn,
    amount_paid: 30000,
    reimbursed_amount: 0,
    tax_free_funding_amount: 0,
    nonmedical_amount: 0,
  };
  const p = complete({
    ...f,
    schedule_a: { ...f.schedule_a, medical_payments: [medical] },
  });
  assertEquals(p.f1040.line15_taxable_income, 0);
  assertEquals(p.form8615.line5_child_net_unearned_income, 0);
  assertEquals(p.form8615.line6_parent_taxable_income, undefined);
  assertEquals(p.f1040.line16_income_tax, 0);
});
Deno.test("2026 parent selection uses the first joint owner and the greater separate taxable income", () => {
  const family = childTaxFixture2026().f8615.claim.family!;
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654321",
  );
  family.parent_returns = [
    parentReturn2026("987654321", FilingStatus.MFS, 50000),
    parentReturn2026("987654322", FilingStatus.MFS, 80000),
  ];
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654322",
  );
  family.selection = {
    kind: "never_married_lived_together_all_year",
    record_reference: "home",
    parent_tins: ["987654321", "987654322"],
  };
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654322",
  );
});
Deno.test("2026 custody selection uses residence, equal-night AGI and remarried stepparent returns", () => {
  const family = childTaxFixture2026().f8615.claim.family!;
  family.parent_returns = [
    parentReturn2026("987654321", FilingStatus.Single, 50000),
    parentReturn2026("987654322", FilingStatus.Single, 80000),
  ];
  family.selection = {
    kind: "custodial_parent",
    relationship: "divorced_or_legally_separated",
    record_reference: "decree",
    parent_tins: ["987654321", "987654322"],
    custody: {
      record_reference: "nights",
      residence_records: [{ parent_tin: "987654321", credited_nights: 200 }, {
        parent_tin: "987654322",
        credited_nights: 165,
      }],
    },
  };
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654321",
  );
  family.selection.custody.residence_records.forEach((r) =>
    r.credited_nights = 180
  );
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654322",
  );
  family.selection.custody.residence_records[0].credited_nights = 185;
  family.selection.remarriage = {
    record_reference: "new-marriage",
    spouse_tin: "987654323",
    shared_home_all_year: true,
  };
  family.parent_returns[0].filing_status = FilingStatus.MFS;
  family.parent_returns.push(
    parentReturn2026("987654323", FilingStatus.MFS, 70000),
  );
  const r = resolveChildTaxFamily2026(family, "123456789");
  assertEquals(r.source.parent_ssn, "987654323");
  assertEquals(
    resolveChildTaxFamily2026(r.family, "123456789").source,
    r.source,
  );
});
Deno.test("2026 married-living-apart exception requires all home and dependency conditions", () => {
  const family = childTaxFixture2026().f8615.claim.family!;
  family.parent_returns = [
    parentReturn2026("987654321", FilingStatus.MFS, 50000),
    parentReturn2026("987654322", FilingStatus.MFS, 80000),
  ];
  family.selection = {
    kind: "parents_married",
    shared_home_all_year: false,
    record_reference: "marriage",
    parent_tins: ["987654321", "987654322"],
    custody: {
      record_reference: "residence",
      residence_records: [{ parent_tin: "987654321", credited_nights: 200 }, {
        parent_tin: "987654322",
        credited_nights: 165,
      }],
    },
    living_apart_review: {
      record_reference: "home-ledger",
      spouse_lived_in_home_last_six_months_including_temporary_absences: false,
      annual_home_cost: 20000,
      custodial_parent_paid: 10000.01,
      qualifying_child_tin: "123456789",
      child_home_days_including_temporary_absences: 200,
      dependency_treatment: "released_to_non_custodial",
    },
  };
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654321",
  );
  family.selection.living_apart_review!.custodial_parent_paid = 10000;
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_ssn,
    "987654322",
  );
});
Deno.test("2026 sibling allocation derives line 5 and preferential character from linked worksheets", () => {
  const f = childTaxFixture2026();
  f.f8615.claim.family!.other_children = [{
    document_reference: "sibling-8615",
    child_tin: "111223333",
    selected_parent_return_reference: "return-987654321",
    tax_year: 2026,
    line1_unearned_income: 5000,
    line4_taxable_income: 3650,
    line5_net_unearned_income: 2300,
    qualified_dividends: 1000,
    net_capital_gain: 0,
    adjusted_gross_income: 5000,
    deduction: 1350,
    additional_deductions: 0,
    taking_standard_deduction: true,
    directly_connected_itemized_deductions: 0,
    directly_connected_preferential_deductions: 0,
    schedule_d_tax_worksheet_used: false,
    schedule_j_used: false,
    form2555_used: false,
  }];
  const p = complete(f);
  assertEquals(p.form8615.line7_other_children_income, 2300);
  assertEquals(p.form8615.line12b_allocation_ratio, .5);
  assertEquals(p.form8615.line9_preferential_tax_used, true);
  const family = resolveChildTaxFamily2026(
    f.f8615.claim.family!,
    f.general.taxpayer_ssn,
  );
  assertEquals(family.source.other_children_qualified_dividends_line5, [460]);
  f.f8615.claim.family!.other_children[0].line5_net_unearned_income = 2301;
  assertThrows(
    () =>
      resolveChildTaxFamily2026(f.f8615.claim.family!, f.general.taxpayer_ssn),
    Error,
    "line 5 disagrees",
  );
});
Deno.test("2026 parent line 16 excludes Form 4972, Form 8814 and education recapture before reconciliation", () => {
  const family = childTaxFixture2026().f8615.claim.family!;
  const p = family.parent_returns[0];
  p.form4972_tax = 100;
  p.form8814_tax = 200;
  p.education_recapture_tax = 300;
  p.line16_income_tax += 600;
  assertEquals(
    resolveChildTaxFamily2026(family, "123456789").source.parent_income_tax,
    9107,
  );
  p.line16_income_tax += 1;
  assertThrows(
    () => resolveChildTaxFamily2026(family, "123456789"),
    Error,
    "do not reconcile",
  );
});
Deno.test("2026 child review rejects missing family, mismatched identity, duplicate evidence and unsupported income", () => {
  const input = reviewed();
  for (
    const change of [
      (r: typeof input) => {
        delete r.claim!.family;
      },
      (r: typeof input) => {
        r.claim!.child_tin = "111223333";
      },
      (r: typeof input) => {
        r.claim!.full_time_student_months.push(1);
      },
      (r: typeof input) => {
        r.claim!.support_records.push(r.claim!.support_records[0]);
      },
      (r: typeof input) => {
        r.income_context.unsupported_child_income_activity = true;
      },
    ]
  ) {
    const r = structuredClone(input);
    change(r);
    assertThrows(() => resolveChildTax2026(r));
  }
  const f = childTaxFixture2026();
  const { f8615: _, ...missing } = f;
  assert(
    run(missing).diagnostics.some((d) =>
      String(d.message).includes("Form 8615 source eligibility")
    ),
  );
  assertThrows(() =>
    sourceRegistry2026.start.inputSchema.parse({
      ...f,
      f8615: {
        claim: {
          ...f.f8615.claim,
          eligibility_confirmed: true,
          child_unearned_income: 5000,
        },
      },
    })
  );
});

Deno.test("2026 half-support child tax and refundable AOTC use different legal boundaries on the same facts", () => {
  const f = childTaxFixture2026(10000);
  f.general.taxpayer_dob = "2008-06-01";
  const education = educationFixture2026("aotc", 10000).f8863;
  education.claim.refundable_review = {
    kind: "under24_nonjoint",
    record_reference: "support-review",
    at_least_one_parent_alive: true,
    full_time_student_months: [1, 2, 3, 4, 5],
    enrollment_record_reference: "school-record",
    complete_support_inventory: true,
    support_records: [{
      record_reference: "support-ledger",
      amount: 20000,
      payer: "parent",
      category: "housing",
    }],
  };
  const p = complete({ ...f, f8863: education });
  assert(p.form8615);
  assertEquals(p.f1040.line29_refundable_aotc, 1000);
  education.claim.refundable_review.support_records[0].amount = 20000.01;
  assert(
    run({ ...f, f8863: education }).diagnostics.some((d) =>
      String(d.message).includes("Education and child-tax reviews")
    ),
  );
});
Deno.test("2026 stopped Form 8615 does not require unused advanced parent tax worksheets", () => {
  const f = childTaxFixture2026(1000, 3000);
  Object.assign(f.investment_income.f1099ints[0], { box2: 1000 });
  f.f8615.claim.family!.parent_returns[0].schedule_j_used = true;
  assertEquals(complete(f).form8615.line3_adjusted_unearned_income, -700);
  Object.assign(f.investment_income.f1099ints[0], { box2: 0 });
  assert(
    run(f).diagnostics.some((d) =>
      String(d.message).includes("advanced child-tax family worksheet")
    ),
  );
});

Deno.test("2026 child AMT retains the ordinary exemption and subtracts actual Form 8615 regular tax", () => {
  // P.L.119-21 §70107 extends §55(d)(4)(A)(iii), which suspends §59(j).
  const plain = complete(childTaxFixture2026(0, 20000));
  assertEquals(plain.f1040.line16_income_tax, 2212);
  assertEquals(plain.f1040.line17_additional_taxes, 0);
  assertEquals(
    (plain.form6251.calculation_2026 as { lines: { line5: number } }).lines
      .line5,
    90100,
  );
  const f = childTaxFixture2026(0, 20000);
  Object.assign(f.investment_income.f1099ints[0], {
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  const p = complete(f);
  const amt = p.form6251.calculation_2026 as {
    lines: { line5: number; line7: number; line10: number; line11: number };
  };
  assertEquals(amt.lines.line5, 90100);
  assertEquals(amt.lines.line7, 7774);
  assertEquals(amt.lines.line10, 2212);
  assertEquals(amt.lines.line11, 5562);
  assertEquals(p.f1040.line17_additional_taxes, 5562);
  assertEquals(p.f1040.line18_total_tax_before_credits, 7774);
});

Deno.test("2026 surviving-parent remarriage uses a first-listed stepparent and reconciles life records", () => {
  const f = childTaxFixture2026();
  f.f8615.claim.parent_life_records[1].alive_on_2026_12_31 = false;
  const step = parentReturn2026("987654323");
  step.spouse = {
    tin: "987654321",
    name: "Surviving Parent",
    name_control: "PARE",
  };
  f.f8615.claim.family!.selection = {
    kind: "surviving_parent",
    record_reference: "death-and-marriage",
    parent_tin: "987654321",
    deceased_parent_tin: "987654322",
    remarriage: {
      record_reference: "new-marriage",
      spouse_tin: "987654323",
      shared_home_all_year: true,
    },
  };
  f.f8615.claim.family!.parent_returns = [step];
  assertEquals(complete(f).form8615.parent_ssn, "987654323");
  f.f8615.claim.parent_life_records[1].alive_on_2026_12_31 = true;
  assert(
    run(f).diagnostics.some((d) => String(d.message).includes("life records")),
  );
});

Deno.test("2026 child eligibility keeps the $2,700 boundary and does not depend on being claimed", () => {
  assertEquals(complete(childTaxFixture2026(0, 2700)).form8615, undefined);
  assertEquals(
    complete(childTaxFixture2026(0, 2701)).form8615
      .line5_child_net_unearned_income,
    1,
  );
  const f = childTaxFixture2026(20000);
  f.general.taxpayer_can_be_claimed_as_dependent = false;
  assert(complete(f).form8615);
  const voluntary = childTaxFixture2026();
  voluntary.general.taxpayer_can_be_claimed_as_dependent = false;
  assert(
    run(voluntary).diagnostics.some((d) =>
      String(d.message).includes("Child filing requirement")
    ),
  );
});

Deno.test("2026 child line 1 uses the connected capital loss after netting and the annual loss limit", () => {
  const f = childTaxFixture2026(0, 8000), capital = capitalFixture2026(0);
  const sale = capital.capital_gains.claim.sales[0];
  sale.tax_basis = 10000;
  assert(sale.reporting.kind === "1099-B");
  sale.reporting.box1e_basis = 10000;
  const claim = {
    ...f.investment_income,
    capital_gain_inventory_review: {
      record_reference: "joined-capital-inventory",
      capital_transaction_inventory_reference:
        capital.capital_gains.claim.record_reference,
    },
  };
  const p = complete({
    ...f,
    investment_income: claim,
    capital_gains: capital.capital_gains,
  });
  assertEquals(p.f1040.line7a_capital_gain, -3000);
  assertEquals(p.form8615.line1_child_unearned_income, 5000);
  assertEquals(p.f1040.line16_income_tax, 412);
});

Deno.test("2026 child family rejects duplicate owners, missing candidates, ambiguous residence and wrong sibling links", () => {
  const family = childTaxFixture2026().f8615.claim.family!;
  for (
    const change of [
      (r: typeof family) => {
        r.parent_returns.push(r.parent_returns[0]);
      },
      (r: typeof family) => {
        r.parent_returns[0].primary.tin = "123456789";
      },
      (r: typeof family) => {
        r.selection = {
          kind: "parents_married",
          shared_home_all_year: true,
          record_reference: "marriage",
          parent_tins: ["987654321", "111223333"],
        };
      },
      (r: typeof family) => {
        r.selection = {
          kind: "parents_married",
          shared_home_all_year: false,
          record_reference: "marriage",
          parent_tins: ["987654321", "987654322"],
        };
      },
      (r: typeof family) => {
        r.parent_returns[0].schedule_d_tax_worksheet_used = true;
      },
    ]
  ) {
    const r = structuredClone(family);
    change(r);
    assertThrows(() => resolveChildTaxFamily2026(r, "123456789"));
  }
  const joined = resolveChildTaxFamily2026(family, "123456789");
  const sibling = {
    document_reference: "sibling",
    child_tin: "111223333",
    selected_parent_return_reference: "wrong-parent",
    tax_year: 2026 as const,
    line1_unearned_income: 5000,
    line4_taxable_income: 3650,
    line5_net_unearned_income: 2300,
    qualified_dividends: 0,
    net_capital_gain: 0,
    adjusted_gross_income: 5000,
    deduction: 1350,
    additional_deductions: 0,
    taking_standard_deduction: true,
    directly_connected_itemized_deductions: 0,
    directly_connected_preferential_deductions: 0,
    schedule_d_tax_worksheet_used: false,
    schedule_j_used: false,
    form2555_used: false,
  };
  family.other_children = [sibling];
  assertThrows(
    () => resolveChildTaxFamily2026(family, "123456789"),
    Error,
    "same selected parent",
  );
  sibling.selected_parent_return_reference =
    joined.selected_parent.return_reference;
  sibling.line4_taxable_income = 3651;
  assertThrows(
    () => resolveChildTaxFamily2026(family, "123456789"),
    Error,
    "reconcile its AGI",
  );
});
