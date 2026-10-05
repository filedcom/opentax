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
  calculateMedicareLedger,
  type MedicareDistributionLedger,
} from "../nodes/intermediate/forms/form8853/medicare_distributions.ts";

const review = {
  sole_medicare_msa_holder_on_return_confirmed: true as const,
  all_distributions_identified_confirmed: true as const,
  erroneous_medicare_contributions_and_earnings_and_trustee_transfers_excluded_confirmed:
    true as const,
  no_other_form8853_activity_confirmed: true as const,
};
function row(
  reference: string,
  date = "2025-06-14",
  gross = 6000,
  medical = 2000,
) {
  return {
    distribution_reference: reference,
    account_source_reference: "Medicare MSA custodian account",
    distribution_date: date,
    distribution_date_source_reference:
      `custodian dated transaction ${reference}`,
    gross_amount: gross,
    form1099sa_distribution_code: "1" as const,
    form1099sa_source_reference: "2025 Form1099-SA Medicare MSA",
    unreimbursed_holder_qualified_expenses: medical,
    qualified_expense_source_references: [`holder medical bill ${reference}`],
    holder_only_medical_eligibility_and_no_schedule_a_double_deduction_confirmed:
      true as const,
  };
}
export const noPriorLedger: MedicareDistributionLedger = {
  ...review,
  owner: "taxpayer",
  source: {
    kind: "normal",
    holder_ssn: "111223333",
    holder_identity_source_reference: "holder identity record",
    medicare_enrollment_and_eligible_hdhp_confirmed: true,
    enrollment_and_hdhp_source_reference:
      "Medicare enrollment and MSA HDHP policy",
    distributions: [row("first")],
  },
  prior_year: {
    had_account_at_end_2024: false,
    year_end_account_review_source_reference:
      "custodian opening history and 2024 review",
  },
};
export const priorBalanceLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("first", "2025-06-14", 10000, 2000)],
  },
  prior_year: {
    had_account_at_end_2024: true,
    balance_on_2024_12_31: 10000,
    balance_source_reference: "2024 year-end custodian statement",
    balance_includes_all_holder_medicare_msas_confirmed: true,
    annual_hdhp_deductible_on_2025_01_01: 8000,
    deductible_policy_source_reference:
      "January1 2025 annual HDHP deductible policy",
  },
};
export const partialLedger: MedicareDistributionLedger = {
  ...priorBalanceLedger,
  source: {
    ...priorBalanceLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    disability: {
      onset_date: "2025-06-15",
      source_reference: "disability certification",
      unable_to_engage_in_substantial_gainful_activity_confirmed: true,
      condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
        true,
    },
    distributions: [
      row("before", "2025-06-14", 4000, 1000),
      row("on", "2025-06-15", 4000, 1000),
      row("after", "2025-06-16", 4000, 1000),
    ],
  },
  prior_year: {
    ...priorBalanceLedger.prior_year as Extract<
      NonNullable<MedicareDistributionLedger["prior_year"]>,
      { had_account_at_end_2024: true }
    >,
    annual_hdhp_deductible_on_2025_01_01: 12000,
  },
};
export const centsLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [
      row("one", "2025-06-14", 1000.2, 250.3),
      row("two", "2025-06-15", 1000.2, 250.3),
    ],
  },
};
export const spouseLedger: MedicareDistributionLedger = {
  ...priorBalanceLedger,
  owner: "spouse",
  source: {
    ...priorBalanceLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    holder_ssn: "222334444",
  },
};
export const fullyQualifiedLedger: MedicareDistributionLedger = {
  ...noPriorLedger,
  prior_year: undefined,
  source: {
    ...noPriorLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("fully-qualified", "2025-06-14", 2000, 2000)],
  },
};
export const fullyExceptedLedger: MedicareDistributionLedger = {
  ...partialLedger,
  prior_year: undefined,
  source: {
    ...partialLedger.source as Extract<
      MedicareDistributionLedger["source"],
      { kind: "normal" }
    >,
    distributions: [row("on-event", "2025-06-15", 6000, 2000)],
  },
};
export const deathLedger: MedicareDistributionLedger = {
  ...review,
  owner: "taxpayer",
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
export function fixture(ledger: MedicareDistributionLedger) {
  return {
    general: {
      filing_status: ledger.owner === "spouse" ? "mfj" : "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: ledger.owner === "spouse" ? "1985-06-15" : "1955-06-15",
      ...(ledger.owner === "spouse"
        ? {
          spouse_first_name: "Casey",
          spouse_last_name: "Example",
          spouse_ssn: "222-33-4444",
          spouse_dob: "1955-06-15",
        }
        : {}),
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "synthetic domestic source review",
        no_form2555_filed: true,
        form2555_review_source_reference:
          "synthetic no foreign exclusion review",
        no_form4563_filed: true,
        form4563_review_source_reference:
          "synthetic no possessions exclusion review",
      },
    },
    form8853: { medicare_distribution_ledger: ledger },
  };
}

Deno.test("Medicare worksheet uses balance less60% deductible without reducing taxable income", () => {
  assertEquals(calculateMedicareLedger(priorBalanceLedger).worksheet, {
    line1: 8000,
    hadAccountAtEnd2024: true,
    line2: 10000,
    line3: 8000,
    line4: 4800,
    line5: 5200,
    line6: 2800,
    line7: 1400,
  });
  assertEquals(calculateMedicareLedger(partialLedger).worksheet, {
    line1: 3000,
    hadAccountAtEnd2024: true,
    line2: 10000,
    line3: 12000,
    line4: 7200,
    line5: 2800,
    line6: 200,
    line7: 100,
  });
  assertEquals(calculateMedicareLedger(partialLedger).line12, 9000);
  const zeroPenalty = structuredClone(priorBalanceLedger);
  if (!zeroPenalty.prior_year?.had_account_at_end_2024) {
    throw new Error("fixture prior-year kind");
  }
  zeroPenalty.prior_year.balance_on_2024_12_31 = 20000;
  assertEquals(calculateMedicareLedger(zeroPenalty).line13b, 0);
  assertEquals(calculateMedicareLedger(zeroPenalty).line13a, false);
});
Deno.test("Medicare worksheet and source rejects absent review, duplicate distributions and missing holder bills", () => {
  assertThrows(
    () => calculateMedicareLedger({ ...noPriorLedger, prior_year: undefined }),
    Error,
    "2024 account review",
  );
  const duplicate = structuredClone(noPriorLedger);
  if (duplicate.source.kind !== "normal") throw new Error("fixture source");
  duplicate.source.distributions.push(duplicate.source.distributions[0]);
  assertThrows(() => calculateMedicareLedger(duplicate), Error, "duplicate");
  duplicate.source.distributions.pop();
  duplicate.source.distributions[0].qualified_expense_source_references = [];
  assertThrows(
    () => calculateMedicareLedger(duplicate),
    Error,
    "holder medical sources",
  );
});

for (
  const [name, ledger, income, tax] of [
    ["no2024 account", noPriorLedger, 4000, 2000],
    ["prior-year worksheet", priorBalanceLedger, 8000, 1400],
    ["partial disability and worksheet", partialLedger, 9000, 100],
    ["raw cents", centsLedger, 1499, 750],
    ["sole spouse owner joint return", spouseLedger, 8000, 1400],
    ["fully qualified zero tax", fullyQualifiedLedger, 0, 0],
    ["fully excepted disability", fullyExceptedLedger, 4000, 0],
    ["nonspouse death transfer", deathLedger, 4000, 0],
  ] as const
) {
  Deno.test(`Medicare MSA ${name} source→1040→native XSD and filled PDF`, async () => {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      fixture(ledger),
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.form8853?.medicare_distribution_ledger, ledger);
    assertEquals(result.pending.schedule1?.line8e_archer_msa_dist ?? 0, income);
    assertEquals(
      result.pending.schedule2?.line17f_medicare_advantage_msa_tax ?? 0,
      tax,
    );
    assertEquals(result.pending.f1040?.line8_additional_income ?? 0, income);
    assertEquals(result.pending.f1040?.line23_other_taxes ?? 0, tax);
    const filer = extractFilerIdentity(result.pending.f1040);
    assertExists(filer);
    const lines = calculateMedicareLedger(ledger);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertStringIncludes(
      xml,
      `<TaxableMedicareMSADistriAmt>${income}</TaxableMedicareMSADistriAmt>`,
    );
    assertStringIncludes(
      xml,
      `<MedicareMSAAddnlDistriTaxAmt>${tax}</MedicareMSAAddnlDistriTaxAmt>`,
    );
    assertStringIncludes(
      xml,
      `<MSAHolderSSN>${
        ledger.owner === "spouse" ? "222334444" : "111223333"
      }</MSAHolderSSN>`,
    );
    assertEquals(
      xml.includes(
        "<MedicareMSADistriMeetTaxExcInd>X</MedicareMSADistriMeetTaxExcInd>",
      ),
      lines.line13a,
    );
    assertEquals(xml.includes("<TotalArcherMSADistributionAmt>"), false);
    assertEquals(
      xml.includes("<MSAHolderDeathInd>X</MSAHolderDeathInd>"),
      lines.deathTransfer,
    );
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
      const output = await new Deno.Command("pdftotext", {
        args: ["-layout", pdfPath, "-"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
      const printed = new TextDecoder().decode(output.stdout);
      if (lines.deathTransfer) {
        assertStringIncludes(
          printed,
          "Death of Medicare Advantage MSA account holder",
        );
      }
      const formText = printed.slice(printed.lastIndexOf("Archer MSAs and"));
      for (
        const [line, value] of [["10", lines.line10], ["11", lines.line11], [
          "12",
          income,
        ], ["13b", tax]] as const
      ) {
        assertEquals(
          new RegExp(`\\b${line}\\s+${value}\\b`).test(formText),
          true,
          `${name}: ${line} ${value}`,
        );
      }
      assertStringIncludes(
        formText,
        ledger.owner === "spouse" ? "222334444" : "111223333",
      );
    } finally {
      await Deno.remove(xmlPath);
      await Deno.remove(pdfPath);
    }
    const projected = form8853Pdf.instances?.(
      result.pending.form8853!,
      filer,
      result.pending,
    ) ?? [];
    assertEquals(projected[0].line13a_medicare_msa_exception, lines.line13a);
    const wrongOwner = structuredClone(ledger);
    if (wrongOwner.source.kind === "normal") {
      wrongOwner.source.holder_ssn = "999887777";
    } else {
      wrongOwner.source.recipient_ssn = "999887777";
    }
    assertThrows(
      () =>
        native.build({ medicare_distribution_ledger: wrongOwner }, {
          filer,
          pending: result.pending,
        }),
      Error,
      "declared return owner",
    );
    assertThrows(
      () =>
        native.build({
          ...result.pending.form8853,
          medicare_advantage_exception: !lines.line13a,
        }, { filer, pending: result.pending }),
      Error,
      "ledger conflicts",
    );
  });
}

Deno.test("Medicare estate final-return source retains existing full-return blocker", async () => {
  const ledger = structuredClone(deathLedger);
  if (ledger.source.kind !== "death_transfer") {
    throw new Error("fixture source");
  }
  ledger.source.beneficiary_kind = "estate_final_return";
  ledger.source.recipient_ssn = "111223333";
  ledger.source.deceased_holder_ssn = "111223333";
  ledger.source.deceased_holder_name = "Alex Example";
  ledger.source.expenses = [];
  const inputs = fixture(ledger);
  const result = execute(buildExecutionPlan(registry), registry, {
    ...inputs,
    general: {
      ...inputs.general,
      taxpayer_deceased: true,
      taxpayer_death_date: "2025-04-15",
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line8e_archer_msa_dist, 6000);
  assertEquals(
    result.pending.schedule2?.line17f_medicare_advantage_msa_tax ?? 0,
    0,
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const xml = native.build(result.pending.form8853!, {
    filer,
    pending: result.pending,
  });
  assertStringIncludes(
    xml,
    "<TaxableMedicareMSADistriAmt>6000</TaxableMedicareMSADistriAmt>",
  );
  assertStringIncludes(xml, "<MSAHolderDeathInd>X</MSAHolderDeathInd>");
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "reviewed signer, representative, and refund facts",
  );
  await assertRejects(
    () => buildPdfBytes(result.pending, filer),
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
    "matching deceased final-return owner",
  );
  assertEquals(
    form8853Pdf.instances?.(result.pending.form8853!, filer, result.pending)
      ?.[0].medicare_death_transfer,
    true,
  );
});
