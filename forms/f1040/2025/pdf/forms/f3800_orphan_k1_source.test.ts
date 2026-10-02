import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { prepareForm3800DocumentParts } from "../../mef/forms/f3800.ts";
import { buildIRS3800Document } from "../../mef/forms/f3800_document.ts";
import { testFiler } from "../../mef/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartVFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";

const entry = {
  source_type: "partnership" as const,
  source_ein: "123456789",
  source_document_reference: "2025 partnership K-1",
  credit_amount: 1_250,
  subject_to_passive_activity_limit: false,
};
const f3800 = {
  f8820_k1_credit_entries: [entry],
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 1_250,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 1_250,
};
const k1 = {
  partnership_name: "Clinical partnership",
  partnership_ein: "123456789",
  source_document_reference: "2025 partnership K-1",
  box15_code_z_orphan_drug_credit: 1_250,
  orphan_drug_credit_subject_to_passive_activity_limit: false,
};
const pending = {
  f3800,
  k1_partnership: { k1_partnerships: [k1] },
  f1040: {
    line16_income_tax: 40_000,
    line20_nonrefundable_credits: 1_250,
  },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: {
    line6a_total: 1_250,
    line7_total: 1_250,
    line8_total: 1_250,
  },
};

Deno.test("Form 3800 nine-page PDF binds a direct partnership code Z credit to prepared line 1h and Form 1040", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
  });
  if (!prepared) throw new Error("Expected a prepared Form 3800 credit");
  const [fields] = form3800Pdf.instances!(
    f3800,
    testFiler(),
    pending,
    prepared,
  );
  assertEquals(fields[form3800PartIIIFields("1h").c], "123456789");
  assertEquals(fields[form3800PartIIIFields("1h").e], 1_250);
  assertEquals(fields[form3800PartIAndIIFields.line38], 1_250);
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...f3800,
          f8820_k1_credit_entries: [{ ...entry, credit_amount: 1_251 }],
        },
        testFiler(),
        pending,
        prepared,
      ),
    Error,
    "printable orphan-drug line 1h differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), {
        ...pending,
        k1_partnership: {
          k1_partnerships: [{ ...k1, box15_code_z_orphan_drug_credit: 1_251 }],
        },
      }, prepared),
    Error,
    "does not reconcile to partnership K-1",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), pending, {
        ...prepared,
        currentRows: prepared.currentRows.map((row) =>
          row.line === "1h"
            ? {
              ...row,
              metadata: { ...row.metadata, entity: { ein: "999999999" } },
            }
            : row
        ),
      }),
    Error,
    "printable orphan-drug line 1h differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 1_249 },
      }, prepared),
    Error,
    "Form 1040 line 20",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(f3800, testFiler(), {
        ...pending,
        f3800: {
          ...f3800,
          f8820_k1_credit_entries: [{ ...entry, source_type: "estate" }],
        },
      }, prepared),
    Error,
    "qualified clinical-testing and passive-activity source evidence",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...f3800,
          f8820_k1_credit_entries: [{ ...entry, source_type: "trust" }],
        },
        testFiler(),
        pending,
        prepared,
      ),
    Error,
    "qualified clinical-testing and passive-activity source evidence",
  );
});

Deno.test("Form 3800 prints separate self-earned and partnership orphan-drug sources on Part V", () => {
  const filedForm8820 = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-2025-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 10_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const mixed3800 = {
    ...f3800,
    f8820_credit: {
      credit_amount: 1_975,
      subject_to_passive_activity_limit: false,
    },
    tax_context: {
      ...f3800.tax_context,
      standardCredit: 3_225,
    },
    allowed_credit: 3_225,
  };
  const mixedPending = {
    ...pending,
    f3800: mixed3800,
    f8820: filedForm8820,
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 3_225 },
    schedule3: {
      ...pending.schedule3,
      line6a_total: 3_225,
      line7_total: 3_225,
      line8_total: 3_225,
    },
  };
  const parts = prepareForm3800DocumentParts(mixed3800, {
    pending: mixedPending,
    documentIdsByPendingKey: {
      form6251: ["IRS6251_1"],
      f8820: ["IRS8820_1"],
    },
  });
  if (!parts) throw new Error("Expected two orphan-drug sources");
  assertEquals(parts.currentRows.map((row) => row.line), ["1h"]);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentDetails.map((row) => row.credit), [1_975, 1_250]);
  const [fields] = form3800Pdf.instances!(
    mixed3800,
    testFiler(),
    mixedPending,
    parts,
  );
  assertEquals(fields[form3800PartIIIFields("1h").e], 3_225);
  assertEquals(fields[form3800PartVFields(1).e], 1_975);
  assertEquals(fields[form3800PartVFields(2).c1], "123456789");
  assertEquals(fields[form3800PartVFields(2).e], 1_250);
  assertEquals(fields[form3800PartIAndIIFields.line38], 3_225);

  for (
    const tampered of [
      {
        ...mixedPending,
        k1_partnership: {
          k1_partnerships: [{ ...k1, box15_code_z_orphan_drug_credit: 1_249 }],
        },
      },
      {
        ...mixedPending,
        f8820: {
          ...filedForm8820,
          f8820s: [{
            ...filedForm8820.f8820s[0],
            qualified_clinical_testing_expenses: 9_000,
          }],
        },
      },
      {
        ...mixedPending,
        f1040: { ...mixedPending.f1040, line20_nonrefundable_credits: 3_224 },
      },
    ]
  ) {
    assertThrows(() =>
      form3800Pdf.instances!(mixed3800, testFiler(), tampered, parts)
    );
  }
  assertThrows(() =>
    form3800Pdf.instances!(mixed3800, testFiler(), mixedPending, {
      ...parts,
      currentDetails: parts.currentDetails.map((row, index) =>
        index === 1 ? { ...row, passThroughEin: "999999999" } : row
      ),
    })
  );
});

Deno.test("Form 3800 prints two distinct partnership orphan-drug credits in line 1h and Part V", () => {
  const second = {
    ...entry,
    source_ein: "987654321",
    source_document_reference: "2025 second partnership K-1",
    credit_amount: 800,
  };
  const both = {
    ...f3800,
    f8820_k1_credit_entries: [entry, second],
    tax_context: { ...f3800.tax_context, standardCredit: 2_050 },
    allowed_credit: 2_050,
  };
  const filing = {
    ...pending,
    f3800: both,
    k1_partnership: {
      k1_partnerships: [k1, {
        ...k1,
        partnership_name: "Second clinical partnership",
        partnership_ein: second.source_ein,
        source_document_reference: second.source_document_reference,
        box15_code_z_orphan_drug_credit: second.credit_amount,
      }],
    },
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_050 },
    schedule3: {
      line6a_total: 2_050,
      line7_total: 2_050,
      line8_total: 2_050,
    },
  };
  const parts = prepareForm3800DocumentParts(both, {
    pending: filing,
    documentIdsByPendingKey: { form6251: ["IRS6251_1"] },
  });
  if (!parts) throw new Error("Expected two K-1 credit sources");
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentDetails.map((detail) => detail.credit), [
    1_250,
    800,
  ]);
  const native = buildIRS3800Document(parts);
  assertEquals(
    [...native.matchAll(/<Frm8820CYAggrgtAmtGrp/g)].length,
    2,
  );
  assertStringIncludes(
    native,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    native,
    "<PassThroughEntityEIN>987654321</PassThroughEntityEIN>",
  );
  const [fields] = form3800Pdf.instances!(
    both,
    testFiler(),
    filing,
    parts,
  );
  assertEquals(fields[form3800PartIIIFields("1h").c], entry.source_ein);
  assertEquals(fields[form3800PartIIIFields("1h").e], 2_050);
  assertEquals(fields[form3800PartVFields(1).c1], entry.source_ein);
  assertEquals(fields[form3800PartVFields(1).e], 1_250);
  assertEquals(fields[form3800PartVFields(2).c1], second.source_ein);
  assertEquals(fields[form3800PartVFields(2).e], 800);
  assertEquals(fields[form3800PartIAndIIFields.line38], 2_050);
  assertThrows(() =>
    form3800Pdf.instances!(both, testFiler(), {
      ...filing,
      k1_partnership: {
        k1_partnerships: [k1, {
          ...filing.k1_partnership.k1_partnerships[1],
          box15_code_z_orphan_drug_credit: 799,
        }],
      },
    }, parts)
  );
  assertThrows(() =>
    form3800Pdf.instances!(both, testFiler(), filing, {
      ...parts,
      currentRows: [{
        ...parts.currentRows[0],
        metadata: {
          ...parts.currentRows[0].metadata,
          entity: { ein: second.source_ein },
        },
      }],
    })
  );
  assertThrows(() =>
    form3800Pdf.instances!(both, testFiler(), {
      ...filing,
      f1040: { ...filing.f1040, line20_nonrefundable_credits: 2_049 },
    }, parts)
  );
});
