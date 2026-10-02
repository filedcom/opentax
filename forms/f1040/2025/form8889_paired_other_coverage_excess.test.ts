import { assertEquals, assertThrows } from "@std/assert";
import {
  CoverageType,
  inputSchema,
} from "../nodes/intermediate/forms/form8889/index.ts";
import { f1040_2025 } from "./index.ts";
import { form8889 } from "./mef/forms/f8889.ts";
import { form5329 } from "./mef/forms/f5329.ts";
import { form8889Pdf } from "./pdf/forms/f8889.ts";
import { form5329Pdf } from "./pdf/forms/f5329.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-hsa-owners"
)!;

const source = inputSchema.parse({
  beneficiary_identity: {
    owner: "T",
    name: "Alex Example",
    ssn: "111223333",
  },
  eligible_hdhp_coverage_by_month: [
    ...Array(6).fill(CoverageType.Family),
    ...Array(6).fill(null),
  ],
  other_disqualifying_coverage: {
    first_ineligible_month: 7,
    source_reference: "Alex July nonpermitted coverage notice",
    continuing_spouse_not_covered_by_other_plan: true,
  },
  age_55_or_older: false,
  married_at_year_end: true,
  spouse_has_separate_hsa: true,
  last_month_rule_elected: false,
  allocated_family_limit: 2_000,
  family_allocation_source_reference: "2025 signed family allocation",
  taxpayer_hsa_contributions: 3_000,
  hsa_december_31_value: 5_000,
  spouse_hsa: {
    beneficiary_identity: {
      owner: "S",
      name: "Sam Example",
      ssn: "444556666",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    allocated_family_limit: 2_275,
    family_allocation_source_reference: "2025 signed family allocation",
    taxpayer_hsa_contributions: 6_000,
  },
});

function preparedReturn() {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      spouse_dob: "1982-03-10",
    },
    form8889: source,
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("paired other-coverage loss retains one owner's HSA excess and prints both 8889 copies", () => {
  const pending = preparedReturn().pending;
  const forms = pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  assertEquals(forms.map((item) => item.print_line6), [2_000, 6_550]);
  assertEquals(forms.map((item) => item.print_line13_deduction), [
    2_000,
    6_000,
  ]);
  assertEquals(pending.schedule1.line13_hsa_deduction, 8_000);
  assertEquals(pending.f1040.line10_adjustments, 8_000);
  const excess = pending.form5329.owner_forms as Record<string, unknown>[];
  assertEquals(excess.length, 1);
  assertEquals(excess[0].owner, "T");
  assertEquals(excess[0].print_hsa_line47, 1_000);
  assertEquals(excess[0].print_hsa_line49, 60);
  assertEquals(pending.schedule2.line8_form5329_tax, 60);
  assertEquals(pending.f1040.line23_other_taxes, 60);
  assertEquals(
    form8889.build({ forms }, { filer: base.filer, pending }).length,
    2,
  );
  assertEquals(
    form8889Pdf.instances?.({ forms }, base.filer, pending)?.length,
    2,
  );
  assertEquals(
    form5329.build(pending.form5329 as never, {
      filer: base.filer,
      pending,
    }).length,
    1,
  );
  assertEquals(
    form5329Pdf.instances?.(pending.form5329, base.filer, pending)?.[0]
      ?.print_hsa_line49,
    60,
  );
});

Deno.test("paired other-coverage excess rejects onset, owner Form 5329, and final tax tampering", () => {
  const pending = preparedReturn().pending;
  const forms = pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  const excess = pending.form5329.owner_forms as Record<string, unknown>[];
  const altered = [{
    ...pending,
    form8889: {
      ...pending.form8889,
      other_disqualifying_coverage: {
        ...source.other_disqualifying_coverage!,
        first_ineligible_month: 8,
      },
    },
  }, {
    ...pending,
    form5329: {
      ...pending.form5329,
      owner_forms: [{ ...excess[0], print_hsa_line47: 999 }],
    },
  }, {
    ...pending,
    schedule2: { ...pending.schedule2, line8_form5329_tax: 59 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line23_other_taxes: 59 },
  }];
  for (const changed of altered) {
    assertThrows(
      () => form8889.build({ forms }, { filer: base.filer, pending: changed }),
      Error,
    );
    assertThrows(
      () => form8889Pdf.instances?.({ forms }, base.filer, changed),
      Error,
    );
  }
});
