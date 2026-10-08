import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  type ArrangementKind,
  form8941ArrangementInputs,
  form8941ArrangementSource,
} from "../../../../2025/pdf/reviews/general/composed-returns/review-8941-arrangements.fixture.ts";
import {
  inputSchema as scheduleCSchema,
  projectScheduleCItems,
} from "../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { calculateForm8941 } from "../../../../nodes/inputs/credits/health/f8941/index.ts";
import {
  arrangementWorksheet,
  cents,
} from "../../../../nodes/inputs/credits/health/f8941/arrangements.ts";
const dir = new URL(
  "../../../../../../.state/research/2026-10-06-form8941-arrangements/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);
function run(kind: ArrangementKind, receipts = 400000, partYear = false) {
  const input = form8941ArrangementInputs(kind, receipts, partYear);
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  return {
    input,
    pending: result.pending,
    filer: extractFilerIdentity(input.general)!,
  };
}
const cases: readonly [
  string,
  ArrangementKind,
  number,
  boolean,
  number,
  number,
  number,
  number,
][] = [
  [
    "composite-tier-percent",
    "composite-tier-percent",
    360000,
    false,
    62350,
    51699,
    25850,
    25850,
  ],
  [
    "composite-tier-dollar",
    "composite-tier-dollar",
    345000,
    false,
    36452,
    29758,
    14879,
    14879,
  ],
  [
    "composite-tier-greater-dollar",
    "composite-tier-greater-dollar",
    350000,
    false,
    42033,
    34486,
    17243,
    17243,
  ],
  [
    "list-tier-percent",
    "list-tier-percent",
    365000,
    false,
    73277,
    54442,
    27221,
    27221,
  ],
  [
    "list-self-computed-family-floor",
    "list-self-computed-family-floor",
    350000,
    false,
    38972,
    27381,
    13691,
    13691,
  ],
  [
    "list-self-percent-family-floor",
    "list-self-percent-family-floor",
    350000,
    false,
    44372,
    32151,
    16076,
    16076,
  ],
  [
    "list-family-computed",
    "list-family-computed",
    365000,
    false,
    70953,
    51681,
    25841,
    25841,
  ],
  [
    "partial-tax-use",
    "list-self-computed-family-floor",
    200000,
    false,
    38972,
    27381,
    13691,
    4829,
  ],
  [
    "zero-tax-use",
    "list-self-computed-family-floor",
    130000,
    false,
    38972,
    27381,
    13691,
    0,
  ],
  [
    "part-year-list-family",
    "list-family-computed",
    200000,
    true,
    43977,
    31176,
    15588,
    7779,
  ],
];
for (
  const [name, kind, receipts, partYear, paid, cap, credit, allowed] of cases
) {
  Deno.test({
    name: `Form8941 qualifying arrangement ${name} owned public full-XSD/PDF`,
    sanitizeOps: false,
    sanitizeResources: false,
  }, async () => {
    const { input, pending, filer } = run(kind, receipts, partYear);
    const lines = calculateForm8941(input.f8941);
    assertEquals([lines.line4, lines.line5, lines.line16], [paid, cap, credit]);
    assertEquals(lines.line2, partYear ? 3 : 5);
    assertEquals(lines.line3, partYear ? 25000 : 20000);
    const worksheet4 = arrangementWorksheet(input.f8941);
    assertEquals(worksheet4.length, partYear ? 34 : 60);
    assertEquals(
      input.f8941.monthly_arrangements.every((p) =>
        p.eligible_employee_quotes.length === 5
      ),
      true,
    );
    assertEquals(
      worksheet4.some((r) => cents(r.employer_payment) % 100 !== 0),
      true,
    );
    const benefit = 1000 + paid - credit;
    assertEquals(
      projectScheduleCItems(scheduleCSchema.parse(pending.schedule_c))[0]
        .line_14_employee_benefits,
      benefit,
    );
    assertEquals(
      scheduleCSchema.parse(pending.schedule_c).schedule_cs[0]
        .line_14_employee_benefits,
      1000 + paid,
    );
    const wages = input.f8941.employees.reduce(
      (s, e) => s + e.social_security_medicare_wages,
      0,
    );
    assertEquals(
      pending.f1040.line8_additional_income,
      receipts - wages - benefit,
    );
    assertEquals(pending.f3800.form8941_applied_credit, allowed);
    assertEquals(
      Number(pending.f1040.line20_nonrefundable_credits ?? 0),
      allowed,
    );
    const bundle = await buildMefBundle(buildPending(pending), {
      filer,
      attachments: [],
    });
    const allocation = bundle.form3800Parts!.currentAmounts.find((row) =>
      row.line === "4h"
    )!;
    assertEquals([allocation.totalCredit, allocation.appliedCredit], [
      credit,
      allowed,
    ]);
    assertStringIncludes(bundle.xml, "<IRS8941 ");
    assertStringIncludes(
      bundle.xml,
      `<SumSmllrAmtAndCreditForHIPAmt>${credit}</SumSmllrAmtAndCreditForHIPAmt>`,
    );
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      dir + name + ".json",
      JSON.stringify(
        {
          input,
          lines,
          pending,
          preparedParts: bundle.form3800Parts,
          worksheet4,
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(dir + name + ".xml", bundle.xml);
    const valid = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + name + ".xml"],
      stderr: "piped",
    }).output();
    assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
    await Deno.writeFile(
      dir + name + ".pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
    const text = await new Deno.Command("pdftotext", {
      args: ["-layout", dir + name + ".pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(text.code, 0);
    const packet = new TextDecoder().decode(text.stdout);
    await Deno.writeTextFile(dir + name + ".txt", packet);
    assertStringIncludes(packet, "Small Employer Health Insurance");
    assertStringIncludes(packet, String(credit));
    assertStringIncludes(packet, String(benefit));
    const medicareHeader = packet.search(
      /\fForm\s+8959\s+Additional Medicare Tax/,
    );
    if (medicareHeader >= 0) {
      const qbiHeader = packet.search(
        /\fForm\s+8995\s+Qualified Business Income/,
      );
      const creditHeader = packet.search(
        /\fForm\s+8941\s+Credit for Small Employer/,
      );
      assertEquals(
        qbiHeader >= 0 && qbiHeader < creditHeader &&
          creditHeader < medicareHeader,
        true,
      );
    }
  });
}

// Each mutation is exported through native XML and prepared PDF, and is also
// supplied through the actual public graph to prove invalid source is blocked.
const sourceMutations: [string, (source: any) => void][] = [
  [
    "quote-roster-omission",
    (s) => s.monthly_arrangements[0].eligible_employee_quotes.pop(),
  ],
  [
    "quote-duplicate-employee",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[1] = structuredClone(
        s.monthly_arrangements[0].eligible_employee_quotes[0],
      ),
  ],
  [
    "quote-employee-ssn",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[0].employee_ssn =
        s.owner_ssn,
  ],
  [
    "quote-document-reuse",
    (s) =>
      s.monthly_arrangements[1].eligible_employee_quotes[0]
        .quote_source_reference =
          s.monthly_arrangements[0].eligible_employee_quotes[0]
            .quote_source_reference,
  ],
  [
    "quote-invoice-document-reuse",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[0]
        .quote_source_reference =
          s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
            .shop_invoice_reference,
  ],
  [
    "missing-hypothetical-family-quote",
    (s) =>
      delete s.monthly_arrangements[0].eligible_employee_quotes[1]
        .family_premium,
  ],
  [
    "reference-premium-tamper",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[0].family_premium++,
  ],
  [
    "invoice-quote-join",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .insured_quote_reference =
          s.monthly_arrangements[0].eligible_employee_quotes[1]
            .quote_source_reference,
  ],
  [
    "invoice-policy-join",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .employer_policy_reference =
          s.monthly_arrangements[1].employer_policy_reference,
  ],
  ["policy-month-duplicate", (s) => s.monthly_arrangements[1].month = 1],
  ["policy-month-omission", (s) => s.monthly_arrangements.shift()],
  [
    "policy-owner",
    (s) => s.monthly_arrangements[0].payer_employment_ein = "987654321",
  ],
  [
    "policy-plan",
    (s) => s.monthly_arrangements[0].shop_plan_reference = "other-plan",
  ],
  [
    "policy-dates",
    (s) => s.monthly_arrangements[0].coverage_end_date = "2025-02-28",
  ],
  [
    "quote-eligible-roster-unconfirmed",
    (s) => s.all_plan_eligible_employees_identified_confirmed = false,
  ],
  [
    "employee-contribution-over-half-average",
    (s) =>
      s.monthly_arrangements[0].employee_only_rule
        .employee_monthly_contribution = 610,
  ],
  [
    "employee-contribution-over-reference",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[0]
        .employee_only_premium = 500,
  ],
  [
    "list-flat-employer-substitute",
    (s) =>
      s.monthly_arrangements[0].family_rule = {
        method: "uniform_employer_amount",
        employer_monthly_contribution: 500,
      },
  ],
  ["family-below-self-floor", (s) => {
    s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
      .employer_payment = 324.04;
    s.employees[0].employer_premium_paid--;
  }],
  [
    "employee-payment-nonuniform",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[0]
        .employer_payment++,
  ],
  [
    "too-many-source-decimals",
    (s) =>
      s.monthly_arrangements[0].eligible_employee_quotes[0]
        .employee_only_premium = 900.055,
  ],
  [
    "duplicate-invoice",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[0]
        .shop_invoice_reference =
          s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
            .shop_invoice_reference,
  ],
  [
    "duplicate-payment",
    (s) =>
      s.shop_review.employee_premium_reviews[1].monthly_premiums[0]
        .employer_payment_reference =
          s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
            .employer_payment_reference,
  ],
  [
    "invoice-owner",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .payer_employment_ein = "987654321",
  ],
  [
    "payment-tax-year",
    (s) =>
      s.shop_review.employee_premium_reviews[0].monthly_premiums[0]
        .payment_date = "2026-01-15",
  ],
  [
    "irs-family-table",
    (s) => s.shop_review.irs_table_family_average_premium = 9358,
  ],
  [
    "payroll-hours",
    (s) =>
      s.shop_review.employee_premium_reviews[0].payroll_hours_of_service = 1040,
  ],
];
Deno.test({
  name:
    "Form8941 qualifying arrangements actual native/PDF and public source conflicts",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const baseline = run("list-self-computed-family-floor", 200000);
  const bundle = await buildMefBundle(buildPending(baseline.pending), {
    filer: baseline.filer,
    attachments: [],
  });
  const mutations: [string, (p: any) => void][] = sourceMutations.map((
    [name, mutate],
  ) => [name, (p) => mutate(p.f8941)]);
  mutations.push(
    [
      "allowed-only-benefits-reduction",
      (p) =>
        p.schedule_c.form8941_premium_reductions[0].credit_amount =
          p.f3800.form8941_applied_credit,
    ],
    [
      "credit-total",
      (p) => p.f3800.f8941_direct_employer_credit.credit_amount++,
    ],
    ["credit-allocation", (p) => p.f3800.form8941_applied_credit++],
    ["1040-credit", (p) => p.f1040.line20_nonrefundable_credits++],
    [
      "gross-benefits",
      (p) => p.schedule_c.schedule_cs[0].line_14_employee_benefits--,
    ],
    ["filing-owner", (p) => p.f8941.owner_ssn = "999887777"],
  );
  for (const [name, mutate] of mutations) {
    const pending = structuredClone(bundle.pending);
    mutate(pending);
    assertThrows(
      () => buildMefXml(buildPending(pending), baseline.filer),
      Error,
      undefined,
      name,
    );
    await assertRejects(
      () =>
        buildPdfBytes(pending, baseline.filer, dir + "irs-pdf-cache", bundle),
      Error,
      undefined,
      name,
    );
  }
  for (const [name, mutate] of sourceMutations) {
    const input = form8941ArrangementInputs(
      "list-self-computed-family-floor",
      200000,
    );
    mutate(input.f8941);
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics.length > 0, true, name);
    const filer = extractFilerIdentity(input.general)!;
    assertThrows(
      () => buildMefXml(buildPending(result.pending), filer),
      Error,
      undefined,
      name,
    );
    await assertRejects(
      () => buildPdfBytes(result.pending, filer),
      Error,
      undefined,
      name,
    );
  }
  await Deno.writeTextFile(
    dir + "negative-proof.json",
    JSON.stringify(
      {
        nativeAndPreparedPdfRejected: mutations.map(([n]) => n),
        publicGraphNativeAndPdfRejected: sourceMutations.map(([n]) => n),
      },
      null,
      2,
    ),
  );
});
Deno.test("Form8941 composite exception and independent-tier rule boundaries", () => {
  for (
    const [kind, mutate, message] of [
      [
        "composite-tier-dollar",
        (s: any) =>
          s.monthly_arrangements[0].family_rule.employer_monthly_contribution =
            599,
        "below hypothetical",
      ],
      [
        "composite-tier-percent",
        (s: any) =>
          s.monthly_arrangements[0].family_rule.employer_basis_points = 4999,
        "",
      ],
      [
        "composite-tier-dollar",
        (s: any) =>
          s.monthly_arrangements[0].eligible_employee_quotes[1]
            .employee_only_premium++,
        "composite reference",
      ],
      [
        "list-family-computed",
        (s: any) =>
          s.monthly_arrangements[0].family_rule.employee_monthly_contribution =
            1351,
        "half the computed",
      ],
    ] as const
  ) {
    const source = form8941ArrangementSource(kind);
    mutate(source);
    assertThrows(() => calculateForm8941(source), Error, message);
  }
});
Deno.test("Form8941 list composite denominator includes employees in other tiers and absent coverage months", () => {
  const source = form8941ArrangementSource(
    "list-self-computed-family-floor",
    true,
  );
  // 575.01 exceeds half the 1100.05 average of the two actual self-only
  // enrollees, but is within half the 1200.05 ALL-eligible reference average.
  const policy = source.monthly_arrangements[0];
  const all = policy.eligible_employee_quotes.reduce(
    (s, q) => s + q.employee_only_premium,
    0,
  ) / 5;
  assertEquals(all, 1200.05);
  assertEquals(calculateForm8941(source).line16 > 0, true);
  assertEquals(policy.eligible_employee_quotes.length, 5);
  assertEquals(
    source.shop_review.employee_premium_reviews.filter((r) =>
      r.monthly_premiums.some((m) => m.month === policy.month)
    ).length < 5,
    true,
  );
});
