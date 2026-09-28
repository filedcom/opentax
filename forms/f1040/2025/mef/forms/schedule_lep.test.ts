import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus, type FilerIdentity } from "../../../mef/header.ts";
import {
  inputSchema,
  LanguagePreferenceCode,
} from "../../../nodes/inputs/schedule_lep/index.ts";
import { buildScheduleLep } from "./schedule_lep.ts";
import { scheduleLepPdf } from "../../pdf/forms/schedule_lep.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { buildPending } from "../pending.ts";

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
      { person: "taxpayer" as const, language_preference_code: LanguagePreferenceCode.Spanish },
      { person: "spouse" as const, language_preference_code: LanguagePreferenceCode.Cancel },
    ],
  };
  const xml = buildScheduleLep(source, { filer });
  assertEquals(xml, [
    "<IRS1040ScheduleLEP><PersonNm>Ada Lovelace</PersonNm><SSN>123456789</SSN><LanguagePreferenceCd>001</LanguagePreferenceCd></IRS1040ScheduleLEP>",
    "<IRS1040ScheduleLEP><PersonNm>Grace Hopper</PersonNm><SSN>987654321</SSN><LanguagePreferenceCd>000</LanguagePreferenceCd></IRS1040ScheduleLEP>",
  ]);
  const pdf = scheduleLepPdf.instances?.(source, filer);
  assertEquals(pdf, [
    { name: "Ada Lovelace", ssn: "123456789", selected_code: "001" },
    { name: "Grace Hopper", ssn: "987654321", selected_code: "000" },
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
  assertEquals(executed.diagnostics.filter((entry) =>
    ["start", "schedule_lep"].includes(entry.nodeType)
  ), []);
  assertEquals(buildPending(executed.pending).schedule_lep, source);
});

Deno.test("Schedule LEP rejects duplicate persons, invalid codes, and spouse on a nonjoint return", () => {
  assertEquals(inputSchema.safeParse({ requests: [
    { person: "taxpayer", language_preference_code: "001" },
    { person: "taxpayer", language_preference_code: "002" },
  ] }).success, false);
  assertEquals(inputSchema.safeParse({ requests: [
    { person: "taxpayer", language_preference_code: "999" },
  ] }).success, false);
  assertThrows(() => buildScheduleLep({ requests: [
    { person: "spouse", language_preference_code: LanguagePreferenceCode.French },
  ] }, { filer: { ...filer, filingStatus: FilingStatus.Single } }), Error,
  "joint Form 1040");
  assertThrows(() => buildScheduleLep({ requests: [
    { person: "taxpayer", language_preference_code: LanguagePreferenceCode.French },
  ] }, {}), Error, "filed Form 1040 identity");
});
