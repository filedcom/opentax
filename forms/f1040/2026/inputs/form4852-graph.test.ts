import { assert, assertEquals, assertThrows } from "@std/assert";
import { form4852Graph2026 } from "./form4852-graph.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import {
  retirementCopy2026,
  retirementGraph2026,
  retirementSource2026,
} from "./retirement.fixture.ts";
import { calculateRetirementSources2026 } from "./retirement-source.ts";
import { calculateForm4852Bridge2026 } from "./form4852-bridge.ts";
import { reconcileForm4852ReturnSources2026 } from "./form4852-return.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { retirementCopy2026Schema } from "./retirement-statement.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { informationReturnTaxSource2026Schema } from "./itemized-expense-source.ts";
async function run(g: Record<string, unknown>) {
  const r = await executeDraftSources2026(g);
  assertEquals(r.diagnostics, []);
  return r.pending;
}
Deno.test("2026 Form 4852 wage source reaches AGI withholding and payroll owners once", async () => {
  const p = await run(form4852Graph2026());
  assertEquals(p.f1040.line1a_wages, 60000);
  assertEquals(p.f1040.line11b_agi, 60000);
  assertEquals(p.f1040.line25a_w2_withheld, 5001);
  assertEquals(p.schedule3.line11_excess_ss, 0);
  const w = p.w2.issued_w2_sources as { source_document_reference: string }[];
  assertEquals(w.map((x) => x.source_document_reference), ["substitute-2026"]);
  const bridge = p.f4852.calculation_2026 as ReturnType<
    typeof calculateForm4852Bridge2026
  >;
  reconcileForm4852ReturnSources2026(bridge.source_input, w);
  assertThrows(
    () => reconcileForm4852ReturnSources2026(bridge.source_input, []),
    Error,
    "executed wage inventory",
  );
});
Deno.test("2026 Form 4852 replaces incorrect original without a second wage or withholding deposit", async () => {
  const g = form4852Graph2026();
  const original = retirementGraph2026().w2s[0];
  original.employer_ein = "120000001";
  original.source_document_reference = "incorrect-w2";
  g.w2s = [original];
  g.f4852.claim.records[0].status = {
    kind: "incorrect",
    replaces_document_reference: "incorrect-w2",
  };
  const p = await run(g);
  assertEquals(p.f1040.line1a_wages, 60000);
  assertEquals(p.f1040.line25a_w2_withheld, 5001);
  const wrong = structuredClone(g);
  wrong.f4852.claim.records[0].status = { kind: "missing" };
  assert(
    (await executeDraftSources2026(wrong)).diagnostics.some((d) =>
      d.message.includes("actual original inventory")
    ),
  );
});
Deno.test("2026 mixed real and substitute employers share owner Social Security and Medicare calculations", async () => {
  const g = form4852Graph2026(), s = g.f4852.claim.records[0];
  if (s.kind !== "w2") throw Error();
  for (const a of [s.amounts, s.payroll_allocations[0]]) {
    a.wages = a.social_security_wages = a.medicare_wages = 120000;
    a.social_security_withheld = 7440;
    a.medicare_withheld = 1740;
  }
  const w = retirementGraph2026([], 120000).w2s[0];
  w.employer_ein = "120000002";
  g.w2s = [w];
  const p = await run(g);
  assertEquals(p.f1040.line1a_wages, 240000);
  assertEquals(p.schedule3.line11_excess_ss, 3441);
  assertEquals(p.schedule2.line17b_medicare_wage_tax, 360);
});
Deno.test("2026 Form 4852 pension keeps taxable income and state withholding from the substitute ledger", async () => {
  const p = await run(form4852Graph2026(true));
  assertEquals(p.f1040.line5a_pension_gross, 12000);
  assertEquals(p.f1040.line5b_pension_taxable, 10000);
  assertEquals(p.f1040.line25b_withheld_1099, 1000);
  assertEquals(p.f1040.line11b_agi, 10000);
  const retirement = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  assertEquals(retirement.rows[0].copy.box5_employee_contributions, 2000);
  assertEquals(retirement.rows[0].copy.state_information, []);
  const taxes = p.schedule_a.information_return_tax_sources as {
    document_type: string;
    state_withheld: number;
    payer_state_id?: string;
  }[];
  assertEquals(
    taxes.map((t) => [t.document_type, t.state_withheld, t.payer_state_id]),
    [["4852-1099-R", 400, undefined]],
  );
});
Deno.test("2026 Form 4852 unknown IRA taxable estimate is resolved by the existing no-basis owner", async () => {
  const p = await run(form4852Graph2026(true, true));
  assertEquals(p.f1040.line4a_ira_gross, undefined);
  assertEquals(p.f1040.line4b_ira_taxable, 12000);
  assertEquals(p.f1040.line25b_withheld_1099, 1000);
  const r = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  assertEquals(r.rows[0].copy.box2a_taxable_amount, undefined);
  assertEquals(r.rows[0].copy.box2b_taxable_amount_not_determined, true);
});
Deno.test("2026 Form 4852 retirement needs the annual treatment claim and rejects stale native copies or payer assertions", async () => {
  const g = form4852Graph2026(true),
    p = await run(g),
    r = p.f1099r.calculation_2026 as ReturnType<
      typeof calculateRetirementSources2026
    >;
  const missing = { ...g, f1099r: undefined };
  assert(
    (await executeDraftSources2026(missing)).diagnostics.some((d) =>
      d.message.includes("annual retirement treatment")
    ),
  );
  const stale = structuredClone(r.source_input);
  stale.claim.copies[0].box2a_taxable_amount = 9999;
  assertThrows(
    () => calculateRetirementSources2026(stale),
    Error,
    "actual owners, current copies",
  );
  const payer = structuredClone(r.source_input);
  payer.claim.reviews[0].payer_determined_pension_taxability_verified = true;
  assertThrows(
    () => calculateRetirementSources2026(payer),
    Error,
    "not a payer determination",
  );
  const detached = structuredClone(r.source_input);
  delete detached.form4852_sources_2026;
  assertThrows(
    () => calculateRetirementSources2026(detached),
    Error,
    "requires its actual Form 4852",
  );
});
Deno.test("2026 Form 4852 public intake accepts claims but refuses asserted owners or generated source facts", () => {
  const g = form4852Graph2026();
  for (const key of ["taxpayer_ssn", "issued_wages", "effective_wages"]) {
    assertThrows(() =>
      sourceRegistry2026.start.inputSchema.parse({
        ...g,
        f4852: { ...g.f4852, [key]: key === "taxpayer_ssn" ? "400001099" : [] },
      })
    );
  }
});
Deno.test("2026 Form 4852 early pension tax uses the same dated payments and preserves source exception ownership", async () => {
  const g = form4852Graph2026(true);
  g.general.taxpayer_dob = "1980-01-01";
  const s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.amounts.distribution_code = "1";
  s.distribution_sources[0].distribution_code = "1";
  g.f1099r!.claim.reviews[0].early_distribution = {
    record_reference: "early-review",
    complete_payment_inventory_verified: true,
    no_additional_tax_exception_applies_verified: true,
    payments: [{
      record_reference: "pension-payment",
      payment_date: "2026-12-15",
      gross: 12000.25,
      taxable: 10000.25,
    }],
  };
  const p = await run(g);
  assertEquals(p.schedule2.line5_form5329_early_tax, 1000);
  g.f1099r!.claim.reviews[0].early_distribution.payments[0].payment_date =
    "2026-12-16";
  assert(
    (await executeDraftSources2026(g)).diagnostics.some((d) =>
      d.message.includes("actual distribution ledger")
    ),
  );
});
Deno.test("2026 joint substitute retirement keeps the spouse as source owner", async () => {
  const g = form4852Graph2026(true);
  Object.assign(g.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",

    spouse_last_name: "Wheat",
    spouse_ssn: "400001045",
    spouse_dob: "1966-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  s.owner_tin = "400001045";
  s.distribution_sources[0].owner_ssn = s.owner_tin;
  const p = await run(g);
  const r = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  assertEquals(r.rows[0].owner_tin, s.owner_tin);
  assertEquals(r.rows[0].copy.recipient, "spouse");
  assertEquals(r.rows[0].copy.recipient_name, "Alex Wheat");
  assertEquals(p.f1040.line5b_pension_taxable, 10000);
});
Deno.test("2026 retirement substitute replaces its original alongside an unrelated issued statement", async () => {
  const g = form4852Graph2026(true), s = g.f4852.claim.records[0];
  if (s.kind !== "1099r") throw Error();
  const original = retirementCopy2026("incorrect-pension");
  original.payer_tin = s.payer_tin;
  original.account_number = s.account_number;
  original.box1_gross_distribution = original.box2a_taxable_amount = 99999;
  original.box4_federal_withheld = 9999;
  const other = retirementCopy2026("other-pension");
  g.f1099r!.claim.copies = [original, other];
  g.f1099r!.claim.reviews.push(retirementSource2026([other]).claim.reviews[0]);
  s.status = {
    kind: "incorrect",
    replaces_document_reference: original.source_document_reference,
  };
  const p = await run(g);
  assertEquals(p.f1040.line5a_pension_gross, 24001);
  assertEquals(p.f1040.line5b_pension_taxable, 22001);
  assertEquals(p.f1040.line25b_withheld_1099, 2001);
  const r = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  assertEquals(r.rows.map((x) => x.copy.source_document_reference), [
    "other-pension",
    "substitute-2026",
  ]);
  reconcileForm4852ReturnSources2026(
    r.form4852!.source_input,
    [],
    r.source_input,
  );
  const stale = structuredClone(r.source_input);
  stale.claim.copies.push(retirementCopy2026Schema.parse(original));
  assertThrows(
    () =>
      reconcileForm4852ReturnSources2026(r.form4852!.source_input, [], stale),
    Error,
    "executed retirement inventory",
  );
});
Deno.test("2026 substitute workpapers reject stale wage inventories and review dates", async () => {
  const g = form4852Graph2026(true), p = await run(g);
  const r = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  const wages = structuredClone(r.source_input);
  wages.wage_sources = w2Item2026Schema.array().parse(
    retirementGraph2026().w2s,
  );
  assertThrows(
    () => calculateRetirementSources2026(wages),
    Error,
    "actual owners, current copies",
  );
  for (const annual of [true, false]) {
    const stale = structuredClone(r.source_input);
    if (annual) stale.claim.reviewed_on = "2027-03-14";
    else stale.claim.reviews[0].reviewed_on = "2027-03-14";
    assertThrows(() => calculateRetirementSources2026(stale));
  }
});
Deno.test("2026 substitute advanced retirement treatment stays closed until its source bridge is reconciled", async () => {
  const p = await run(form4852Graph2026(true, true));
  const r = p.f1099r.calculation_2026 as ReturnType<
    typeof calculateRetirementSources2026
  >;
  const s = structuredClone(r.source_input);
  s.claim.reviews[0].ira_basis_owner_review_reference = "unbound-basis";
  assertThrows(() => calculateRetirementSources2026(s));
  const code = form4852Graph2026(true), source = code.f4852.claim.records[0];
  if (source.kind !== "1099r") throw Error();
  source.amounts.distribution_code =
    source.distribution_sources[0]
      .distribution_code =
      "2";
  code.f1099r!.claim.reviews[0].payer_code2_exception_verified = true;
  assert(
    (await executeDraftSources2026(code)).diagnostics.some((d) =>
      d.message.includes("reconciled substitute payment bridge")
    ),
  );
});
Deno.test("2026 only substitute state withholding may omit an issuer state ID", () => {
  const s = {
    document_type: "4852-1099-R",
    source_document_reference: "substitute",
    recipient_tin: "400001037",
    payer_tin: "120000001",
    account_number: "account",
    state: "MA",
    state_withheld: 400,
  };
  informationReturnTaxSource2026Schema.parse(s);
  for (
    const document_type of ["1099-INT", "1099-DIV", "1099-G", "W-2G", "1099-R"]
  ) {
    assertThrows(() =>
      informationReturnTaxSource2026Schema.parse({ ...s, document_type })
    );
    informationReturnTaxSource2026Schema.parse({
      ...s,
      document_type,
      payer_state_id: "issuer-state-id",
    });
  }
});
