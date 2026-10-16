import { assertEquals, assertThrows } from "@std/assert";
import {
  bindIraBasis2026,
  type IraBasisBinding2026,
} from "./ira-basis-binding.ts";
import { iraBasisBindingFixture2026 } from "./ira-basis-binding.fixture.ts";
import { businessQbiFixture2026 } from "./business-qbi.fixture.ts";
import { business, payment } from "./business.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { Box12Code } from "../../nodes/inputs/income/wages/w2/index.ts";

function withBusiness() {
  const f = iraBasisBindingFixture2026();
  const b = businessQbiFixture2026();
  b.taxpayer_tin = f.taxpayer_ssn;
  b.businesses[0].owner_tin = f.taxpayer_ssn;
  b.w2s = structuredClone(f.wage_sources!);
  f.business_sources_2026 = b;
  const e = f.claim.owners[0].nondeductible_election!;
  e.business_inventory_reference = b.record_reference;
  e.personal_service_business_references = [b.businesses[0].business_reference];
  return f;
}

Deno.test("2026 IRA compensation is derived from issued owner wages and retains workpaper provenance", () => {
  const r = bindIraBasis2026(iraBasisBindingFixture2026());
  assertEquals(r.compensation[0].own_eligible_compensation, 40000);
  assertEquals(r.compensation[0].wage_document_references, [
    "ira-compensation-w2",
  ]);
  assertEquals(r.calculation.forms[0].taxable_ira_income, 14800);
  assertEquals(r.calculation.forms[0].carryforward_2027?.amount, 2800);
});

Deno.test("2026 IRA compensation removes deferred compensation and adds actual combat pay", () => {
  const f = iraBasisBindingFixture2026(), w = f.wage_sources![0];
  w.box1_wages = 2200;
  w.box11_nonqual_plans = 500;
  w.box12_entries = [{ code: Box12Code.Q, amount: 300 }];
  assertEquals(
    bindIraBasis2026(f).compensation[0].own_eligible_compensation,
    2000,
  );
  w.box12_entries[0].amount = 299.99;
  assertThrows(() => bindIraBasis2026(f), Error, "compensation");
  w.box11_nonqual_plans = 2200.01;
  assertThrows(() => bindIraBasis2026(f), Error, "box 11");
});

Deno.test("2026 IRA compensation nets all owner businesses and deducts the owner's SE tax once", () => {
  const f = withBusiness();
  f.wage_sources![0].box1_wages = 0;
  f.business_sources_2026!.w2s = structuredClone(f.wage_sources!);
  const c = bindIraBasis2026(f).compensation[0];
  assertEquals(c.net_business_profit, 10000);
  assertEquals(c.deductible_se_tax, 707);
  assertEquals(c.own_eligible_compensation, 9293);
  const second = business("second", f.taxpayer_ssn);
  second.receipts[0].amount = 5000;
  second.expenses = [{
    ...payment("second-expense", 7000),
    category: "advertising",
  }];
  const b = f.business_sources_2026!;
  b.businesses.push(second);
  b.qbi_review.businesses.push({
    ...b.qbi_review.businesses[0],
    business_reference: "second",
  });
  f.claim.owners[0].nondeductible_election!.personal_service_business_references
    .push("second");
  const n = bindIraBasis2026(f).compensation[0];
  assertEquals(n.net_business_profit, 8000);
  assertEquals(n.deductible_se_tax, 565);
  assertEquals(n.own_eligible_compensation, 7435);
});

Deno.test("2026 IRA compensation floors business losses separately from wages", () => {
  const f = withBusiness();
  f.wage_sources![0].box1_wages = 2000;
  const b = f.business_sources_2026!;
  b.w2s = structuredClone(f.wage_sources!);
  b.businesses[0].expenses = [{
    ...payment("expense", 13000),
    category: "advertising",
  }];
  const c = bindIraBasis2026(f).compensation[0];
  assertEquals(c.net_business_profit, -3000);
  assertEquals(c.business_compensation, 0);
  assertEquals(c.own_eligible_compensation, 2000);
});

Deno.test("2026 IRA compensation never borrows a spouse's wages or business earnings", () => {
  const f = withBusiness();
  f.filing_status = FilingStatus.MFJ;
  f.spouse_ssn = "555667777";
  f.spouse_dob = "1966-01-01";
  f.wage_sources![0].box1_wages = 1999;
  f.wage_sources!.push({
    ...f.wage_sources![0],
    source_document_reference: "spouse-w2",
    employee_ssn: f.spouse_ssn,
    box1_wages: 80000,
  });
  const b = f.business_sources_2026!;
  b.filing_status = FilingStatus.MFJ;
  b.spouse_tin = f.spouse_ssn;
  b.businesses[0].owner_tin = f.spouse_ssn;
  b.w2s = structuredClone(f.wage_sources!);
  const e = f.claim.owners[0].nondeductible_election!;
  e.business_inventory_reference = undefined;
  e.personal_service_business_references = [];
  assertThrows(() => bindIraBasis2026(f), Error, "compensation");
  f.wage_sources![0].box1_wages = 2000;
  b.w2s = structuredClone(f.wage_sources!);
  assertEquals(
    bindIraBasis2026(f).compensation[0].own_eligible_compensation,
    2000,
  );
});

Deno.test("2026 IRA compensation rejects entered totals, wrong owners and incomplete source bindings", () => {
  const changes: ((f: IraBasisBinding2026) => void)[] = [
    (f) =>
      Object.assign(f.claim.owners[0].nondeductible_election!, {
        own_eligible_compensation: 99999,
      }),
    (f) =>
      f.claim.owners[0].nondeductible_election!.wage_document_references = [],
    (f) =>
      f.claim.owners[0].nondeductible_election!.wage_document_references.push(
        "ira-compensation-w2",
      ),
    (f) => f.wage_sources!.push(structuredClone(f.wage_sources![0])),
    (f) => f.wage_sources![0].employee_ssn = "999887777",
    (f) => f.wage_sources![0].box1_wages = 1999.99,
    (f) => f.wage_sources![0].box1_wages = 2000.001,
    (f) => f.wage_sources![0].box13_statutory_employee = true,
    (f) =>
      f.claim.owners[0].nondeductible_election!.business_inventory_reference =
        "invented",
  ];
  for (const change of changes) {
    const f = iraBasisBindingFixture2026();
    change(f);
    assertThrows(() => bindIraBasis2026(f));
  }
});

Deno.test("2026 IRA compensation rejects different business identities or wage inventories", () => {
  const changes: ((f: IraBasisBinding2026) => void)[] = [
    (f) => f.business_sources_2026!.taxpayer_tin = "999887777",
    (f) => f.business_sources_2026!.w2s = [],
    (f) => f.business_sources_2026!.w2s[0].box1_wages += 1,
    (f) =>
      f.claim.owners[0].nondeductible_election!
        .personal_service_business_references = [],
    (f) =>
      f.claim.owners[0].nondeductible_election!.business_inventory_reference =
        undefined,
    (f) =>
      f.claim.owners[0].nondeductible_election!
        .personal_service_business_references.push("consulting"),
  ];
  for (const change of changes) {
    const f = withBusiness();
    change(f);
    assertThrows(() => bindIraBasis2026(f));
  }
});

Deno.test("2026 IRA distribution basis needs no compensation election when no new contributions exist", () => {
  const f = iraBasisBindingFixture2026(), o = f.claim.owners[0];
  f.wage_sources = [];
  o.contributions = [];
  o.nondeductible_election = undefined;
  const r = bindIraBasis2026(f);
  assertEquals(r.compensation, []);
  assertEquals(r.calculation.forms[0].taxable_ira_income, 15200);
});
