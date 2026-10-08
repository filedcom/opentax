import { assertEquals } from "@std/assert";
import {
  calculateForm8396,
  calculateForm8396Line1,
  calculateForm8396Line3,
  CertifiedInterestDocumentKind,
  form8396SourceSchema,
} from "./calculation.ts";
import { form8396 } from "./index.ts";

const source = {
  certificate_issuer_name: "Austin Housing Finance Corporation",
  certificate_number: "MCC-2022-104",
  certificate_issue_date: "2022-03-15",
  current_year_claim: true,
  interest_evidence: {
    kind: CertifiedInterestDocumentKind.Form1098,
    document_reference: "2025 Form 1098 loan A",
    reported_interest_paid: 15_000,
    taxpayer_interest_paid: 15_000,
    original_mortgage_amount: 200_000,
    certified_indebtedness_amount: 200_000,
  },
  interest_reporting_line: "8a",
  mcc_rate: 0.25,
  home_is_main_residence: true,
  home_in_issuer_jurisdiction: true,
  interest_paid_to_related_person: false,
  certificate_is_reissued: false,
  nonspouse_coowner: false,
  prior_2024_form8396: {
    document_reference: "Filed 2024 Form 8396",
    line14_2023_carryforward: 300,
    line16_2022_carryforward: 100,
    line17_2024_carryforward: 400,
  },
} as const;

function parsed() {
  return form8396SourceSchema.parse(source);
}

Deno.test("Form 8396 limits a high-rate current credit and keeps the three vintages", () => {
  const lines = calculateForm8396(parsed(), 1_500);
  assertEquals(lines.line3, 2_000);
  assertEquals([lines.line4, lines.line5, lines.line6], [100, 300, 400]);
  assertEquals(lines.line7, 2_800);
  assertEquals(lines.line8, 1_500);
  assertEquals(lines.line9, 1_500);
  assertEquals(lines.line14, 400);
  assertEquals(lines.line16, 300);
  assertEquals(lines.line17, 500);
  assertEquals(lines.carryforwardTo2026, {
    year2023: 300,
    year2024: 400,
    year2025: 500,
  });
});

Deno.test("Form 8396 does not apply the high-rate cap at exactly 20 percent", () => {
  assertEquals(
    calculateForm8396Line3(form8396SourceSchema.parse({
      ...source,
      mcc_rate: 0.2,
    })),
    3_000,
  );
});

Deno.test("Form 8396 allocates interest when the certified loan is smaller", () => {
  const allocated = form8396SourceSchema.parse({
    ...source,
    interest_evidence: {
      ...source.interest_evidence,
      reported_interest_paid: 7_500,
      taxpayer_interest_paid: 7_500,
      original_mortgage_amount: 125_000,
      certified_indebtedness_amount: 100_000,
    },
    mcc_rate: 0.2,
  });
  assertEquals(calculateForm8396Line1(allocated), 6_000);
  assertEquals(calculateForm8396Line3(allocated), 1_200);
});

Deno.test("Form 8396 carryforward-only claim has no current-year interest", () => {
  const carryOnly = form8396SourceSchema.parse({
    ...source,
    current_year_claim: false,
    interest_evidence: undefined,
  });
  const lines = calculateForm8396(carryOnly, 200);
  assertEquals([lines.line1, lines.line3, lines.line9], [0, 0, 200]);
});

Deno.test("Form 8396 prorates a high-rate cap for a nonspouse co-owner", () => {
  assertEquals(
    calculateForm8396Line3(form8396SourceSchema.parse({
      ...source,
      nonspouse_coowner: true,
      nonspouse_coowner_share: 0.4,
    })),
    800,
  );
});

Deno.test("Form 8396 current credit is used before 2022, 2023, and 2024 carryforwards", () => {
  const lines = calculateForm8396(parsed(), 2_200);
  assertEquals(lines.line9, 2_200);
  assertEquals(lines.carryforwardTo2026, {
    year2023: 200,
    year2024: 400,
    year2025: 0,
  });
  assertEquals(calculateForm8396(parsed(), 2_800).carryforwardTo2026, {
    year2023: 0,
    year2024: 0,
    year2025: 0,
  });
});

Deno.test("Form 8396 source routes its line 3 reduction and defers line 9 tax use", () => {
  const result = form8396.compute(
    { taxYear: 2025, formType: "f1040" },
    parsed(),
  );
  assertEquals(
    result.outputs.find((row) => row.nodeType === "schedule_a")
      ?.fields.form8396_interest_credit_reduction,
    2_000,
  );
  assertEquals(
    result.outputs.find((row) => row.nodeType === "schedule3")
      ?.fields.form8396_source_credit_pending,
    true,
  );
  assertEquals(
    result.outputs.find((row) => row.nodeType === "f1040")
      ?.fields.form8396_source,
    parsed(),
  );
  assertEquals(
    result.outputs.some((row) =>
      row.fields.line6g_mortgage_interest_credit !== undefined
    ),
    false,
  );
});

Deno.test("Form 8396 rejects unsupported or incomplete MCC claims", () => {
  for (
    const invalid of [
      { ...source, mcc_rate: 0.05 },
      { ...source, interest_reporting_line: undefined },
      { ...source, home_is_main_residence: false },
      { ...source, home_in_issuer_jurisdiction: false },
      { ...source, interest_paid_to_related_person: true },
      { ...source, certificate_is_reissued: true },
      { ...source, current_year_claim: true, interest_evidence: undefined },
      { ...source, current_year_claim: false },
      {
        ...source,
        interest_evidence: {
          ...source.interest_evidence,
          taxpayer_interest_paid: 16_000,
        },
      },
      { ...source, nonspouse_coowner: true },
      { ...source, certificate_issue_date: "2026-01-01" },
      {
        ...source,
        qualified_home_address_if_different: {
          line1: "123 Main St",
          city: "Austin",
          state: "ZZ",
          zip: "78701",
        },
      },
      {
        ...source,
        qualified_home_address_if_different: {
          line1: "123 Main St",
          city: "Austin",
          state: "TX",
          zip: "78701-1234",
        },
      },
      {
        ...source,
        prior_2024_form8396: {
          ...source.prior_2024_form8396,
          line14_2023_carryforward: 0,
          line16_2022_carryforward: 0,
          line17_2024_carryforward: 0,
        },
      },
      {
        ...source,
        prior_2024_form8396: {
          ...source.prior_2024_form8396,
          document_reference: "",
        },
      },
    ]
  ) {
    assertEquals(form8396SourceSchema.safeParse(invalid).success, false);
  }
});
