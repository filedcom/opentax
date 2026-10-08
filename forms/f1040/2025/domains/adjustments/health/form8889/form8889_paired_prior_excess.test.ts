import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import type { MefBuildContext } from "../../../../mef/form-descriptor.ts";
import {
  CoverageType,
  form8889 as form8889Node,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import {
  calculateOwnerForms,
  inputSchema as form5329InputSchema,
} from "../../../../../nodes/intermediate/forms/taxes/retirement/form5329/index.ts";
import { form8889 } from "../../../../mef/forms/adjustments/health/f8889.ts";
import { form5329 } from "../../../../mef/forms/taxes/retirement/f5329.ts";
import { form8889Pdf } from "../../../../pdf/forms/adjustments/health/f8889.ts";
import { form5329Pdf } from "../../../../pdf/forms/taxes/retirement/f5329.ts";
import { z } from "zod";

type PairedOwnerForms = Extract<
  Parameters<typeof form8889.build>[0],
  { forms: unknown }
>["forms"];

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.MarriedFilingJointly,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    ssn: "987654321",
    firstName: "Sam",
    lastName: "Taxpayer",
    nameControl: "TAXP",
  },
};

function pairedPriorExcessCase(bothOwners = false) {
  const source = inputSchema.parse({
    beneficiary_identity: {
      owner: "T",
      name: "Alex Taxpayer",
      ssn: "123456789",
    },
    eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
    age_55_or_older: false,
    married_at_year_end: true,
    spouse_has_separate_hsa: true,
    last_month_rule_elected: false,
    taxpayer_hsa_contributions: 2_000,
    hsa_december_31_value: 10_000,
    prior_year_hsa_excess: {
      tax_year: 2024,
      filed_form5329_reference: "Alex filed 2024 Form 5329 page 3",
      filed_return_reviewed: true,
      owner_ssn: "123456789",
      form5329_line48: 3_000,
      form5329_line49: 180,
    },
    spouse_hsa: {
      beneficiary_identity: {
        owner: "S",
        name: "Sam Taxpayer",
        ssn: "987654321",
      },
      eligible_hdhp_coverage_by_month: Array(12).fill(CoverageType.SelfOnly),
      age_55_or_older: false,
      married_at_year_end: true,
      spouse_has_separate_hsa: true,
      last_month_rule_elected: false,
      taxpayer_hsa_contributions: 1_000,
      ...(bothOwners
        ? {
          hsa_december_31_value: 8_000,
          prior_year_hsa_excess: {
            tax_year: 2024,
            filed_form5329_reference: "Sam filed 2024 Form 5329 page 3",
            filed_return_reviewed: true,
            owner_ssn: "987654321",
            form5329_line48: 4_000,
            form5329_line49: 240,
          },
        }
        : {}),
    },
  });
  const outputs = form8889Node.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  ).outputs;
  const forms = outputs.find((row) => row.nodeType === "form8889")?.fields
    .forms as PairedOwnerForms;
  const ownerEntries = outputs.filter((row) => row.nodeType === "form5329")
    .flatMap((row) => row.fields.owner_entries as unknown[]);
  const ownerForms = calculateOwnerForms({
    owner_entries: ownerEntries as z.infer<
      typeof form5329InputSchema
    >["owner_entries"],
  }).forms;
  const pending = {
    form8889: { ...source, forms },
    form5329: { owner_entries: ownerEntries, owner_forms: ownerForms },
    schedule1: {
      line13_hsa_deduction: bothOwners ? 8_600 : 5_300,
      line26_total_adjustments: bothOwners ? 8_600 : 5_300,
    },
    schedule2: { line8_form5329_tax: bothOwners ? 84 : 42 },
    f1040: {
      line10_adjustments: bothOwners ? 8_600 : 5_300,
      line23_other_taxes: bothOwners ? 84 : 42,
    },
  };
  const context: MefBuildContext = { filer, pending };
  return { source, forms, pending, context };
}

Deno.test("paired owner prior HSA excess reaches Form 8889 and owner Form 5329 native/PDF", () => {
  const { forms, pending, context } = pairedPriorExcessCase();
  assertEquals(forms[0]?.print_line13_deduction, 4_300);
  assertEquals(forms[1]?.print_line13_deduction, 1_000);
  assertEquals(pending.form5329.owner_forms[0]?.print_hsa_line48, 700);
  assertEquals(pending.form5329.owner_forms[0]?.print_hsa_line49, 42);
  assertEquals(form8889.build({ forms }, context).length, 2);
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertEquals(form5329.build(pending.form5329 as never, context).length, 1);
  assertEquals(
    form5329Pdf.instances?.(pending.form5329, filer, pending)?.length,
    1,
  );
});

Deno.test("both paired HSA owners carry independently reviewed 2024 excess through native and PDF", () => {
  const { forms, pending, context } = pairedPriorExcessCase(true);
  assertEquals(pending.form5329.owner_forms.map((form) => form.owner), [
    "T",
    "S",
  ]);
  assertEquals(
    pending.form5329.owner_forms.map((form) => form.print_hsa_line48),
    [700, 700],
  );
  assertEquals(
    pending.form5329.owner_forms.map((form) => form.print_hsa_line49),
    [42, 42],
  );
  assertEquals(form8889.build({ forms }, context).length, 2);
  assertEquals(form8889Pdf.instances?.({ forms }, filer, pending)?.length, 2);
  assertEquals(form5329.build(pending.form5329 as never, context).length, 2);
  assertEquals(
    form5329Pdf.instances?.(pending.form5329, filer, pending)?.length,
    2,
  );

  const tamperedSpouse = {
    ...pending,
    form8889: {
      ...pending.form8889,
      spouse_hsa: {
        ...pending.form8889.spouse_hsa!,
        prior_year_hsa_excess: {
          ...pending.form8889.spouse_hsa!.prior_year_hsa_excess!,
          owner_ssn: filer.primarySSN,
        },
      },
    },
  };
  assertThrows(() =>
    form8889.build({ forms }, { ...context, pending: tamperedSpouse })
  );
  assertThrows(() => form8889Pdf.instances?.({ forms }, filer, tamperedSpouse));
  const duplicatedReference = {
    ...pending,
    form8889: {
      ...pending.form8889,
      spouse_hsa: {
        ...pending.form8889.spouse_hsa!,
        prior_year_hsa_excess: {
          ...pending.form8889.spouse_hsa!.prior_year_hsa_excess!,
          filed_form5329_reference:
            pending.form8889.prior_year_hsa_excess!.filed_form5329_reference,
        },
      },
    },
  };
  assertThrows(() =>
    form8889.build({ forms }, { ...context, pending: duplicatedReference })
  );
  assertThrows(() =>
    form8889Pdf.instances?.({ forms }, filer, duplicatedReference)
  );
  assertThrows(
    () =>
      form5329.build(pending.form5329 as never, {
        ...context,
        pending: { ...pending, schedule2: { line8_form5329_tax: 42 } },
      }),
    Error,
    "Schedule 2 line 8",
  );
  assertThrows(
    () =>
      form5329Pdf.instances?.(pending.form5329, filer, {
        ...pending,
        schedule2: { line8_form5329_tax: 42 },
      }),
    Error,
    "Schedule 2 line 8",
  );
});

Deno.test("paired prior excess rejects swapped 2024 owner and changed Form 5329 tax", () => {
  const { source, forms, pending, context } = pairedPriorExcessCase();
  assertThrows(
    () =>
      form8889.build({ forms }, {
        ...context,
        pending: {
          ...pending,
          form8889: {
            ...source,
            prior_year_hsa_excess: {
              ...source.prior_year_hsa_excess!,
              owner_ssn: "987654321",
            },
            forms,
          },
        },
      }),
  );
  assertThrows(
    () =>
      form8889Pdf.instances?.({ forms }, filer, {
        ...pending,
        schedule2: { line8_form5329_tax: 41 },
      }),
    Error,
    "paired owner totals differ from the filed return",
  );
  assertThrows(
    () =>
      form5329Pdf.instances?.(
        {
          ...pending.form5329,
          owner_forms: [{
            ...pending.form5329.owner_forms[0],
            print_hsa_line49: 41,
          }],
        },
        filer,
        pending,
      ),
  );
});
