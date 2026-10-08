import { assertEquals, assertThrows } from "@std/assert";
import {
  CoverageType,
  inputSchema,
} from "../../../../nodes/intermediate/forms/form8889/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { form8889 } from "../../../mef/forms/health/f8889.ts";
import { form5329 } from "../../../mef/forms/retirement/f5329.ts";
import { form8889Pdf } from "../../../pdf/forms/health/f8889.ts";
import { form5329Pdf } from "../../../pdf/forms/retirement/f5329.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((item) =>
  item.id === "joint-two-hsa-owners"
)!;

function familyMedicareSource(medicareOwner: "T" | "S") {
  const medicareFacts = {
    eligible_hdhp_coverage_by_month: Array(12).fill(null),
    medicare_enrollment: {
      first_ineligible_month: 1,
      source_reference: `${medicareOwner} January Medicare enrollment notice`,
    },
    taxpayer_hsa_contributions: 1_200,
    hsa_december_31_value: 2_000,
  };
  const continuingFacts = {
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.Family),
    taxpayer_hsa_contributions: 6_000,
  };
  return inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Example",
      ssn: "111223333",
    },
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    allocated_family_limit: 0,
    family_allocation_source_reference:
      "2025 signed zero/full family allocation",
    ...(medicareOwner === "T" ? medicareFacts : continuingFacts),
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Example",
        ssn: "444556666",
      },
      age_55_or_older: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      last_month_rule_elected: false,
      allocated_family_limit: 0,
      family_allocation_source_reference:
        "2025 signed zero/full family allocation",
      ...(medicareOwner === "S" ? medicareFacts : continuingFacts),
    },
  });
}

function preparedReturn(medicareOwner: "T" | "S") {
  const source = familyMedicareSource(medicareOwner);
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    general: {
      ...(base.inputs.general as Record<string, unknown>),
      spouse_dob: "1982-03-10",
    },
    form8889: source,
  });
  assertEquals(result.diagnostics, []);
  return { source, pending: result.pending };
}

for (const medicareOwner of ["T", "S"] as const) {
  Deno.test(`January family Medicare excess for ${medicareOwner} reconciles both owner forms and return tax`, () => {
    const { pending } = preparedReturn(medicareOwner);
    const forms = pending.form8889.forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
    const medicareIndex = medicareOwner === "T" ? 0 : 1;
    assertEquals(forms[medicareIndex]?.print_line6, 0);
    assertEquals(forms[medicareIndex]?.print_line13_deduction, 0);
    assertEquals(forms[1 - medicareIndex]?.print_line6, 8_550);
    assertEquals(forms[1 - medicareIndex]?.print_line13_deduction, 6_000);
    assertEquals(pending.schedule1.line13_hsa_deduction, 6_000);
    assertEquals(pending.f1040.line10_adjustments, 6_000);
    const excess = pending.form5329.owner_forms as Record<string, unknown>[];
    assertEquals(excess.length, 1);
    assertEquals(excess[0]?.owner, medicareOwner);
    assertEquals(excess[0]?.print_hsa_line47, 1_200);
    assertEquals(excess[0]?.print_hsa_line49, 72);
    assertEquals(pending.schedule2.line8_form5329_tax, 72);
    assertEquals(pending.f1040.line23_other_taxes, 72);
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
      72,
    );
  });

  Deno.test(`January family Medicare excess for ${medicareOwner} rejects source, owner and return tampering`, () => {
    const { source, pending } = preparedReturn(medicareOwner);
    const forms = pending.form8889.forms as Extract<
      Parameters<typeof form8889.build>[0],
      { forms: unknown }
    >["forms"];
    const excess = pending.form5329.owner_forms as Record<string, unknown>[];
    const changedOnset = medicareOwner === "T"
      ? {
        ...pending.form8889,
        medicare_enrollment: {
          ...source.medicare_enrollment!,
          first_ineligible_month: 2,
        },
      }
      : {
        ...pending.form8889,
        spouse_hsa: {
          ...source.spouse_hsa!,
          medicare_enrollment: {
            ...source.spouse_hsa!.medicare_enrollment!,
            first_ineligible_month: 2,
          },
        },
      };
    const altered = [{
      ...pending,
      form8889: changedOnset,
    }, {
      ...pending,
      form8889: {
        ...pending.form8889,
        spouse_hsa: {
          ...source.spouse_hsa!,
          family_allocation_source_reference: "different allocation",
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
        () =>
          form8889.build({ forms }, { filer: base.filer, pending: changed }),
        Error,
      );
      assertThrows(
        () => form8889Pdf.instances?.({ forms }, base.filer, changed),
        Error,
      );
    }
  });
}
