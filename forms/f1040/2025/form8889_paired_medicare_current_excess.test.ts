import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
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
    ...Array(6).fill(CoverageType.SelfOnly),
    ...Array(6).fill(null),
  ],
  medicare_enrollment: {
    first_ineligible_month: 7,
    source_reference: "Alex July Medicare enrollment notice",
  },
  age_55_or_older: false,
  married_at_year_end: true,
  spouse_has_separate_hsa: true,
  last_month_rule_elected: false,
  taxpayer_hsa_contributions: 3_000,
  hsa_december_31_value: 5_000,
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

Deno.test("Medicare owner's retained current HSA excess reaches only that owner's Form 5329", () => {
  const result = preparedReturn();
  const forms = result.pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  assertEquals(forms.map((form) => form.print_line3_limit), [2_150, 4_300]);
  assertEquals(forms.map((form) => form.print_line13_deduction), [
    2_150,
    3_000,
  ]);
  assertEquals(result.pending.schedule1.line13_hsa_deduction, 5_150);
  assertEquals(result.pending.f1040.line10_adjustments, 5_150);
  const ownerForms = result.pending.form5329.owner_forms as Record<
    string,
    unknown
  >[];
  assertEquals(ownerForms.length, 1);
  assertEquals(ownerForms[0].owner, "T");
  assertEquals(ownerForms[0].print_hsa_line47, 850);
  assertEquals(ownerForms[0].print_hsa_line48, 850);
  assertEquals(ownerForms[0].print_hsa_line49, 51);
  assertEquals(result.pending.schedule2.line8_form5329_tax, 51);
  assertEquals(result.pending.f1040.line23_other_taxes, 51);
  const native8889 = form8889.build({ forms }, {
    filer: base.filer,
    pending: result.pending,
  });
  assertEquals(native8889.length, 2);
  assertStringIncludes(
    native8889[0]!,
    "<HSALimitedAnnualDeductibleAmt>2150</HSALimitedAnnualDeductibleAmt>",
  );
  assertEquals(
    form8889Pdf.instances?.({ forms }, base.filer, result.pending)?.map((
      form,
    ) => form.print_line13_deduction),
    [2_150, 3_000],
  );
  assertEquals(
    form5329.build(result.pending.form5329 as never, {
      filer: base.filer,
      pending: result.pending,
    }).length,
    1,
  );
  assertEquals(
    form5329Pdf.instances?.(
      result.pending.form5329,
      base.filer,
      result.pending,
    )?.[0]?.print_hsa_line49,
    51,
  );
});

Deno.test("paired Medicare HSA excess rejects month, owner form, and return tampering", () => {
  const pending = preparedReturn().pending;
  const forms = pending.form8889.forms as Extract<
    Parameters<typeof form8889.build>[0],
    { forms: unknown }
  >["forms"];
  const ownerForms = pending.form5329.owner_forms as Record<string, unknown>[];
  const changed = [{
    ...pending,
    form8889: {
      ...pending.form8889,
      medicare_enrollment: {
        ...source.medicare_enrollment!,
        first_ineligible_month: 8,
      },
    },
  }, {
    ...pending,
    form5329: {
      ...pending.form5329,
      owner_forms: [{
        ...ownerForms[0],
        print_hsa_line47: 849,
      }],
    },
  }, {
    ...pending,
    schedule2: { ...pending.schedule2, line8_form5329_tax: 50 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line23_other_taxes: 50 },
  }];
  for (const altered of changed) {
    assertThrows(
      () => form8889.build({ forms }, { filer: base.filer, pending: altered }),
      Error,
    );
    assertThrows(
      () => form8889Pdf.instances?.({ forms }, base.filer, altered),
      Error,
    );
  }
});
