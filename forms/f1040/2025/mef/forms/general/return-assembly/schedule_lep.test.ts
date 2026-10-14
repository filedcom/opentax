import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  inputSchema,
  LanguagePreferenceCode,
} from "../../../../../nodes/inputs/general/filing/schedule_lep/index.ts";
import { buildScheduleLep } from "./schedule_lep.ts";
import { scheduleLepPdf } from "../../../../pdf/forms/general/return-assembly/schedule_lep.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../registry.ts";
import { buildPending } from "../../../execution/pending.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "Ada Lovelace",
  nameControl: "LOVE",
  firstName: "Ada",
  lastName: "Lovelace",
  address: { line1: "1 Main St", city: "New York", state: "NY", zip: "10001" },
  filingStatus: FilingStatus.MarriedFilingJointly,
  spouse: {
    ssn: "987654321",
    firstName: "Grace",
    lastName: "Hopper",
    nameControl: "HOPP",
  },
};

Deno.test("Schedule LEP emits separate taxpayer and spouse requests in TY2025 schema order", () => {
  const source = {
    requests: [
      {
        person: "taxpayer" as const,
        language_preference_code: LanguagePreferenceCode.Spanish,
        request_confirmed_by_person: true as const,
        request_record_reference: "Ada 2025 language request",
      },
      {
        person: "spouse" as const,
        language_preference_code: LanguagePreferenceCode.French,
        request_confirmed_by_person: true as const,
        request_record_reference: "Grace 2025 language request",
      },
    ],
  };
  const xml = buildScheduleLep(source, { filer });
  assertEquals(xml, [
    "<IRS1040ScheduleLEP><PersonNm>Ada Lovelace</PersonNm><SSN>123456789</SSN><LanguagePreferenceCd>001</LanguagePreferenceCd></IRS1040ScheduleLEP>",
    "<IRS1040ScheduleLEP><PersonNm>Grace Hopper</PersonNm><SSN>987654321</SSN><LanguagePreferenceCd>011</LanguagePreferenceCd></IRS1040ScheduleLEP>",
  ]);
  const pdf = scheduleLepPdf.instances?.(source, filer);
  assertEquals(pdf, [
    { name: "Ada Lovelace", ssn: "123456789", selected_code: "001" },
    { name: "Grace Hopper", ssn: "987654321", selected_code: "011" },
  ]);
  assertEquals(scheduleLepPdf.pageIndices?.({}), [0]);
  assertEquals(
    scheduleLepPdf.fields.filter((field) => field.kind === "checkboxWhen")
      .map((field) => field.whenValue),
    Object.values(LanguagePreferenceCode),
  );
  const executed = execute(buildExecutionPlan(registry), registry, {
    schedule_lep: source,
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    executed.diagnostics.filter((entry) =>
      ["start", "schedule_lep"].includes(entry.nodeType)
    ),
    [],
  );
  assertEquals(buildPending(executed.pending).schedule_lep, source);
});

Deno.test("Schedule LEP rejects duplicate persons, invalid codes, and spouse on a nonjoint return", () => {
  assertEquals(
    inputSchema.safeParse({
      requests: [
        {
          person: "taxpayer",
          language_preference_code: "001",
          request_confirmed_by_person: true,
          request_record_reference: "request 1",
        },
        {
          person: "taxpayer",
          language_preference_code: "002",
          request_confirmed_by_person: true,
          request_record_reference: "request 2",
        },
      ],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [
        {
          person: "taxpayer",
          language_preference_code: "999",
          request_confirmed_by_person: true,
          request_record_reference: "request",
        },
      ],
    }).success,
    false,
  );
  assertThrows(
    () =>
      buildScheduleLep({
        requests: [
          {
            person: "spouse",
            language_preference_code: LanguagePreferenceCode.French,
            request_confirmed_by_person: true,
            request_record_reference: "Grace request",
          },
        ],
      }, { filer: { ...filer, filingStatus: FilingStatus.Single } }),
    Error,
    "joint Form 1040",
  );
  assertThrows(
    () =>
      buildScheduleLep({
        requests: [
          {
            person: "taxpayer",
            language_preference_code: LanguagePreferenceCode.French,
            request_confirmed_by_person: true,
            request_record_reference: "Ada request",
          },
        ],
      }, {}),
    Error,
    "filed Form 1040 identity",
  );
});

Deno.test("Schedule LEP cancellation requires a confirmed request and prior election record", () => {
  assertEquals(
    inputSchema.safeParse({
      requests: [{
        person: "taxpayer",
        language_preference_code: LanguagePreferenceCode.Cancel,
        request_confirmed_by_person: true,
        request_record_reference: "Ada cancellation request",
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{
        person: "taxpayer",
        language_preference_code: LanguagePreferenceCode.Cancel,
        request_confirmed_by_person: true,
        request_record_reference: "Ada cancellation request",
        prior_election_review: {
          prior_tax_year: 2024,
          person_ssn: "123456789",
          language_preference_code: LanguagePreferenceCode.Spanish,
          record_kind: "filed_schedule_lep",
          record_reference: "Ada filed 2024 Schedule LEP",
          reviewed_by: "preparer-1",
          reviewed_on: "2026-01-15",
        },
      }],
    }).success,
    true,
  );
  const reviewed = {
    person: "taxpayer" as const,
    language_preference_code: LanguagePreferenceCode.Cancel,
    request_confirmed_by_person: true as const,
    request_record_reference: "Ada cancellation request",
    prior_election_review: {
      prior_tax_year: 2024,
      person_ssn: "123456789",
      language_preference_code: LanguagePreferenceCode.Spanish,
      record_kind: "filed_schedule_lep" as const,
      record_reference: "Ada filed 2024 Schedule LEP",
      reviewed_by: "preparer-1",
      reviewed_on: "2026-01-15",
    },
  };
  assertThrows(
    () => buildScheduleLep({ requests: [reviewed] }, { filer }),
    Error,
    "authenticated prior IRS election",
  );
  assertThrows(
    () => scheduleLepPdf.instances?.({ requests: [reviewed] }, filer),
    Error,
    "authenticated prior IRS election",
  );
  const mismatched = {
    person: "taxpayer" as const,
    language_preference_code: LanguagePreferenceCode.Cancel,
    request_confirmed_by_person: true as const,
    request_record_reference: "Ada cancellation request",
    prior_election_review: {
      prior_tax_year: 2024,
      person_ssn: "987654321",
      language_preference_code: LanguagePreferenceCode.Spanish,
      record_kind: "filed_schedule_lep" as const,
      record_reference: "Grace filed 2024 Schedule LEP",
      reviewed_by: "preparer-1",
      reviewed_on: "2026-01-15",
    },
  };
  assertThrows(
    () => buildScheduleLep({ requests: [mismatched] }, { filer }),
    Error,
    "prior election owner SSN",
  );
  assertThrows(
    () => scheduleLepPdf.instances?.({ requests: [mismatched] }, filer),
    Error,
    "prior election owner SSN",
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{
        ...mismatched,
        prior_election_review: {
          ...mismatched.prior_election_review,
          prior_tax_year: 2025,
        },
      }],
    }).success,
    false,
  );
  assertEquals(
    inputSchema.safeParse({
      requests: [{
        person: "taxpayer",
        language_preference_code: LanguagePreferenceCode.Spanish,
      }],
    }).success,
    false,
  );
});
