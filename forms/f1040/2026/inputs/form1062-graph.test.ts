import { assert, assertEquals, assertRejects } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { form1062_2026 } from "../nodes/form1062.ts";
import { executeDraftSources2026 } from "../execute.ts";
import {
  form1062CreditsGraph2026,
  form1062ExtensionReceipt2026,
  form1062GraphFixture2026,
} from "./form1062-graph.fixture.ts";
import { landGraphFixture2026 } from "./land-graph.fixture.ts";
import { syntheticIso2026 } from "./iso.fixture.ts";

Deno.test("2026 Form 1062 graph orders source replay before settlement without changing actual taxes or carryforwards", async () => {
  const f = await form1062GraphFixture2026(), before = structuredClone(f.graph);
  const r = await executeDraftSources2026(f.graph, f.documents);
  assertEquals(r.diagnostics, []);
  const actual = r.pending.f1040, baseline = f.baseline.pending.f1040;
  for (
    const key of [
      "line7a_capital_gain",
      "line11b_agi",
      "line14_total_deductions",
      "line15_taxable_income",
      "line16_income_tax",
      "line17_additional_taxes",
      "line19_child_tax_credit",
      "line20_nonrefundable_credits",
      "line23_other_taxes",
      "line28_actc",
      "line29_refundable_aotc",
    ]
  ) assertEquals(actual[key], baseline[key], key);
  assertEquals(r.carryforwards, f.baseline.carryforwards);
  assertEquals([
    actual.line24a_total_tax,
    actual.line24b_form1062,
    actual.line24c_total_tax,
    actual.line31_other_payments,
  ], [5871, 842, 6713, 3368]);
  assertEquals(
    Number(actual.line33_total_payments) -
      Number(baseline.line33_total_payments),
    3368,
  );
  assertEquals(f.graph, before);
  const order = buildExecutionPlan(sourceRegistry2026).map((s) => s.nodeType);
  for (
    const node of [
      "income_tax_calculation",
      "form6251",
      "schedule2",
      "f2441",
      "f8863",
      "f8812",
    ]
  ) assert(order.indexOf(node) < order.indexOf("form1062"));
  assert(order.indexOf("form1062") < order.indexOf("schedule3_final"));
  assert(order.indexOf("schedule3_final") < order.indexOf("f1040"));
  assertEquals(
    r.verifiedSourceDocuments!.getBytes(f.documents[0].reference),
    f.documents[0].bytes,
  );
  const copy = r.verifiedSourceDocuments!.getBytes(f.documents[0].reference)!;
  copy.fill(0);
  assertEquals(
    r.verifiedSourceDocuments!.getBytes(f.documents[0].reference),
    f.documents[0].bytes,
  );
});

Deno.test("2026 Form 1062 ordered-credit graph preserves real credits and refundable amounts", async () => {
  const f = await form1062GraphFixture2026(form1062CreditsGraph2026());
  const r = await executeDraftSources2026(f.graph, f.documents);
  assertEquals(r.diagnostics, []);
  const actual = r.pending.f1040, baseline = f.baseline.pending.f1040;
  assertEquals([actual.line24b_form1062, actual.line31_other_payments], [
    256,
    1024,
  ]);
  for (
    const key of [
      "line19_child_tax_credit",
      "line20_nonrefundable_credits",
      "line28_actc",
      "line29_refundable_aotc",
    ]
  ) assertEquals(actual[key], baseline[key], key);
  assertEquals(actual.line28_actc, 0);
  assertEquals(actual.line29_refundable_aotc, 500);
  assertEquals(r.carryforwards, f.baseline.carryforwards);
});

Deno.test("2026 Form 1062 graph does not defer AMT", async () => {
  const iso = syntheticIso2026();
  iso.f3921s[0].employee_tin = "123456789";
  const f = await form1062GraphFixture2026({
    ...landGraphFixture2026(45000, [], 40000),
    f3921: iso,
  });
  const r = await executeDraftSources2026(f.graph, f.documents);
  assertEquals(r.diagnostics, []);
  assertEquals(
    r.pending.f1040.line17_additional_taxes,
    f.baseline.pending.f1040.line17_additional_taxes,
  );
  assertEquals(r.pending.f1040.line31_other_payments, 3368);
  assertEquals(r.carryforwards, f.baseline.carryforwards);
});

Deno.test("2026 Form 1062 cannot post through an unbound graph or mismatched covenant documents", async () => {
  const f = await form1062GraphFixture2026();
  const unbound = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    f.graph,
    { taxYear: 2026, formType: "f1040" },
  );
  assert(
    unbound.diagnostics.some((d) =>
      d.nodeType === "form1062" && d.message.includes("execution-bound")
    ),
  );
  assertEquals(unbound.pending.f1040.line24b_form1062, 0);
  await assertRejects(
    () => executeDraftSources2026(f.graph),
    Error,
    "exact claimed",
  );
  await assertRejects(
    () => executeDraftSources2026(f.graph, [...f.documents, ...f.documents]),
    Error,
    "exact claimed",
  );
  await assertRejects(
    () =>
      executeDraftSources2026(f.graph, [{
        ...f.documents[0],
        bytes: new Uint8Array([1, 2, 3]),
      }]),
    Error,
    "SHA-256",
  );
  const invalid = new TextEncoder().encode("hash-matched but not a PDF");
  f.graph.form1062.claim.election.sales[0].covenant.sha256 = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", invalid)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  await assertRejects(
    () =>
      executeDraftSources2026(f.graph, [{ ...f.documents[0], bytes: invalid }]),
    Error,
    "readable, unencrypted PDF",
  );
});

Deno.test("2026 Form 1062 graph rejects computed public overrides and missing land", async () => {
  const f = await form1062GraphFixture2026();
  await assertRejects(() =>
    executeDraftSources2026({
      ...f.graph,
      form1062: { ...f.graph.form1062, form1062_line15: 1 },
    }, f.documents)
  );
  await assertRejects(() =>
    executeDraftSources2026({
      ...f.graph,
      form1062: { claim: { ...f.graph.form1062.claim, income_tax: {} } },
    }, f.documents)
  );
  const noLand = { ...f.graph } as Record<string, unknown>;
  delete noLand.land_dispositions;
  const r = await executeDraftSources2026(noLand, f.documents);
  assert(r.diagnostics.length > 0);
  assertEquals(r.pending.form1062.file_form1062, undefined);
});

Deno.test("2026 Form 1062 graph holds late election, unpaid extended filing and fractional installment rounding", async () => {
  const f = await form1062GraphFixture2026(),
    records = f.graph.form1062.claim.installment_records;
  records.as_of = records.filing.on = "2027-10-15";
  let r = await executeDraftSources2026(f.graph, f.documents);
  assert(r.diagnostics.some((d) => d.message.includes("late election")));
  records.extension = {
    record_reference: "extension",
    requested_on: "2027-04-15",
    valid_six_month_filing_extension: true,
  };
  r = await executeDraftSources2026(f.graph, f.documents);
  assert(
    r.diagnostics.some((d) => d.message.includes("payment or acceleration")),
  );
  records.payments = [{
    record_reference: "first-payment",
    account_record_reference: "tax-account",
    effective_on: "2027-04-15",
    amount_cents: 84200,
    allocations: [{ installment: 1, amount_cents: 84200 }],
  }];
  r = await executeDraftSources2026(f.graph, f.documents);
  assert(
    r.diagnostics.some((d) =>
      d.message.includes("reconciled current-return payment sources")
    ),
  );
  const receipt = form1062ExtensionReceipt2026();
  r = await executeDraftSources2026(
    { ...f.graph, extension_payments: receipt },
    f.documents,
  );
  assertEquals(r.diagnostics, []);
  assertEquals(r.pending.f1040.line31_other_payments, 4368);
  assertEquals(r.pending.f1040.line37_amount_owed, 2245);
  receipt.claim.payments[0].account_record_reference = "wrong-account-record";
  r = await executeDraftSources2026(
    { ...f.graph, extension_payments: receipt },
    f.documents,
  );
  assert(
    r.diagnostics.some((d) =>
      d.message.includes("reconciled current-return payment sources")
    ),
  );
  const fractional = await form1062GraphFixture2026(
    landGraphFixture2026(45010, [], 40000),
  );
  r = await executeDraftSources2026(fractional.graph, fractional.documents);
  assert(
    r.diagnostics.some((d) =>
      d.message.includes("rounding needs reconciliation")
    ),
  );
});

Deno.test("2026 covenant binding stays local to each execution", async () => {
  const f = await form1062GraphFixture2026();
  const [bound, ordinary] = await Promise.all([
    executeDraftSources2026(f.graph, f.documents),
    executeDraftSources2026(landGraphFixture2026(45000, [], 40000)),
  ]);
  assertEquals(bound.diagnostics, []);
  assertEquals(ordinary.diagnostics, []);
  assertEquals(ordinary.pending.f1040.line24b_form1062, 0);
  assertEquals(ordinary.verifiedSourceDocuments, undefined);
  await assertRejects(
    () => executeDraftSources2026(f.graph),
    Error,
    "exact claimed",
  );
  await assertRejects(
    () => executeDraftSources2026(landGraphFixture2026(), f.documents),
    Error,
    "corresponding election",
  );
});

Deno.test("2026 absent election does not impose Form 1062 tax scope on ordinary returns", () => {
  assertEquals(
    form1062_2026.compute({ taxYear: 2026, formType: "f1040" }, {
      schedule2: { future_regular_tax_source: 100 },
    }).outputs,
    [],
  );
});
