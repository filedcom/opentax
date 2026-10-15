import { assert, assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
import {
  providerCareFixture2026,
  providerOverflowFixture2026,
} from "./dependent-care-providers.fixture.ts";
import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import { priorCareFixture2026 } from "./dependent-care-prior.fixture.ts";
import {
  calculateForm2441Benefits,
  careProviderSchema,
} from "../../nodes/intermediate/forms/credits/individual/form2441/calculation.ts";
const run = (input: Record<string, unknown>) =>
  execute(buildExecutionPlan(sourceRegistry2026), sourceRegistry2026, input, {
    taxYear: 2026,
    formType: "f1040",
  });
function complete(input: Record<string, unknown>) {
  const r = run(input);
  assertEquals(r.diagnostics, []);
  return {
    pending: r.pending,
    care: r.pending.f2441.calculation_2026 as ReturnType<
      typeof calculateCareCredit2026
    >,
  };
}
Deno.test("Care special provider identities preserve calculated credit without invented TINs", () => {
  for (
    const [kind, label] of [
      ["tax_exempt", "Tax-Exempt"],
      ["foreign", "LAFCP"],
      ["incomplete", "See Attached Statement"],
    ] as const
  ) {
    const f = providerCareFixture2026(kind), { care } = complete(f);
    assertEquals(care.lines!.line11, 1050);
    assertEquals(care.benefit.providers![0].tin, label);
    assertThrows(() => careProviderSchema.parse(f.form2441.claim.providers[0]));
  }
});
Deno.test("Employer furnished care derives its employer from W-2 but never fabricates provider payments", () => {
  const { care, pending } = complete(
    providerCareFixture2026("employer_furnished"),
  );
  assertEquals(
    care.benefit.providers![0].name,
    providerCareFixture2026("employer_furnished").w2s[0].employer_name,
  );
  assertEquals(care.benefit.providers![0].amount_paid, 0);
  assertEquals(care.benefit.providers![0].tin, "");
  assertEquals(care.lines!.line16, 2000);
  assertEquals(care.lines!.line25, 2000);
  assertEquals(care.lines!.line26, 0);
  assertEquals(pending.f1040.line11b_agi, 50000);
});
Deno.test("No provider and no qualifying person produces taxable benefits rather than a fake provider", () => {
  const { care, pending } = complete(providerCareFixture2026("none"));
  assertEquals(care.benefit.providers, []);
  assertEquals(care.lines!.line16, 0);
  assertEquals(care.lines!.line25, 0);
  assertEquals(care.lines!.line26, 6000);
  assertEquals(care.lines!.line11, 0);
  assertEquals(pending.f1040.line1e_taxable_dep_care, 6000);
  assertEquals(pending.f1040.line11b_agi, 56000);
  const invalid = dependentCareFixture2026();
  invalid.form2441.claim.providers = [];
  assert(run(invalid).diagnostics.length > 0);
  // 2025 still validates its original provider requirement at the boundary.
  assertThrows(() =>
    calculateForm2441Benefits(
      { ...care.benefit.details!, care_providers: [] },
      6000,
    )
  );
});
Deno.test("Mixed provider expenses reconcile cash payments and employer furnished value separately", () => {
  const { care } = complete(providerOverflowFixture2026());
  assertEquals(
    care.benefit.providers!.reduce((n, p) => n + p.amount_paid, 0),
    6500,
  );
  assertEquals(care.lines!.line16, 8500);
  assertEquals(care.lines!.line25, 2000);
  assertEquals(care.lines!.line11, 350);
});
Deno.test("Employer source identity, furnished value and cash-payment contradictions are rejected", () => {
  for (
    const change of [
      "unknown",
      "excess_value",
      "excess_expense",
      "nonzero_payment",
      "duplicate",
    ] as const
  ) {
    const f = providerCareFixture2026("employer_furnished"),
      p = f.form2441.claim.providers[0];
    assert(p.kind === "employer_furnished");
    if (change === "unknown") p.source_document_reference = "unknown";
    if (change === "excess_value") p.care_value_in_w2_box10 = 2001;
    if (change === "excess_expense") {
      f.form2441.claim.expenses[0].qualified_amount_incurred_and_paid_in_2026 =
        2001;
    }
    if (change === "nonzero_payment") Object.assign(p, { amount_paid: 1 });
    if (change === "duplicate") {
      f.form2441.claim.providers.push({
        ...p,
        provider_reference: "second-copy",
      });
    }
    assert(run(f).diagnostics.length > 0, change);
  }
});
Deno.test("Incomplete and foreign providers need genuine missing-information or foreign-TIN evidence", () => {
  const f = providerCareFixture2026("incomplete"),
    p = f.form2441.claim.providers[0];
  assert(p.kind === "incomplete");
  p.due_diligence.requests = [];
  assert(run(f).diagnostics.length > 0);
  p.due_diligence.requests = [{
    date: "2026-11-01",
    method: "written",
    record_reference: "request",
  }];
  p.known_tin = { kind: "ein", value: "120000099" };
  assert(run(f).diagnostics.length > 0);
  const g = providerCareFixture2026("foreign"),
    q = g.form2441.claim.providers[0];
  assert(q.kind === "foreign");
  Object.assign(q.identification, {
    provider_not_required_to_have_us_tin: false,
  });
  assert(run(g).diagnostics.length > 0);
  q.identification = {
    kind: "us_tin",
    tin: { kind: "itin", value: "900001111" },
  };
  assertEquals(complete(g).care.benefit.providers![0].tin, "900001111");
  q.identification.tin.value = g.general.taxpayer_ssn;
  assert(run(g).diagnostics.length > 0);
});
Deno.test("Provider references and identities stay unique across special and ordinary records", () => {
  const f = providerCareFixture2026("tax_exempt"),
    p = f.form2441.claim.providers[0];
  assert(p.kind === "tax_exempt");
  f.form2441.claim.providers.push({
    ...p,
    provider_reference: "different-ref",
  });
  assert(run(f).diagnostics.length > 0);
  const g = providerCareFixture2026("incomplete"),
    q = g.form2441.claim.providers[0];
  assert(q.kind === "incomplete");
  q.known_tin = { kind: "ssn", value: g.general.dependents[0].ssn };
  delete q.known_us_address;
  assert(run(g).diagnostics.length > 0);
});
Deno.test("Special provider disclosures survive prior-year Worksheet A payments", () => {
  const f = priorCareFixture2026(true);
  const p = providerCareFixture2026("tax_exempt").form2441.claim.providers[0];
  p.amount_paid = 600;
  f.form2441.claim.providers = [p];
  const { care } = complete(f);
  assertEquals(care.lines!.line9b, 210);
  assertEquals(care.benefit.providers![0].tin, "Tax-Exempt");
  f.form2441.claim.providers =
    providerCareFixture2026("employer_furnished").form2441.claim.providers;
  assert(run(f).diagnostics.length > 0);
});
