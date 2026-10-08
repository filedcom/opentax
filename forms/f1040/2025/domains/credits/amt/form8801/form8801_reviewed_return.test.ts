import { assertEquals, assertRejects } from "@std/assert";
import { stageForm8801ReviewedReturnCalculation } from "./form8801_reviewed_return.ts";
import { fixture, packageFacts } from "./form8801_reviewed_return.fixture.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";
import { f8801 } from "../../../../../nodes/inputs/credits/amt/f8801/index.ts";

Deno.test("Form 8801 reviewed bytes join to computed public tax and zero-AMT line 9", async () => {
  const f = await fixture();
  const r = await stageForm8801ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  assertEquals(r.current_return_workpaper.form1040_line16, 17_867);
  assertEquals(r.current_return_workpaper.form6251_line9, 8_294);
  assertEquals(r.lines[22], 17_867);
  assertEquals(r.lines[24], 9_573);
  assertEquals(r.schedule3_line6b, 5_182);
  assertEquals(r.lines[26], 0);
  assertEquals(
    r.current_form1040_before_credit.line20_nonrefundable_credits,
    undefined,
  );
  assertEquals(
    r.current_form1040_before_credit.line22_tax_after_credits,
    17_867,
  );
  assertEquals([r.reviewPackageBytesVerified, r.currentTaxCapacityReconciled], [
    true,
    true,
  ]);
  assertEquals([
    r.filingReady,
    r.priorAcceptanceVerified,
    r.priorReturnBytesVerified,
    r.finalizedReturnReconciled,
  ], [false, false, false, false]);
});

Deno.test("Form 8801 public wages change recomputes capacity without caller override", async () => {
  const f = await fixture();
  const before = await stageForm8801ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  f.inputs.w2[0].box1_wages = 30_000;
  const after = await stageForm8801ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  assertEquals(after.current_return_workpaper.form6251_line9, 0);
  assertEquals(after.lines[22], 1_475);
  assertEquals(after.lines[25], 1_475);
  assertEquals(after.lines[26], 3_707);
  assertEquals(before.lines[25], 5_182);
});

Deno.test("Form 8801 review staging rejects detached current tax and existing claims", async () => {
  const f = await fixture();
  for (
    const extra of [
      { f8801: {} },
      { f1040: { line16_income_tax: 1 } },
      { schedule3: { line1_foreign_tax_credit: 1 } },
      { schedule2: { line1z: 1 } },
      { form6251: { net_tmt: 0 } },
      { form6251: { regular_tax: 1 } },
    ]
  ) {
    await assertRejects(() =>
      stageForm8801ReviewedReturnCalculation(
        { ...f.inputs, ...extra },
        f.binding,
        f.documents,
      )
    );
  }
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, {
      ...f.binding,
      current_year_regular_tax: 1,
    }, f.documents)
  );
});

Deno.test("Form 8801 capacity-only public request cannot carry preview overrides", () => {
  assertEquals(
    f8801.inputSchema.safeParse({ compute_credit_capacity: true }).success,
    true,
  );
  for (
    const extra of [{ current_year_regular_tax: 1 }, { current_year_tmt: 0 }, {
      prior_year_amt_paid: 0,
    }, { prior_year_carryforward: 0 }]
  ) {
    assertEquals(
      f8801.inputSchema.safeParse({ compute_credit_capacity: true, ...extra })
        .success,
      false,
    );
  }
});

Deno.test("Form 8801 capacity joins multiple payer current foreign credits to line 20", async () => {
  const f = await fixture();
  f.inputs.schedule_b_part_iii = {
    foreign_accounts_question: false,
    fincen_form114_required: false,
    foreign_trust_question: false,
  };
  f.inputs.f1099int = [{
    payer_name: "Bank A",
    recipient_tin: "111223333",
    box1: 5_000,
    box6: 50,
    foreign_source_interest_usd: 5_000,
    foreign_tax_irs_country_code: "CA",
    foreign_tax_source_document_reference: "Bank A issued interest",
  }, {
    payer_name: "Bank B",
    recipient_tin: "111223333",
    box1: 5_000,
    box6: 75,
    foreign_source_interest_usd: 5_000,
    foreign_tax_irs_country_code: "CA",
    foreign_tax_source_document_reference: "Bank B issued interest",
  }];
  const r = await stageForm8801ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  assertEquals(
    r.current_return_workpaper.schedule3_credits.find((c) => c.key === "1")!
      .amount,
    125,
  );
  assertEquals(
    r.current_form1040_before_credit.line20_nonrefundable_credits,
    125,
  );
  assertEquals(r.lines[22], 20_142);
});

Deno.test("Form 8801 capacity preserves incomplete excess foreign-tax source rejection", async () => {
  const f = await fixture();
  f.inputs.f1099int = [50, 75].map((tax, i) => ({
    payer_name: `Bank ${i}`,
    recipient_tin: "111223333",
    box1: 100,
    box6: tax,
    foreign_source_interest_usd: 100,
    foreign_tax_irs_country_code: "CA",
    foreign_tax_source_document_reference: `Bank ${i} issued interest`,
  }));
  await assertRejects(
    () =>
      stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, f.documents),
    Error,
    "successful public pre-credit execution",
  );
});

Deno.test("Form 8801 review package rejects missing/changed/duplicate/unexpected bytes", async () => {
  const f = await fixture();
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, [])
  );
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, [
      ...f.documents,
      ...f.documents,
    ])
  );
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, [{
      reference: "wrong",
      bytes: f.documents[0].bytes,
    }])
  );
  const changed = new Uint8Array(f.documents[0].bytes);
  changed[0] ^= 1;
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, [{
      ...f.documents[0],
      bytes: changed,
    }])
  );
});

Deno.test("Form 8801 coherent package changes still reject foreign owner/year and current-line overrides", async () => {
  for (
    const facts of [{ ...packageFacts(), taxpayer_ssn: "999887777" }, {
      ...packageFacts(),
      prior_tax_year: 2023,
    }, { ...packageFacts(), current_return: { form1040_line16: 1 } }]
  ) {
    const f = await fixture(facts);
    await assertRejects(() =>
      stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, f.documents)
    );
  }
});

Deno.test("Form 8801 canonical review JSON rejects duplicate keys", async () => {
  const f = await fixture();
  const text = JSON.stringify(packageFacts()).replace(
    '"tax_year":2025',
    '"tax_year":2026,"tax_year":2025',
  );
  f.documents[0].bytes = new TextEncoder().encode(text);
  f.binding.sha256 = await sha256Hex(f.documents[0].bytes);
  await assertRejects(() =>
    stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, f.documents)
  );
});

Deno.test("Form 8801 canonical review encoding rejects BOM and invalid UTF-8", async () => {
  for (const prefix of [[0xef, 0xbb, 0xbf], [0xff]]) {
    const f = await fixture();
    const bytes = new Uint8Array(prefix.length + f.documents[0].bytes.length);
    bytes.set(prefix);
    bytes.set(f.documents[0].bytes, prefix.length);
    f.documents[0].bytes = bytes;
    f.binding.sha256 = await sha256Hex(bytes);
    await assertRejects(() =>
      stageForm8801ReviewedReturnCalculation(f.inputs, f.binding, f.documents)
    );
  }
});

Deno.test("Form 8801 source/inputs/binding are copied before digest await", async () => {
  const f = await fixture();
  const promise = stageForm8801ReviewedReturnCalculation(
    f.inputs,
    f.binding,
    f.documents,
  );
  f.inputs.w2[0].box1_wages = 30_000;
  f.binding.current_return_reference = "changed";
  f.documents[0].bytes.fill(0);
  const r = await promise;
  assertEquals(r.lines[25], 5_182);
  assertEquals(
    r.current_return_workpaper.reference,
    "2025 public pre-credit return",
  );
});
