import { assertEquals, assertThrows } from "@std/assert";
import { inputSchema, schedule_b } from "./index.ts";

function compute(input: Record<string, unknown>) {
  return schedule_b.compute(
    { taxYear: 2025, formType: "f1040" },
    inputSchema.parse(input),
  );
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ─── Part I: Interest aggregation ────────────────────────────────────────────

Deno.test("empty input returns no outputs", () => {
  const result = compute({});
  assertEquals(result.outputs.length, 0);
});

Deno.test("foreign-account and trust facts file Schedule B without interest", () => {
  const result = compute({
    form8814_foreign_account: true,
    form8814_foreign_trust: true,
    fincen_form114_required: false,
  });
  const fields = findOutput(result, "schedule_b")?.fields;
  assertEquals(fields?.foreign_accounts_question, true);
  assertEquals(fields?.fincen_form114_required, false);
  assertEquals(fields?.foreign_trust_question, true);
  assertEquals(fields?.form8814_foreign_account, true);
  assertEquals(fields?.form8814_foreign_trust, true);
  assertEquals(findOutput(result, "f1040"), undefined);
});

Deno.test("Schedule B requires an explicit FBAR decision and country codes", () => {
  assertThrows(() =>
    compute({
      form8814_foreign_account: true,
      foreign_trust_question: false,
    })
  );
  assertThrows(() =>
    compute({
      foreign_accounts_question: true,
      fincen_form114_required: true,
      foreign_trust_question: false,
    })
  );
  assertEquals(
    findOutput(
      compute({
        foreign_accounts_question: true,
        fincen_form114_required: true,
        foreign_trust_question: false,
        foreign_countries: [
          { irs_code: "CA", name: "Canada" },
          { irs_code: "FR", name: "France" },
        ],
      }),
      "schedule_b",
    )?.fields.foreign_country_codes,
    ["CA", "FR"],
  );
});

Deno.test("single interest entry routes taxable_interest_net to f1040 line2b", () => {
  const result = compute({ payer_name: "Big Bank", taxable_interest_net: 500 });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields, { line2b_taxable_interest: 500 });
});

Deno.test("multiple interest entries (array) aggregate to line2b", () => {
  const result = compute({
    payer_name: ["Bank A", "Bank B"],
    taxable_interest_net: [300, 700],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040?.fields as Record<string, number>).line2b_taxable_interest,
    1000,
  );
});

Deno.test("interest payer and amount pairs survive the Schedule B output boundary", () => {
  const result = compute({
    payer_name: ["Bank A", "Bond issuer"],
    taxable_interest_net: [800, 900],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const printable = findOutput(result, "schedule_b")?.fields;
  assertEquals(printable?.interest_rows, [
    { payerName: "Bank A", amount: 800 },
    { payerName: "Bond issuer", amount: 900 },
  ]);
  assertEquals(printable?.print_line2_total, 1_700);
});

Deno.test("1099-INT gross interest and deductions remain distinct from taxable interest", () => {
  const result = compute({
    interest_detail: {
      payer_name: "Bond Bank",
      gross: 2_000,
      net: 1_650,
      nominee: 100,
      accrued: 50,
      oid_adjustment: 75,
      bond_premium: 125,
    },
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const fields = findOutput(result, "schedule_b")?.fields;
  assertEquals(
    findOutput(result, "f1040")?.fields.line2b_taxable_interest,
    1_650,
  );
  assertEquals(fields?.interest_rows, [{
    payerName: "Bond Bank",
    amount: 2_000,
  }]);
  assertEquals(fields?.interest_line1_subtotal, 2_000);
  assertEquals(fields?.interest_nominee, 100);
  assertEquals(fields?.interest_accrued, 50);
  assertEquals(fields?.interest_oid_adjustment, 75);
  assertEquals(fields?.interest_bond_premium, 125);
  assertEquals(fields?.print_line2_total, 1_650);
});

Deno.test("Schedule B rejects interest details that do not reconcile", () => {
  assertThrows(() =>
    compute({
      interest_detail: {
        payer_name: "Bond Bank",
        gross: 100,
        net: 80,
        nominee: 10,
        accrued: 0,
        oid_adjustment: 0,
        bond_premium: 0,
      },
      foreign_accounts_question: false,
      foreign_trust_question: false,
    })
  );
});

Deno.test("gross 1099-INT and other net interest sources each appear once", () => {
  const result = compute({
    interest_detail: {
      payer_name: "Bond Bank",
      gross: 2_000,
      net: 1_900,
      nominee: 100,
      accrued: 0,
      oid_adjustment: 0,
      bond_premium: 0,
    },
    payer_name: "Partnership",
    taxable_interest_net: 400,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line2b_taxable_interest,
    2_300,
  );
  assertEquals(findOutput(result, "schedule_b")?.fields.interest_rows, [
    { payerName: "Bond Bank", amount: 2_000 },
    { payerName: "Partnership", amount: 400 },
  ]);
  assertEquals(
    findOutput(result, "schedule_b")?.fields.interest_line1_subtotal,
    2_400,
  );
});

Deno.test("seller-financed interest is first and retains buyer identity", () => {
  const buyer = {
    address_type: "us",
    name: "Jane Buyer",
    ssn: "123456789",
    address_line1: "456 Oak Ave",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };
  const result = compute({
    interest_detail: [
      {
        payer_name: "Bank",
        gross: 100,
        net: 100,
        nominee: 0,
        accrued: 0,
        oid_adjustment: 0,
        bond_premium: 0,
      },
      {
        payer_name: "Buyer",
        gross: 200,
        net: 200,
        nominee: 0,
        accrued: 0,
        oid_adjustment: 0,
        bond_premium: 0,
        seller_financed_buyer: buyer,
      },
    ],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const fields = findOutput(result, "schedule_b")?.fields;
  assertEquals(fields?.seller_financed_rows, [{ buyer, amount: 200 }]);
  assertEquals(fields?.interest_rows, [{ payerName: "Bank", amount: 100 }]);
  assertEquals(fields?.print_interest_rows, [
    { payerName: "Jane Buyer", amount: 200 },
    { payerName: "Bank", amount: 100 },
  ]);
  assertEquals(fields?.interest_line1_subtotal, 300);
});

Deno.test("zero taxable_interest_net produces no interest in f1040 output", () => {
  const result = compute({ payer_name: "Bank A", taxable_interest_net: 0 });
  // If no dividends either, no output at all
  assertEquals(result.outputs.length, 0);
});

// ─── Part II: Dividend aggregation ───────────────────────────────────────────

Deno.test("single dividend entry routes ordinaryDividends to f1040 line3b", () => {
  const result = compute({
    payerName: "Vanguard",
    ordinaryDividends: 800,
    isNominee: false,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(f1040?.fields, { line3b_ordinary_dividends: 800 });
});

Deno.test("nominee dividends keep gross line 5 and net line 6 separate", () => {
  const result = compute({
    dividend_detail: {
      payer_name: "Fund",
      gross: 1_000,
      net: 600,
      nominee: 400,
    },
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertEquals(
    findOutput(result, "f1040")?.fields.line3b_ordinary_dividends,
    600,
  );
  const fields = findOutput(result, "schedule_b")?.fields;
  assertEquals(fields?.dividend_rows, [{ payerName: "Fund", amount: 1_000 }]);
  assertEquals(fields?.dividend_line5_subtotal, 1_000);
  assertEquals(fields?.dividend_nominee, 400);
  assertEquals(fields?.print_line6_total, 600);
  assertThrows(() =>
    compute({
      dividend_detail: {
        payer_name: "Fund",
        gross: 1_000,
        net: 700,
        nominee: 400,
      },
      foreign_accounts_question: false,
      foreign_trust_question: false,
    })
  );
});

Deno.test("multiple dividend entries (array) aggregate to line3b", () => {
  const result = compute({
    payerName: ["Fidelity", "Schwab"],
    ordinaryDividends: [600, 400],
    isNominee: [false, false],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040?.fields as Record<string, number>).line3b_ordinary_dividends,
    1000,
  );
});

Deno.test("Form 8814 and below-threshold parent dividends trigger Schedule B without double counting", () => {
  const result = compute({
    dividend_info: [{ payerName: "Fund A", amount: 1_200 }],
    form8814_dividends: 500,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "agi_aggregator"), undefined);
  const printable = findOutput(result, "schedule_b")?.fields;
  assertEquals(printable?.print_line6_total, 1_700);
  assertEquals(printable?.print_div_payer_1, "Fund A");
  assertEquals(printable?.print_div_payer_2, "Form 8814");
  assertEquals(printable?.print_div_amount_2, 500);
  assertEquals(printable?.dividend_rows, [
    { payerName: "Fund A", amount: 1_200 },
    { payerName: "Form 8814", amount: 500 },
  ]);
});

Deno.test("Schedule B keeps all 16 dividend payers for MeF and PDF overflow", () => {
  const result = compute({
    payerName: Array.from({ length: 16 }, (_, index) => `Fund ${index + 1}`),
    ordinaryDividends: Array(16).fill(100),
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const printable = findOutput(result, "schedule_b")?.fields;
  assertEquals((printable?.dividend_rows as unknown[]).length, 16);
  assertEquals(printable?.print_div_payer_15, "Fund 15");
  assertEquals(printable?.print_div_payer_16, undefined);
  assertEquals(printable?.print_line6_total, 1_600);
});

Deno.test("Schedule B demands Part III answers above the $1,500 threshold", () => {
  assertThrows(() =>
    compute({ payer_name: "Bank", taxable_interest_net: 1_501 })
  );
  assertThrows(() => compute({ payerName: "Fund", ordinaryDividends: 1_501 }));
  const atThreshold = compute({
    payer_name: "Bank",
    taxable_interest_net: 1_500,
  });
  assertEquals(
    findOutput(atThreshold, "f1040")?.fields.line2b_taxable_interest,
    1_500,
  );
  assertEquals(findOutput(atThreshold, "schedule_b"), undefined);
});

Deno.test("Schedule B does not combine below-threshold interest and dividends", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 800,
    payerName: "Fund",
    ordinaryDividends: 900,
  });
  assertEquals(findOutput(result, "f1040")?.fields, {
    line2b_taxable_interest: 800,
    line3b_ordinary_dividends: 900,
  });
  assertEquals(findOutput(result, "schedule_b"), undefined);
});

Deno.test("Schedule B validates below-threshold interest and dividend details", () => {
  assertThrows(() =>
    compute({
      interest_detail: {
        payer_name: "Bank",
        gross: 100,
        net: 80,
        nominee: 10,
        accrued: 0,
        oid_adjustment: 0,
        bond_premium: 0,
      },
    })
  );
  assertThrows(() =>
    compute({
      dividend_detail: {
        payer_name: "Fund",
        gross: 100,
        net: 70,
        nominee: 20,
      },
    })
  );
});

Deno.test("zero ordinaryDividends produces no dividend output", () => {
  const result = compute({
    payerName: "Vanguard",
    ordinaryDividends: 0,
    isNominee: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Output routing ──────────────────────────────────────────────────────────

Deno.test("interest only: f1040 output has line2b but no line3b", () => {
  const result = compute({ payer_name: "Bank", taxable_interest_net: 200 });
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 200);
  assertEquals(inp.line3b_ordinary_dividends, undefined);
});

Deno.test("dividends only: f1040 output has line3b but no line2b", () => {
  const result = compute({
    payerName: "Fund",
    ordinaryDividends: 1200,
    isNominee: false,
  });
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line3b_ordinary_dividends, 1200);
  assertEquals(inp.line2b_taxable_interest, undefined);
});

Deno.test("both interest and dividends produce a single f1040 output with both fields", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 400,
    payerName: "Fund",
    ordinaryDividends: 600,
    isNominee: false,
  });
  // Each income category is below $1,500, so no Schedule B is filed.
  assertEquals(result.outputs.length, 3);
  assertEquals(findOutput(result, "schedule_b"), undefined);
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 400);
  assertEquals(inp.line3b_ordinary_dividends, 600);
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

Deno.test("ee_bond_exclusion reduces taxable interest (line 4 = line 2 - line 3)", () => {
  const result = compute({
    payer_name: "Treasury",
    taxable_interest_net: 2000,
    ee_bond_exclusion: 500,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040?.fields as Record<string, number>).line2b_taxable_interest,
    1500,
  );
});

Deno.test("ee_bond_exclusion equal to total interest → no line2b output", () => {
  const result = compute({
    payer_name: "Treasury",
    taxable_interest_net: 800,
    ee_bond_exclusion: 800,
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  assertEquals(findOutput(result, "f1040"), undefined);
  assertEquals(findOutput(result, "schedule_b")?.fields.print_line4_total, 0);
});

Deno.test("ee_bond_exclusion cannot exceed total interest", () => {
  assertThrows(() =>
    compute({
      payer_name: "Treasury",
      taxable_interest_net: 300,
      ee_bond_exclusion: 500,
    })
  );
});

Deno.test("mixed scalar and array interest entries normalize correctly", () => {
  // Simulate executor accumulating: first entry as scalar, then later entries as array
  const result = compute({
    payer_name: ["First Bank", "Second Bank", "Third Bank"],
    taxable_interest_net: [100, 200, 300],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040?.fields as Record<string, number>).line2b_taxable_interest,
    600,
  );
});

Deno.test("all zeros produce empty outputs", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 0,
    payerName: "Fund",
    ordinaryDividends: 0,
    isNominee: false,
  });
  assertEquals(result.outputs.length, 0);
});

// ─── Smoke test ───────────────────────────────────────────────────────────────

Deno.test("smoke: multiple interest + dividend payers with EE bond exclusion", () => {
  // 3 interest payers totaling $4,500; $1,000 EE bond exclusion → line2b = $3,500
  // 2 dividend payers totaling $3,200 → line3b = $3,200
  // Both exceed $1,500 threshold → Part III required (informational only)
  const result = compute({
    payer_name: ["Bank A", "Bank B", "Treasury Direct"],
    taxable_interest_net: [1000, 2500, 1000],
    ee_bond_exclusion: 1000,
    payerName: ["Vanguard Total Market", "Fidelity Index"],
    ordinaryDividends: [2000, 1200],
    isNominee: [false, false],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });

  // f1040 + agi_aggregator + form8960 (interest > 0) + print-line output.
  assertEquals(result.outputs.length, 4);
  const f1040 = findOutput(result, "f1040");
  const inp = f1040?.fields as Record<string, number>;
  assertEquals(inp.line2b_taxable_interest, 3500);
  assertEquals(inp.line3b_ordinary_dividends, 3200);
});

// ─── box3_us_obligations passthrough ─────────────────────────────────────────

Deno.test("box3_us_obligations: field is accepted by schema and does not affect line2b calculation", () => {
  // box3_us_obligations is informational — used for Form 8815 exclusion context,
  // not subtracted from taxable_interest_net (that net is already computed upstream)
  const result = compute({
    payer_name: "Treasury Direct",
    taxable_interest_net: 1_000,
    box3_us_obligations: 800,
    payerName: undefined,
    ordinaryDividends: undefined,
    isNominee: undefined,
  });

  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line2b_taxable_interest,
    1_000,
  );
});

// ─── $1,500 threshold aggregation behavior ────────────────────────────────────

Deno.test("threshold: 3 interest payers totaling $1,600 > $1,500 — all included in line2b", () => {
  // $600 + $800 + $200 = $1,600; all three payer amounts aggregate to line2b
  const result = compute({
    payer_name: ["Payer A", "Payer B", "Payer C"],
    taxable_interest_net: [600, 800, 200],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line2b_taxable_interest,
    1_600,
  );
});

Deno.test("threshold: interest total exactly $1,499 — included in line2b (below threshold)", () => {
  const result = compute({
    payer_name: ["Bank A", "Bank B"],
    taxable_interest_net: [999, 500],
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line2b_taxable_interest,
    1_499,
  );
});

Deno.test("threshold: dividend total $1,600 > $1,500 — all included in line3b", () => {
  // 3 payers each with $600, $700, $300 = $1,600
  const result = compute({
    payerName: ["Fund A", "Fund B", "Fund C"],
    ordinaryDividends: [600, 700, 300],
    foreign_accounts_question: false,
    foreign_trust_question: false,
  });
  const f1040 = findOutput(result, "f1040");
  assertEquals(
    (f1040!.fields as Record<string, number>).line3b_ordinary_dividends,
    1_600,
  );
});

Deno.test("threshold: interest $800 + dividend $900 each below $1,500 — both route to f1040", () => {
  const result = compute({
    payer_name: "Bank",
    taxable_interest_net: 800,
    payerName: "Fund",
    ordinaryDividends: 900,
  });
  const f1040 = findOutput(result, "f1040");
  const fields = f1040!.fields as Record<string, number>;
  assertEquals(fields.line2b_taxable_interest, 800);
  assertEquals(fields.line3b_ordinary_dividends, 900);
});

// ─── AGI aggregator routing ───────────────────────────────────────────────────

Deno.test("interest routes to agi_aggregator as well as f1040", () => {
  const result = compute({ payer_name: "Bank", taxable_interest_net: 1_200 });
  const agiOut = findOutput(result, "agi_aggregator");
  assertEquals(
    (agiOut!.fields as Record<string, number>).line2b_taxable_interest,
    1_200,
  );
});

Deno.test("dividends route to agi_aggregator as well as f1040", () => {
  const result = compute({ payerName: "Fund", ordinaryDividends: 800 });
  const agiOut = findOutput(result, "agi_aggregator");
  assertEquals(
    (agiOut!.fields as Record<string, number>).line3b_ordinary_dividends,
    800,
  );
});
