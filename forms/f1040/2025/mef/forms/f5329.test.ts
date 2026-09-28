import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { form5329 } from "./f5329.ts";
import { TS } from "../../../nodes/types.ts";
import {
  calculateOwnerForms,
  ownerEntrySchema,
} from "../../../nodes/intermediate/forms/form5329/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

Deno.test("Form 5329 emits distinct owner documents and reconciles combined Schedule 2 tax", () => {
  const owner_entries = [
    { owner: TS.T, early_distribution: 5_000 },
    {
      owner: TS.S,
      hsa_part_vii: {
        line42_prior_excess: 0,
        line43_unused_contribution_room: 0,
        line44_taxable_distributions: 0,
        line47_current_year_excess: 1_000,
        december_31_value: 4_000,
      },
    },
  ];
  const owner_forms = calculateOwnerForms({ owner_entries }).forms;
  const documents = form5329.build({ owner_entries, owner_forms }, {
    filer: {
      ...filer,
      spouse: {
        firstName: "Alex",
        lastName: "Taxpayer",
        ssn: "987654321",
        nameControl: "TAXP",
      },
    },
    pending: {
      schedule2: { line8_form5329_tax: 560 },
      form8889: { forms: [{
        owner: "spouse",
        print_line2_taxpayer_contributions: 1_000,
        print_line12: 0,
        print_line16_taxable: 0,
      }] },
    },
  });
  assertEquals(documents.length, 2);
  assertStringIncludes(documents[0], "<SSN>123456789</SSN>");
  assertStringIncludes(documents[1], "<SSN>987654321</SSN>");
  assertThrows(
    () => form5329.build({ owner_entries, owner_forms }, {
      filer,
      pending: {
        schedule2: { line8_form5329_tax: 500 },
        form8889: { forms: [{
          owner: "spouse",
          print_line2_taxpayer_contributions: 1_000,
          print_line12: 0,
          print_line16_taxable: 0,
        }] },
      },
    }),
    Error,
    "Schedule 2 line 8",
  );
});

const filer: FilerIdentity = {
  fullName: "Test Taxpayer",
  primarySSN: "123456789",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TAXP",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

function buildOwner(
  fields: Record<string, unknown>,
  context: MefBuildContext,
): string {
  const owner_entries = [ownerEntrySchema.parse({ owner: TS.T, ...fields })];
  const calculated = calculateOwnerForms({ owner_entries });
  const hsa = owner_entries[0]?.hsa_part_vii;
  const owner = owner_entries[0]?.owner === TS.S ? "spouse" : "primary";
  const form8889 = hsa
    ? { forms: [{
      owner,
      print_line2_taxpayer_contributions: 0,
      print_line12: hsa.line43_unused_contribution_room,
      print_line16_taxable: hsa.line44_taxable_distributions,
    }] }
    : undefined;
  const pending = {
    ...context.pending,
    schedule2: { line8_form5329_tax: calculated.total },
    ...(form8889 ? { form8889 } : {}),
  };
  return form5329.build(
    { owner_entries, owner_forms: calculated.forms },
    { ...context, pending },
  )[0] ?? "";
}

Deno.test("Form 5329 absent input emits no document", () => {
  assertEquals(form5329.build({}, { filer }), []);
});

Deno.test("Form 5329 early distribution fills Parts I lines 1, 3, and 4", () => {
  const xml = buildOwner({ early_distribution: 10_000 }, { filer });
  assertStringIncludes(xml, "<PersonNm>Test Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(
    xml,
    "<EarlyDistributionsAmt>10000</EarlyDistributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<EarlyDistriSubjectToTaxAmt>10000</EarlyDistriSubjectToTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<IRAEarlyDistributionsTaxAmt>1000</IRAEarlyDistributionsTaxAmt>",
  );
});

Deno.test("Form 5329 sums regular and two-year SIMPLE IRA tax at their actual rates", () => {
  const xml = buildOwner({
    early_distribution: [10_000, 5_000],
    simple_ira_early_distribution: 4_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<EarlyDistributionsAmt>19000</EarlyDistributionsAmt>",
  );
  assertStringIncludes(
    xml,
    "<IRAEarlyDistributionsTaxAmt>2500</IRAEarlyDistributionsTaxAmt>",
  );
});

Deno.test("Form 5329 exception needs its IRS code", () => {
  assertThrows(
    () =>
      buildOwner({
        early_distribution: 10_000,
        early_distribution_exception: 3_000,
      }, { filer }),
    Error,
    "exception code",
  );
  const xml = buildOwner({
    early_distribution: 10_000,
    early_distribution_exception: 3_000,
    early_distribution_exception_code: "01",
  }, { filer });
  assertStringIncludes(
    xml,
    "<EarlyDistriExceptionReasonCd>01</EarlyDistriExceptionReasonCd>",
  );
  assertStringIncludes(
    xml,
    "<EarlyDistriNotSubjectToTaxAmt>3000</EarlyDistriNotSubjectToTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<IRAEarlyDistributionsTaxAmt>700</IRAEarlyDistributionsTaxAmt>",
  );
});

Deno.test("Form 5329 education distribution fills Part II lines 5-8", () => {
  const xml = buildOwner({
    esa_able_distribution: 5_000,
    esa_able_exception: 2_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<EducAcctDistributionAmt>5000</EducAcctDistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<EducAcctDistriNotSubjToTaxAmt>2000</EducAcctDistriNotSubjToTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<EducAcctDistriSubjectToTaxAmt>3000</EducAcctDistriSubjectToTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<EducIRADistributionsTaxAmt>300</EducIRADistributionsTaxAmt>",
  );
});

Deno.test("Form 5329 excess-contribution lines use balance-capped tax", () => {
  const xml = buildOwner({
    excess_traditional_ira: 2_000,
    traditional_ira_value: 1_000,
    excess_roth_ira: 500,
    roth_ira_value: 2_000,
    excess_coverdell_esa: 400,
    coverdell_esa_value: 1_000,
    excess_archer_msa: 300,
    archer_msa_value: 1_000,
    hsa_part_vii: {
      line42_prior_excess: 0,
      line43_unused_contribution_room: 0,
      line44_taxable_distributions: 0,
      line47_current_year_excess: 600,
      december_31_value: 1_000,
    },
    excess_able: 200,
    able_value: 1_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<IRAExcessContribTaxAmt>60</IRAExcessContribTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<RothIRAExcessContribTaxAmt>30</RothIRAExcessContribTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<EducIRAExcessContribTaxAmt>24</EducIRAExcessContribTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<MSAExcessContribTaxAmt>18</MSAExcessContribTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSAExcessContribTaxAmt>36</HSAExcessContribTaxAmt>",
  );
  assertStringIncludes(
    xml,
    "<ABLEExcessContribTaxAmt>12</ABLEExcessContribTaxAmt>",
  );
});

Deno.test("Form 5329 will not invent a required account balance", () => {
  assertThrows(
    () =>
      buildOwner({
        hsa_part_vii: {
          line42_prior_excess: 0,
          line43_unused_contribution_room: 0,
          line44_taxable_distributions: 0,
          line47_current_year_excess: 500,
        },
      }, { filer }),
    Error,
    "december_31_value",
  );
});

Deno.test("Form 5329 MeF rejects obsolete flat HSA excess keys", () => {
  assertThrows(
    () => form5329.build(
      { excess_hsa: 500, hsa_value: 2_000 } as unknown as Parameters<
        typeof form5329.build
      >[0],
      { filer },
    ),
    Error,
    "requires owner entries",
  );
});

Deno.test("Form 5329 MeF carries prior-year HSA excess after line 43 and line 44 reductions", () => {
  const xml = buildOwner({
    hsa_part_vii: {
      line42_prior_excess: 2_000,
      line43_unused_contribution_room: 500,
      line44_taxable_distributions: 300,
      line47_current_year_excess: 200,
      december_31_value: 5_000,
    },
  }, { filer });
  assertStringIncludes(
    xml,
    "<HSAExcessContriTotalAmt>1400</HSAExcessContriTotalAmt>",
  );
  assertStringIncludes(
    xml,
    "<HSAExcessContribTaxAmt>84</HSAExcessContribTaxAmt>",
  );
});

Deno.test("Form 5329 for a spouse uses spouse identity, never primary identity", () => {
  const xml = buildOwner({ early_distribution: 5_000, owner: TS.S }, {
    filer: {
      ...filer,
      spouse: {
        firstName: "Alex",
        lastName: "Taxpayer",
        ssn: "987654321",
        nameControl: "TAXP",
      },
    },
  });
  assertStringIncludes(xml, "<PersonNm>Alex Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>987654321</SSN>");
  assertEquals(xml.includes("<SSN>123456789</SSN>"), false);
});

Deno.test("Form 5329 emits taxpayer and spouse amounts as separate documents", () => {
  const owner_entries = [
    { owner: TS.T, early_distribution: 5_000 },
    { owner: TS.S, early_distribution: 3_000 },
  ];
  const xml = form5329.build({
    owner_entries,
    owner_forms: calculateOwnerForms({ owner_entries }).forms,
  }, {
    filer: {
      ...filer,
      spouse: {
        firstName: "Alex",
        lastName: "Taxpayer",
        ssn: "987654321",
        nameControl: "TAXP",
      },
    },
    pending: { schedule2: { line8_form5329_tax: 800 } },
  });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[0], "<SSN>123456789</SSN>");
  assertStringIncludes(xml[1], "<SSN>987654321</SSN>");
});
