import { assertEquals, assertThrows } from "@std/assert";
import {
  CoverageType,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { form8889 } from "../../../../mef/forms/adjustments/health/f8889.ts";
import { form5329 } from "../../../../mef/forms/taxes/retirement/f5329.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";
import { form5329Pdf } from "../../../../pdf/forms/taxes/retirement/f5329.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-hsa-owners"
)!;

const source = inputSchema.parse({
  beneficiary_identity: {
    owner: "T",
    name: "Alex Example",
    ssn: "111223333",
  },
  eligible_hdhp_coverage_by_month: Array(12).fill(null),
  medicare_enrollment: {
    first_ineligible_month: 1,
    source_reference: "Alex January Medicare enrollment notice",
  },
  age_55_or_older: false,
  married_at_year_end: true,
  spouse_has_separate_hsa: true,
  last_month_rule_elected: false,
  taxpayer_hsa_contributions: 1_200,
  hsa_december_31_value: 2_000,
  spouse_hsa: {
    beneficiary_identity: {
      owner: "S",
      name: "Sam Example",
      ssn: "444556666",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 3_000,
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

Deno.test("January Medicare onset routes one owner's zero limit and excess through both filing outputs", () => {
  const pending = preparedReturn().pending;
  const forms = pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  assertEquals(forms.map((item) => item.print_line3_limit), [0, 4_300]);
  assertEquals(forms.map((item) => item.print_line13_deduction), [0, 3_000]);
  assertEquals(pending.schedule1.line13_hsa_deduction, 3_000);
  assertEquals(pending.f1040.line10_adjustments, 3_000);
  const excess = pending.form5329.owner_forms as Record<string, unknown>[];
  assertEquals(excess.length, 1);
  assertEquals(excess[0].owner, "T");
  assertEquals(excess[0].print_hsa_line47, 1_200);
  assertEquals(excess[0].print_hsa_line49, 72);
  assertEquals(pending.schedule2.line8_form5329_tax, 72);
  assertEquals(pending.f1040.line23_other_taxes, 72);
  assertEquals(
    form8889.build({ forms }, { filer: base.filer, pending }).length,
    2,
  );
  assertEquals(
    form8889Pdf.instances?.({ forms }, base.filer, pending)?.map((item) =>
      item.print_line3_limit
    ),
    [0, 4_300],
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
    72,
  );
});

Deno.test("January Medicare route rejects onset, source, owner excess, and return tampering", () => {
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
      medicare_enrollment: {
        ...source.medicare_enrollment!,
        first_ineligible_month: 2,
      },
    },
  }, {
    ...pending,
    form8889: {
      ...pending.form8889,
      medicare_enrollment: {
        ...source.medicare_enrollment!,
        source_reference: "",
      },
    },
  }, {
    ...pending,
    form5329: {
      ...pending.form5329,
      owner_forms: [{ ...excess[0], print_hsa_line47: 1_199 }],
    },
  }, {
    ...pending,
    schedule2: { ...pending.schedule2, line8_form5329_tax: 71 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line23_other_taxes: 71 },
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
