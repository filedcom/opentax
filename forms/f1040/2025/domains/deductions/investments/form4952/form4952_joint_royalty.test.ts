import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { z } from "zod";
import { FilingStatus, TSJ } from "../../../../../nodes/types.ts";
import {
  royaltyBondCases,
  royaltyBondInputs,
} from "../../../income/investments/form8815/form8815_royalty.fixture.ts";
import { inputSchema as scheduleESchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { physicalPresenceFilingSchema } from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { reconcileRoyaltyDebtReturn } from "./form4952_royalty_debt_reconciliation.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";

const primary = "111223333";
const spouse = "222334444";
const foreignSource =
  z.object({ filing_details: physicalPresenceFilingSchema }).parse(
    pdfReviewFixtures.find((row) =>
      row.id === "single-form2555-full-year-physical-presence"
    )!.inputs.form2555,
  ).filing_details;
const cases = [
  {
    id: "primary-standalone-positive",
    owner: TSJ.T,
    wages: 140000,
    foreign: 0,
    bond: false,
    paid: 500,
    dummy: 500,
    magi: 0,
    exclusion: 0,
    actual: 500,
    agi: 143500,
    tax: 14468,
  },
  {
    id: "spouse-standalone-limited",
    owner: TSJ.S,
    wages: 140000,
    foreign: 0,
    bond: false,
    paid: 6000,
    dummy: 4000,
    magi: 0,
    exclusion: 0,
    actual: 4000,
    agi: 140000,
    tax: 13698,
  },
  {
    id: "primary-bond-full",
    owner: TSJ.T,
    wages: 140000,
    foreign: 0,
    bond: true,
    paid: 7000,
    dummy: 6000,
    magi: 140000,
    exclusion: 2000,
    actual: 4000,
    agi: 140000,
    tax: 13698,
  },
  {
    id: "spouse-bond-phaseout",
    owner: TSJ.S,
    wages: 160000,
    foreign: 0,
    bond: true,
    paid: 7000,
    dummy: 6000,
    magi: 160000,
    exclusion: 1284,
    actual: 4716,
    agi: 160000,
    tax: 18098,
  },
  {
    id: "primary-bond-positive",
    owner: TSJ.T,
    wages: 160000,
    foreign: 0,
    bond: true,
    paid: 500,
    dummy: 500,
    magi: 165500,
    exclusion: 916,
    actual: 500,
    agi: 164584,
    tax: 19106,
  },
  {
    id: "spouse-royalty-primary-foreign",
    owner: TSJ.S,
    wages: 60000,
    foreign: 100000,
    bond: true,
    paid: 7000,
    dummy: 6000,
    magi: 160000,
    exclusion: 1284,
    actual: 4716,
    agi: 60000,
    tax: 6270,
  },
];
for (const entry of cases) {
  Deno.test(`Joint royalty debt and complete spouse interest inventory: ${entry.id}`, async () => {
    const base = royaltyBondInputs({
      ...royaltyBondCases[0],
      ...entry,
      bank: 1000,
      mixed: false,
    });
    const ownerTin = entry.owner === TSJ.T ? primary : spouse;
    const trace = {
      ...base.form4952.royalty_debt_trace,
      owner_tsj: entry.owner,
      owner_tin: ownerTin,
      royalty_source: {
        ...base.form4952.royalty_debt_trace.royalty_source,
        recipient_tin: ownerTin,
      },
    };
    const bond = {
      ...base.form8815,
      filing_status: FilingStatus.MFJ,
      eligible_students: base.form8815.eligible_students.map((row) => ({
        ...row,
        person_name: "Morgan Example",
        contribution_account: {
          ...row.contribution_account!,
          beneficiary_tin: spouse,
        },
      })),
      education_contributions: {
        ...base.form8815.education_contributions!,
        payments: base.form8815.education_contributions!.payments.map((
          row,
        ) => ({ ...row, contributor_tin: spouse })),
      },
      line9_worksheet: {
        ...base.form8815.line9_worksheet,
        other_1040_and_schedule1_income: entry.wages + 3000 - entry.dummy,
        foreign_adoption_and_puerto_rico_addbacks: entry.foreign,
        royalty_debt_special_computation: {
          debt_trace: trace,
          other_income_before_royalty_interest: entry.wages + 3000,
        },
      },
    };
    const inputs = {
      ...base,
      general: {
        ...base.general,
        filing_status: FilingStatus.MFJ,
        spouse_first_name: "Morgan",
        spouse_last_name: "Example",
        spouse_ssn: "222-33-4444",
        spouse_dob: "1981-04-10",
      },
      f1099m: base.f1099m.map((row) => ({ ...row, recipient_tin: ownerTin })),
      f1099int: base.f1099int.filter((row) =>
        entry.bond || row.source_document_reference !== "bond-copy"
      )
        .map((row) => ({
          ...row,
          recipient_tin: row.source_document_reference === "bank-1"
            ? primary
            : row.source_document_reference === "bank-2"
            ? spouse
            : entry.owner === TSJ.T
            ? spouse
            : primary,
        })),
      form4952: { ...base.form4952, royalty_debt_trace: trace },
      form8815: entry.bond ? bond : undefined,
      ...(entry.foreign
        ? {
          form2555: {
            filing_details: { ...foreignSource, foreign_wages: entry.foreign },
          },
        }
        : {}),
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const row = scheduleESchema.parse(pending.schedule_e).schedule_es[0];
    assertEquals(row.tsj, entry.owner);
    assertEquals(row.f1099m_royalty_source?.recipient_tin, ownerTin);
    assertEquals(pending.form4952.line8, entry.actual);
    assertEquals(
      pending.form4952.line4a,
      (entry.bond ? 6000 : 4000) - entry.exclusion,
    );
    assertEquals(pending.form4952.line7, entry.paid - entry.actual);
    assertEquals(
      result.carryforwards.investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(
      result.carryforwards.amt_investment_interest_excess_4952 ?? 0,
      entry.paid - entry.actual,
    );
    assertEquals(pending.schedule1.line5_schedule_e, 3000 - entry.actual);
    assertEquals(pending.f1040.line11_agi, entry.agi);
    assertEquals(pending.f1040.line24_total_tax, entry.tax);
    assertEquals(pending.f1040.line35a_refund, 20000 - entry.tax);
    if (entry.bond) {
      assertEquals(pending.form8815.line9, entry.magi);
      assertEquals(pending.form8815.line14, entry.exclusion);
    }
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    assertExists(filer.spouse);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    const root = Deno.env.get("OPENTAX_JOINT_ROYALTY_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            pending,
            filer,
            expected: entry,
            origins,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    const changes = [
      { ...pending, f1040: { ...pending.f1040, spouse_ssn: undefined } },
      { ...pending, f1040: { ...pending.f1040, spouse_ssn: primary } },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          royalty_debt_trace: { ...trace, owner_tin: "999887777" },
        },
      },
      {
        ...pending,
        form4952: {
          ...pending.form4952,
          royalty_debt_trace: {
            ...trace,
            owner_tsj: entry.owner === TSJ.T ? TSJ.S : TSJ.T,
          },
        },
      },
      {
        ...pending,
        f1099int: {
          f1099ints: inputs.f1099int.map((row, i) =>
            i ? row : { ...row, recipient_tin: "999887777" }
          ),
        },
      },
      {
        ...pending,
        schedule_e: {
          ...pending.schedule_e,
          schedule_es: [{ ...row, tsj: entry.owner === TSJ.T ? TSJ.S : TSJ.T }],
        },
      },
      {
        ...pending,
        form4952: { ...pending.form4952, line8: entry.actual + 1 },
      },
      {
        ...pending,
        f1099div: {
          f1099divs: [{
            payerName: "Dividend Fund",
            recipient_tin: spouse,
            box1a: 1000,
            isNominee: false,
            box11: false,
            investment_property_for_form4952: false,
          }],
        },
      },
    ];
    for (const altered of changes) {
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(
        () => buildPdfBytes(altered, filer, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
    for (
      const alteredFiler of [
        { ...filer, primarySSN: "999887777" },
        { ...filer, spouse: { ...filer.spouse!, ssn: "999887777" } },
      ]
    ) {
      assertThrows(
        () =>
          reconcileRoyaltyDebtReturn(pending.form4952, pending, alteredFiler),
        Error,
        "owner differs",
      );
      await assertRejects(
        () => f1040_2025.prepareReturn(pending, alteredFiler),
        Error,
      );
      await assertRejects(
        () =>
          buildPdfBytes(pending, alteredFiler, ".pdf-cache", prepared.bundle),
        Error,
      );
    }
    for (
      const badInput of [
        {
          ...inputs,
          f1099int: inputs.f1099int.map((row) => ({
            ...row,
            recipient_tin: "999887777",
          })),
        },
        {
          ...inputs,
          general: { ...inputs.general, spouse_ssn: "111-22-3333" },
        },
        {
          ...inputs,
          f1099div: [{
            payerName: "Dividend Fund",
            recipient_tin: spouse,
            box1a: 1000,
            isNominee: false,
            box11: false,
            investment_property_for_form4952: false,
          }],
        },
      ]
    ) {
      await assertRejects(async () => {
        const result = f1040_2025.executeReturn(badInput);
        if (result.diagnostics.length) {
          throw new Error("Rejected contradictory source");
        }
        const pending = normalizeAllPending(result.pending);
        await f1040_2025.prepareReturn(
          result.pending,
          extractFilerIdentity(pending.f1040),
        );
      }, Error);
    }
  });
}
