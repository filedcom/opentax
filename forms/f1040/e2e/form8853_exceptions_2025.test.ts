import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import { form8853Pdf } from "../2025/pdf/forms/f8853.ts";
import { form8853 as native } from "../2025/mef/forms/f8853.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import {
  type ArcherDistributionLedger,
  calculateArcherLedger,
} from "../nodes/intermediate/forms/form8853/archer_distributions.ts";

const confirmations = {
  all_distributions_identified_confirmed: true as const,
  no_rollover_or_excess_contribution_withdrawal_confirmed: true as const,
  no_other_form8853_activity_confirmed: true as const,
};
function row(date: string, reference: string) {
  return {
    distribution_reference: reference,
    distribution_date: date,
    gross_amount: 2000,
    form1099sa_distribution_code: "1" as const,
    form1099sa_source_reference: "1099-SA annual statement",
    distribution_date_source_reference: `custodian ledger ${reference}`,
    unreimbursed_qualified_expenses: 500,
    qualified_expense_source_references: [`medical receipt ${reference}`],
    qualified_expense_eligibility_and_no_schedule_a_double_deduction_confirmed:
      true as const,
  };
}
export const ageLedger: ArcherDistributionLedger = {
  ...confirmations,
  source: {
    kind: "normal",
    holder_ssn: "111223333",
    holder_date_of_birth: "1960-06-15",
    holder_identity_source_reference: "holder birth and SSN record",
    distributions: [
      row("2025-06-14", "before"),
      row("2025-06-15", "on"),
      row("2025-06-16", "after"),
    ],
  },
};
export const disabilityLedger: ArcherDistributionLedger = {
  ...ageLedger,
  source: {
    ...ageLedger.source as Extract<
      ArcherDistributionLedger["source"],
      { kind: "normal" }
    >,
    holder_date_of_birth: "1985-06-15",
    disability: {
      onset_date: "2025-06-15",
      source_reference: "disability medical certification",
      unable_to_engage_in_substantial_gainful_activity_confirmed: true,
      condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
        true,
    },
  },
};
export const deathLedger: ArcherDistributionLedger = {
  ...confirmations,
  source: {
    kind: "death_transfer",
    beneficiary_kind: "nonspouse_individual",
    recipient_ssn: "111223333",
    deceased_holder_name: "Morgan Example",
    deceased_holder_ssn: "222334444",
    death_date: "2025-04-15",
    death_source_reference: "holder death certificate",
    beneficiary_source_reference: "nonspouse beneficiary designation",
    fair_market_value_at_death: 6000,
    valuation_source_reference: "custodian date-of-death valuation",
    expenses: [{
      amount: 2000,
      incurred_date: "2025-04-10",
      paid_date: "2025-05-20",
      source_reference: "deceased medical bill and beneficiary receipt",
      qualified_unreimbursed_confirmed: true,
    }],
    no_postdeath_earnings_in_transfer_confirmed: true,
    no_other_inherited_or_owned_msa_confirmed: true,
  },
};
export const estateLedger: ArcherDistributionLedger = {
  ...deathLedger,
  source: {
    ...deathLedger.source as Extract<
      ArcherDistributionLedger["source"],
      { kind: "death_transfer" }
    >,
    beneficiary_kind: "estate_final_return",
    deceased_holder_name: "Alex Example",
    deceased_holder_ssn: "111223333",
    expenses: [],
  },
};
export const fullyExceptedAgeLedger: ArcherDistributionLedger = {
  ...ageLedger,
  source: {
    ...ageLedger.source as Extract<
      ArcherDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("2025-06-16", "after")],
  },
};
export function fixture(ledger: ArcherDistributionLedger) {
  const source = ledger.source;
  return {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: source.kind === "normal"
        ? source.holder_date_of_birth
        : "1985-06-15",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      ...(source.kind === "death_transfer" &&
          source.beneficiary_kind === "estate_final_return"
        ? { taxpayer_deceased: true, taxpayer_death_date: source.death_date }
        : {}),
    },
    ...(source.kind === "normal" && source.holder_date_of_birth <= "1960-12-31"
      ? {
        schedule1a: {
          senior_zero_exclusions_review: {
            no_section933_puerto_rico_excluded_income: true,
            section933_review_source_reference:
              "synthetic domestic income review",
            no_form2555_filed: true,
            form2555_review_source_reference:
              "synthetic no foreign exclusion review",
            no_form4563_filed: true,
            form4563_review_source_reference:
              "synthetic no possessions exclusion review",
          },
        },
      }
      : {}),
    form8853: { archer_distribution_ledger: ledger },
  };
}

Deno.test("Form8853 sourced mixed age65 and disability distributions retain on-event taxable penalty", () => {
  for (const ledger of [ageLedger, disabilityLedger]) {
    assertEquals(calculateArcherLedger(ledger), {
      line6a: 6000,
      line6b: 0,
      line6c: 6000,
      line7: 1500,
      line8: 4500,
      line9a: true,
      line9b: 600,
      exceptedTaxable: 1500,
      deathTransfer: false,
    });
  }
  const allExcepted = structuredClone(ageLedger);
  if (allExcepted.source.kind !== "normal") throw new Error("fixture kind");
  allExcepted.source.distributions = [row("2025-06-16", "after")];
  assertEquals(calculateArcherLedger(allExcepted).line9b, 0);
  allExcepted.source.distributions[0].unreimbursed_qualified_expenses = 2000;
  assertEquals(calculateArcherLedger(allExcepted).line9a, false);
});

Deno.test("Form8853 source evidence rejects missing, invalid, duplicate, and death timing facts", () => {
  const duplicate = structuredClone(ageLedger);
  if (duplicate.source.kind !== "normal") throw new Error("fixture kind");
  duplicate.source.distributions.push(duplicate.source.distributions[0]);
  assertThrows(() => calculateArcherLedger(duplicate), Error, "duplicate");
  const missing = structuredClone(disabilityLedger);
  if (missing.source.kind !== "normal") throw new Error("fixture kind");
  missing.source.disability = undefined;
  missing.source.distributions[0].form1099sa_distribution_code = "3";
  assertThrows(
    () => calculateArcherLedger(missing),
    Error,
    "sourced disability facts",
  );
  const invalid = structuredClone(deathLedger);
  if (invalid.source.kind !== "death_transfer") throw new Error("fixture kind");
  invalid.source.expenses[0].paid_date = "2026-04-16";
  assertThrows(() => calculateArcherLedger(invalid), Error, "within one year");
  invalid.source.expenses[0].paid_date = "2025-05-20";
  invalid.source.expenses[0].incurred_date = "2025-04-15";
  assertThrows(
    () => calculateArcherLedger(invalid),
    Error,
    "incurred before death",
  );
});

for (
  const [name, ledger, income, penalty] of [
    ["mixed age65", ageLedger, 4500, 600],
    ["mixed disability", disabilityLedger, 4500, 600],
    ["nonspouse death transfer", deathLedger, 4000, 0],
    ["fully excepted age65", fullyExceptedAgeLedger, 1500, 0],
  ] as const
) {
  Deno.test(`Form8853 ${name}: public source through full1040, native XSD and PDF`, async () => {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      fixture(ledger),
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.form8853?.archer_distribution_ledger, ledger);
    assertEquals(result.pending.schedule1?.line8e_archer_msa_dist, income);
    assertEquals(
      result.pending.schedule2?.line17e_archer_msa_tax ?? 0,
      penalty,
    );
    assertEquals(result.pending.f1040?.line8_additional_income, income);
    assertEquals(result.pending.f1040?.line23_other_taxes ?? 0, penalty);
    const filer = extractFilerIdentity(result.pending.f1040);
    assertExists(filer);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertStringIncludes(
      xml,
      "<ArcherMSADistriMeetTaxExcInd>X</ArcherMSADistriMeetTaxExcInd>",
    );
    if (ledger.source.kind === "death_transfer") {
      assertStringIncludes(xml, "<MSAHolderDeathInd>X</MSAHolderDeathInd>");
    }
    const xsd = new URL(
      "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeTextFile(xmlPath, xml);
      const validation = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, xmlPath],
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
      await Deno.writeFile(pdfPath, await buildPdfBytes(result.pending, filer));
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", pdfPath, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(text.code, 0, new TextDecoder().decode(text.stderr));
      const printed = new TextDecoder().decode(text.stdout);
      assertEquals(new RegExp(`\\b9b\\s+${penalty}\\b`).test(printed), true);
      if (ledger.source.kind === "death_transfer") {
        assertStringIncludes(printed, "Death of Archer MSA account holder");
      }
    } finally {
      await Deno.remove(xmlPath);
      await Deno.remove(pdfPath);
    }
    const projected = form8853Pdf.instances?.(
      result.pending.form8853!,
      filer,
      result.pending,
    ) ?? [];
    assertEquals(projected[0].line9a_archer_msa_exception, true);
    const wrongOwner = structuredClone(ledger);
    if (wrongOwner.source.kind === "normal") {
      wrongOwner.source.holder_ssn = "999887777";
    } else wrongOwner.source.recipient_ssn = "999887777";
    assertThrows(
      () =>
        native.build({ archer_distribution_ledger: wrongOwner }, {
          filer,
          pending: result.pending,
        }),
      Error,
      "match return taxpayer SSN",
    );
    assertThrows(
      () =>
        native.build({
          ...result.pending.form8853,
          archer_msa_exception: false,
        }, { filer, pending: result.pending }),
      Error,
      "source ledger conflicts",
    );
  });
}

Deno.test("Form8853 estate FMV source calculates on final return; full packet retains deceased1040 blocker", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture(estateLedger),
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8e_archer_msa_dist, 6000);
  assertEquals(result.pending.schedule2?.line17e_archer_msa_tax ?? 0, 0);
  const filer = extractFilerIdentity(result.pending.f1040);
  assertExists(filer);
  const xml = native.build(result.pending.form8853!, {
    filer,
    pending: result.pending,
  });
  assertStringIncludes(xml, "<MSAHolderDeathInd>X</MSAHolderDeathInd>");
  assertStringIncludes(
    xml,
    "<TaxableArcherMSADistriAmt>6000</TaxableArcherMSADistriAmt>",
  );
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "reviewed signer, representative, and refund facts",
  );
  assertThrows(
    () =>
      native.build(result.pending.form8853!, {
        filer: { ...filer, deceased: false },
        pending: result.pending,
      }),
    Error,
    "matching deceased final-return header",
  );
  await assertRejects(
    () => buildPdfBytes(result.pending, filer),
    Error,
    "reviewed signer, representative, and refund facts",
  );
  assertEquals(
    form8853Pdf.instances?.(result.pending.form8853!, filer, result.pending)
      ?.[0].death_transfer,
    true,
  );
});
