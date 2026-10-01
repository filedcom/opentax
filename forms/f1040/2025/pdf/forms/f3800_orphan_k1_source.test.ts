import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { prepareForm3800DocumentParts } from "../../mef/forms/f3800.ts";
import { testFiler } from "../../mef/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
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
