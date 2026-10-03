import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { registry } from "./registry.ts";
import { assertScheduleBInterestJoin } from "./schedule-b-interest-reconciliation.ts";

function preparedFixture(id: string) {
  const fixture = pdfReviewFixtures.find((row) => row.id === id)!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  return { fixture, pending: buildPending(result.pending) };
}

Deno.test("Schedule B interest joins Form 1040 and AGI in both exporters", async () => {
  const { fixture, pending } = preparedFixture(
    "single-form4952-interest-and-dividends",
  );
  assertEquals(
    (pending.schedule_b?.interest_detail as { net: number })?.net,
    500,
  );
  assertScheduleBInterestJoin(pending);
  const forged = {
    ...pending,
    f1040: { ...pending.f1040, line2b_taxable_interest: 499 },
  };
  assertThrows(
    () => buildMefXml(forged, fixture.filer),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  await assertRejects(
    () => buildPdfBytes(forged, fixture.filer),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  const changedSource = {
    ...pending,
    f1099int: {
      ...pending.f1099int,
      f1099ints: [{
        ...pending.f1099int!.f1099ints[0],
        box1: 501,
      }],
    },
  };
  assertThrows(
    () => buildMefXml(changedSource, fixture.filer),
    Error,
    "Schedule B interest payer detail differs from issued Forms",
  );
  await assertRejects(
    () => buildPdfBytes(changedSource, fixture.filer),
    Error,
    "Schedule B interest payer detail differs from issued Forms",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        agi_aggregator: {
          ...pending.agi_aggregator,
          line2b_taxable_interest: 499,
        },
      }),
    Error,
    "Retained AGI taxable interest",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        agi_aggregator: {},
      }),
    Error,
    "Retained AGI taxable interest",
  );
});

Deno.test("issued 1099-INT and 1099-OID adjustments match separate Schedule B payer rows", () => {
  const rowInt = {
    payer_name: "Bond Bank",
    gross: 120,
    net: 105,
    nominee: 5,
    accrued: 0,
    oid_adjustment: 0,
    bond_premium: 10,
  };
  const rowOid = {
    payer_name: "OID Broker",
    gross: 60,
    net: 51,
    nominee: 3,
    accrued: 0,
    oid_adjustment: 4,
    bond_premium: 2,
  };
  const pending = {
    f1099int: {
      f1099ints: [{
        payer_name: "Bond Bank",
        box1: 100,
        box3: 20,
        box11: 10,
        elect_bond_premium_amortization: true,
        nominee_interest: 5,
      }],
    },
    f1099oid: {
      f1099oids: [{
        payer_name: "OID Broker",
        box1_oid: 50,
        box2_other_interest: 10,
        box6_acquisition_premium: 4,
        box6_applies_to: "taxable_oid",
        box10_bond_premium: 2,
        box10_applies_to: "taxable_stated_interest",
        nominee_oid: 3,
      }],
    },
    schedule_b: { interest_detail: [rowOid, rowInt] },
    f1040: { line2b_taxable_interest: 156 },
    agi_aggregator: { line2b_taxable_interest: 156 },
  };
  assertScheduleBInterestJoin(pending);
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        schedule_b: {
          interest_detail: [rowOid, { ...rowInt, bond_premium: 9 }],
        },
      }),
    Error,
    "Schedule B interest payer detail differs from issued Forms",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        schedule_b: {
          interest_detail: [rowOid, rowInt, { ...rowInt, payer_name: "Extra" }],
        },
      }),
    Error,
    "Schedule B interest payer detail lacks an issued Form",
  );
});

Deno.test("broker market discount reaches Schedule B before native and PDF export", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-direct-broker-basis-sales"
  )!;
  const sales = fixture.inputs.f8949 as Record<string, unknown>[];
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...fixture.inputs,
      f8949: [{
        ...sales[0],
        accrued_market_discount: 200,
        market_discount_payer_name: "Bond Broker",
      }, sales[1]],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertScheduleBInterestJoin(pending);
  const omitted = {
    ...pending,
    schedule_b: { ...pending.schedule_b, taxable_interest_net: 199 },
  };
  assertThrows(
    () => buildMefXml(omitted, fixture.filer),
    Error,
    "Schedule B market discount differs from retained broker",
  );
  await assertRejects(
    () => buildPdfBytes(omitted, fixture.filer),
    Error,
    "Schedule B market discount differs from retained broker",
  );
});

Deno.test("issued 1099-B market discount uses the lesser of gain and box 1f", () => {
  const pending = {
    f1099b: {
      f1099bs: [{
        part: "A",
        description: "Market discount bond",
        date_acquired: "2025-01-01",
        date_sold: "2025-07-01",
        proceeds: 1_000,
        cost_basis: 800,
        box1f_accrued_market_discount: 300,
        market_discount_payer_name: "Bond Broker",
      }],
    },
    schedule_b: { taxable_interest_net: 200, payer_name: "Bond Broker" },
    f1040: { line2b_taxable_interest: 200 },
    agi_aggregator: { line2b_taxable_interest: 200 },
  };
  assertScheduleBInterestJoin(pending);
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        ...pending,
        schedule_b: { taxable_interest_net: 300, payer_name: "Bond Broker" },
        f1040: { line2b_taxable_interest: 300 },
        agi_aggregator: { line2b_taxable_interest: 300 },
      }),
    Error,
    "Schedule B market discount differs from retained broker",
  );
});

Deno.test("excluded savings-bond interest remains zero on Form 1040", () => {
  assertScheduleBInterestJoin({
    schedule_b: { taxable_interest_net: 800, ee_bond_exclusion: 800 },
    f1040: {},
  });
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        schedule_b: { taxable_interest_net: 800, ee_bond_exclusion: 800 },
        f1040: { line2b_taxable_interest: 800 },
      }),
    Error,
    "line 2b must equal Schedule B line 4",
  );
  assertThrows(
    () =>
      assertScheduleBInterestJoin({
        f1040: { line2b_taxable_interest: 100 },
      }),
    Error,
    "line 2b must equal Schedule B line 4",
  );
});
