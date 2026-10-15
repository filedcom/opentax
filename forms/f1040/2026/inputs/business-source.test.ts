import {
  business,
  fixture,
  payment,
  vehicle,
  wage,
} from "./business.fixture.ts";
import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { calculateBusinessSources2026 } from "./business-source.ts";

Deno.test("Business source reuses Schedule C/SE arithmetic and leaves QBI explicitly unresolved", () => {
  const f = fixture();
  f.businesses[0].receipts.push({
    ...payment("refund", 500),
    kind: "return_allowance",
  }, { ...payment("other-income", 100), kind: "other_ordinary_income" });
  f.businesses[0].expenses = [{
    ...payment("advert", 100),
    category: "advertising",
  }];
  const r = calculateBusinessSources2026(f);
  assertEquals(r.businesses[0].lines.line7, 9600);
  assertEquals(r.businesses[0].lines.line28, 100);
  assertEquals(r.schedule1_line3, 9500);
  // 9,500 * 92.35% = 8,773.25; SS 1,088 + Medicare 254.
  assertEquals(r.schedule2_line4, 1342);
  assertEquals(r.schedule1_line15, 671);
  assertEquals(r.owners[0].schedule_se?.line6, 8773);
  assertEquals(r.qbi_status, "requires_joint_deduction_resolution");
  assertEquals(r.filing_ready, false);
});

Deno.test("Statutory example routes linked W-2 once and excludes its net from SE", () => {
  const f = fixture(), b = f.businesses[0];
  b.kind = "statutory_employee";
  b.receipts = [];
  b.vehicle = vehicle();
  b.expenses = [
    { ...payment("advert", 865), category: "advertising" },
    { ...payment("pension", 560), category: "employee_pension" },
    { ...payment("supplies", 600), category: "supplies" },
    { ...payment("tax", 60), category: "taxes_licenses" },
  ];
  f.w2s = [{
    ...wage("123456789", 29623),
    box13_statutory_employee: true,
    schedule_c_business_reference: "consulting",
  }];
  const r = calculateBusinessSources2026(f);
  assertEquals(r.businesses[0].lines.line1, 29623);
  assertEquals(r.businesses[0].lines.line9, 470);
  assertEquals(r.businesses[0].lines.line28, 2555);
  assertEquals(r.schedule1_line3, 27068);
  assertEquals(r.owners[0].statutory_net_profit, 27068);
  assertEquals(r.owners[0].w2_ss_wages_and_tips, 29623);
  assertEquals(r.owners[0].schedule_se, undefined);
  assertEquals(r.schedule2_line4, 0);
  assertEquals(r.schedule1_line15, 0);
  // This synthetic linkage illustrates the ATS amounts, not evidence that the
  // ATS beverage-employer W-2 belongs to the packet's landscaping activity.
});

Deno.test("Mileage uses June 30/July 1 rates and keeps 2026 interest line 16b separate", () => {
  const f = fixture(), v = vehicle();
  v.odometer_end += 1000;
  v.trips.push({
    record_reference: "after",
    date: "2026-07-01",
    purpose: "business",
    description: "Client visit",
    miles: 1000,
  });
  v.business_parking_and_tolls = [payment("parking", 10.20)];
  v.interest = {
    loan_reference: "loan",
    lender_name: "Lender",
    borrower_tin: "123456789",
    payments: [payment("interest", 1750.80)],
    loan_used_only_to_buy_this_vehicle: true,
    interest_not_claimed_elsewhere: true,
  };
  f.businesses[0].vehicle = v;
  const r = calculateBusinessSources2026(f), b = r.businesses[0];
  assertEquals(b.lines.line9, 1240); // 469.80 + 760 + 10.20
  assertEquals(b.lines.line16b, 165); // 1,750.80 * 1,648 / 17,508
  assertEquals(b.lines.line16c, 0);
  assertEquals(b.lines.line28, 1405);
  assertEquals(b.vehicle?.line44a_business_miles, 1648);
  assertEquals(b.vehicle?.line44b_commuting_miles, 710);
  assertEquals(b.vehicle?.line44c_other_miles, 15150);
  assertAlmostEquals(b.vehicle!.business_interest_before_rounding, 164.8);
  assertEquals(b.vehicle?.personal_interest_before_rounding, 1586);
});

Deno.test("Expense cents aggregate before rounding; meal limits apply before line rounding; Part V enters once", () => {
  const f = fixture();
  f.businesses[0].expenses = [
    { ...payment("ad1", .25), category: "advertising" },
    { ...payment("ad2", .25), category: "advertising" },
    { ...payment("meal1", 10.49), category: "meals" },
    { ...payment("meal2", 10.49), category: "meals" },
    { ...payment("other1", 25.25), category: "other" },
    { ...payment("other2", 25.25), category: "other" },
  ];
  const b = calculateBusinessSources2026(f).businesses[0];
  assertEquals(b.lines.line8, 1);
  assertEquals(b.lines.line24b, 10); // 20.98 * 50% = 10.49, not 21 * 50%
  assertEquals(b.lines.line27b, 51);
  assertEquals(b.lines.line48, 51);
  assertEquals(b.lines.line28, 62);
  assertEquals(b.lines.line31, 9938);
});

Deno.test("Business losses net only within an owner; spouses get independent SS limits", () => {
  const f = fixture();
  f.filing_status = FilingStatus.MFJ;
  f.spouse_tin = "987654321";
  const loss = business("loss"), spouse = business("spouse", f.spouse_tin);
  loss.receipts = [];
  loss.expenses = [{ ...payment("loss-cost", 5000), category: "advertising" }];
  spouse.receipts[0].amount = 20000;
  f.businesses.push(loss, spouse);
  f.w2s = [wage("123456789", 184500), wage("987654321", 10000)];
  const r = calculateBusinessSources2026(f);
  assertEquals(r.schedule1_line3, 25000);
  assertEquals(r.owners.map((o) => o.net_profit_subject_to_se), [5000, 20000]);
  assertEquals(r.owners.map((o) => o.schedule_se?.line10), [0, 2290]);
  assertEquals(r.owners.map((o) => o.schedule_se?.line11), [134, 536]);
  assertEquals(r.schedule2_line4, 2960);
  assertEquals(r.schedule1_line15, 1480);
});

Deno.test("Statutory wages reduce the same owner's regular business SS wage base", () => {
  const f = fixture(), stat = business("statutory");
  stat.kind = "statutory_employee";
  stat.receipts = [];
  f.businesses.push(stat);
  f.w2s = [{
    ...wage("123456789", 184000),
    box13_statutory_employee: true,
    schedule_c_business_reference: "statutory",
  }];
  const r = calculateBusinessSources2026(f);
  assertEquals(r.owners[0].net_profit_subject_to_se, 10000);
  assertEquals(r.owners[0].schedule_se?.line9, 500);
  assertEquals(r.owners[0].schedule_se?.line10, 62);
  assertEquals(r.owners[0].schedule_se?.line11, 268);
  assertEquals(r.schedule1_line3, 194000);
});

Deno.test("Below-threshold regular income and net losses retain no regular SE liability", () => {
  const f = fixture();
  f.businesses[0].receipts[0].amount = 400;
  assertEquals(calculateBusinessSources2026(f).schedule2_line4, 0);
  f.businesses[0].receipts[0].amount = 433;
  assertEquals(calculateBusinessSources2026(f).schedule2_line4, 62);
  f.businesses[0].receipts[0].amount = 434;
  assertEquals(calculateBusinessSources2026(f).schedule2_line4, 62);
  f.businesses[0].expenses = [{
    ...payment("cost", 1000),
    category: "advertising",
  }];
  assertEquals(calculateBusinessSources2026(f).schedule1_line3, -566);
  assertEquals(calculateBusinessSources2026(f).schedule2_line4, 0);
});

Deno.test("Reject unmatched/wrong-owner statutory W-2s, unlinked statutory activities and double receipts", () => {
  const f = fixture();
  f.w2s = [{
    ...wage(),
    box13_statutory_employee: true,
    schedule_c_business_reference: "missing",
  }];
  assertThrows(() => calculateBusinessSources2026(f), Error, "Statutory W-2");
  f.w2s[0].schedule_c_business_reference = "consulting";
  f.businesses[0].kind = "statutory_employee";
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "separate ordinary",
  );
  f.businesses[0].receipts = [];
  f.filing_status = FilingStatus.MFJ;
  f.spouse_tin = "987654321";
  f.w2s[0].employee_ssn = f.spouse_tin;
  assertThrows(() => calculateBusinessSources2026(f), Error, "Statutory W-2");
  f.w2s = [];
  assertThrows(() => calculateBusinessSources2026(f), Error, "linked W-2s");
});

Deno.test("Reject reused business, transaction, vehicle, W-2 and employer sources", () => {
  const f = fixture();
  f.businesses.push(structuredClone(f.businesses[0]));
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "Duplicate business",
  );
  f.businesses[1] = business("second");
  f.businesses[1].receipts[0].record_reference =
    f.businesses[0].receipts[0].record_reference;
  assertThrows(() => calculateBusinessSources2026(f), Error, "Duplicate cash");
  f.businesses[1] = business("second");
  for (const b of f.businesses) b.vehicle = vehicle();
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "Duplicate vehicle",
  );
  f.businesses.splice(1);
  f.w2s = [wage(), wage()];
  assertThrows(() => calculateBusinessSources2026(f), Error, "Duplicate W-2");
  f.w2s[1].source_document_reference = "replacement";
  assertThrows(() => calculateBusinessSources2026(f), Error, "employer/owner");
});

Deno.test("Vehicle source rejects missing mileage, wrong borrower, reused expenses and first-year assets", () => {
  const f = fixture();
  f.businesses[0].vehicle = vehicle();
  f.businesses[0].vehicle.odometer_end++;
  assertThrows(() => calculateBusinessSources2026(f), Error, "odometers");
  f.businesses[0].vehicle = vehicle();
  f.businesses[0].vehicle.interest = {
    loan_reference: "loan",
    lender_name: "Lender",
    borrower_tin: "987654321",
    payments: [payment("interest", 100)],
    loan_used_only_to_buy_this_vehicle: true,
    interest_not_claimed_elsewhere: true,
  };
  assertThrows(() => calculateBusinessSources2026(f), Error, "borrower");
  f.businesses[0].vehicle = vehicle();
  f.businesses[0].vehicle.business_parking_and_tolls = [
    payment("consulting-receipts", 10),
  ];
  assertThrows(() => calculateBusinessSources2026(f), Error, "Duplicate cash");
  f.businesses[0].vehicle = { ...vehicle(), in_service_date: "2026-01-01" };
  assertThrows(() => calculateBusinessSources2026(f));
});

Deno.test("Source scope rejects raw line totals, missing wage bases and unsupported fact reviews", () => {
  const f = fixture();
  assertThrows(() =>
    calculateBusinessSources2026({ ...f, schedule1_line3: 0 })
  );
  assertThrows(() => calculateBusinessSources2026({ ...f, tax_year: 2025 }));
  assertThrows(() =>
    calculateBusinessSources2026({
      ...f,
      businesses: [{ ...f.businesses[0], line_1_gross_receipts: 1 }],
    })
  );
  assertThrows(() =>
    calculateBusinessSources2026({
      ...f,
      review: { ...f.review, optional_se_methods_not_elected: false },
    })
  );
  f.w2s = [wage()];
  delete f.w2s[0].box3_ss_wages;
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "actual W-2 box 3",
  );
  f.w2s[0].box3_ss_wages = 0;
  assert(calculateBusinessSources2026(f).owners[0].schedule_se);
  f.w2s[0].box8_allocated_tips = 100;
  assertThrows(() => calculateBusinessSources2026(f), Error, "allocated tips");
});

Deno.test("Vehicle interest rounds exact fractional allocations and cannot hide reused VINs", () => {
  const f = fixture(), v = vehicle();
  v.odometer_start = 0;
  v.odometer_end = 20;
  v.trips = [
    { ...v.trips[0], miles: 1 },
    { ...v.trips[2], miles: 19 },
  ];
  v.interest = {
    loan_reference: "loan",
    lender_name: "Lender",
    borrower_tin: "123456789",
    payments: [payment("interest", 3290)],
    loan_used_only_to_buy_this_vehicle: true,
    interest_not_claimed_elsewhere: true,
  };
  f.businesses[0].vehicle = v;
  assertEquals(
    calculateBusinessSources2026(f).businesses[0].lines.line16b,
    165,
  );
  f.businesses.push(business("other"));
  f.businesses[1].vehicle = {
    ...vehicle(),
    vehicle_reference: "another-alias",
  };
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "Duplicate vehicle VIN",
  );
});

Deno.test("Business validation rejects outside owners, subcent cash and unsafe wage totals", () => {
  const f = fixture();
  f.businesses[0].owner_tin = "987654321";
  assertThrows(() => calculateBusinessSources2026(f), Error, "not a filer");
  f.businesses[0].owner_tin = f.taxpayer_tin;
  f.businesses[0].receipts[0].amount = 100.001;
  assertThrows(() => calculateBusinessSources2026(f));
  f.businesses[0].receipts[0].amount = 10000;
  f.filing_status = FilingStatus.MFJ;
  assertThrows(() => calculateBusinessSources2026(f), Error, "actual owners");
  f.filing_status = FilingStatus.Single;
  f.businesses[0].kind = "statutory_employee";
  f.businesses[0].receipts = [];
  f.w2s = [{
    ...wage(),
    box1_wages: 1e100,
    box13_statutory_employee: true,
    schedule_c_business_reference: "consulting",
  }];
  assertThrows(
    () => calculateBusinessSources2026(f),
    Error,
    "safe calculation range",
  );
});
