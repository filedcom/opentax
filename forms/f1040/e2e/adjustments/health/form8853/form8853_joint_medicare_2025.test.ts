import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";
import { form8853Pdf } from "../../../../2025/pdf/forms/adjustments/health/f8853.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  calculateMedicareJointLedgers,
  type MedicareHolderLedger,
} from "../../../../nodes/intermediate/forms/adjustments/health/form8853/medicare_distributions.ts";

function holder(
  owner: "taxpayer" | "spouse",
  gross = 6000,
  medical = 2000,
): MedicareHolderLedger {
  return {
    owner,
    all_distributions_identified_confirmed: true,
    erroneous_medicare_contributions_and_earnings_and_trustee_transfers_excluded_confirmed:
      true,
    no_other_form8853_activity_confirmed: true,
    source: {
      kind: "normal",
      holder_ssn: owner === "taxpayer" ? "111223333" : "222334444",
      holder_identity_source_reference: `${owner} identity`,
      medicare_enrollment_and_eligible_hdhp_confirmed: true,
      enrollment_and_hdhp_source_reference:
        `${owner} Medicare enrollment and HDHP policy`,
      distributions: [{
        distribution_reference: `${owner}-first`,
        account_source_reference: `${owner} Medicare account`,
        distribution_date: "2025-06-14",
        distribution_date_source_reference:
          `${owner} custodian dated transaction`,
        gross_amount: gross,
        form1099sa_distribution_code: "1",
        form1099sa_source_reference: `${owner} 2025 Form1099-SA`,
        unreimbursed_holder_qualified_expenses: medical,
        qualified_expense_source_references: [`${owner} medical bill first`],
        holder_only_medical_eligibility_and_no_schedule_a_double_deduction_confirmed:
          true,
      }],
    },
    prior_year: {
      had_account_at_end_2024: false,
      year_end_account_review_source_reference: `${owner} 2024 account review`,
    },
  };
}
export const mixedPrior: MedicareHolderLedger[] = [
  holder("taxpayer", 10000, 2000),
  holder("spouse", 2000.4, 500.6),
];
mixedPrior[0].prior_year = {
  had_account_at_end_2024: true,
  balance_on_2024_12_31: 10000,
  balance_source_reference: "taxpayer 2024 year-end balance",
  balance_includes_all_holder_medicare_msas_confirmed: true,
  annual_hdhp_deductible_on_2025_01_01: 8000,
  deductible_policy_source_reference: "taxpayer Jan1 2025 deductible",
};
export const partialException: MedicareHolderLedger[] = structuredClone(
  mixedPrior,
);
if (partialException[0].source.kind !== "normal") {
  throw new Error("fixture source");
}
const first = partialException[0].source.distributions[0];
partialException[0].source.disability = {
  onset_date: "2025-06-15",
  source_reference: "taxpayer disability record",
  unable_to_engage_in_substantial_gainful_activity_confirmed: true,
  condition_expected_to_result_in_death_or_continue_indefinitely_confirmed:
    true,
};
partialException[0].source.distributions = ["14", "15", "16"].map((day) => ({
  ...first,
  distribution_reference: `taxpayer-${day}`,
  distribution_date: `2025-06-${day}`,
  distribution_date_source_reference: `taxpayer custodian June${day}`,
  gross_amount: 4000,
  unreimbursed_holder_qualified_expenses: 1000,
  qualified_expense_source_references: [`taxpayer bill${day}`],
}));
if (!partialException[0].prior_year?.had_account_at_end_2024) {
  throw new Error("fixture prior year");
}
partialException[0].prior_year.annual_hdhp_deductible_on_2025_01_01 = 12000;
partialException[1] = holder("spouse");
export const bothCents: MedicareHolderLedger[] = [
  holder("taxpayer", 1000.49, 100.51),
  holder("spouse", 1000.49, 100.51),
];
export const bothQualified: MedicareHolderLedger[] = [
  holder("taxpayer", 2000, 2000),
  holder("spouse", 3000, 3000),
];
export function fixture(ledgers: MedicareHolderLedger[]) {
  return {
    general: {
      filing_status: "mfj",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1955-06-15",
      spouse_first_name: "Casey",
      spouse_last_name: "Example",
      spouse_ssn: "222-33-4444",
      spouse_dob: "1956-06-15",
      address_line1: "1 Example Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    },
    schedule1a: {
      senior_zero_exclusions_review: {
        no_section933_puerto_rico_excluded_income: true,
        section933_review_source_reference: "synthetic domestic review",
        no_form2555_filed: true,
        form2555_review_source_reference: "synthetic no foreign exclusions",
        no_form4563_filed: true,
        form4563_review_source_reference: "synthetic no possessions exclusions",
      },
    },
    form8853: { medicare_joint_distribution_ledgers: ledgers },
  };
}
function run(ledgers: MedicareHolderLedger[]) {
  return execute(buildExecutionPlan(registry), registry, fixture(ledgers), {
    taxYear: 2025,
    formType: "f1040",
  });
}
for (
  const [name, ledgers, income, tax] of [
    ["mixed prior accounts and cents", mixedPrior, 9499, 2150],
    ["partial exception", partialException, 13000, 2100],
    ["both cents", bothCents, 1798, 900],
    ["both qualified zero", bothQualified, 0, 0],
  ] as const
) {
  Deno.test(`Joint Medicare ${name}: public source→1040→controlling form/statements→full XSD/PDF`, async () => {
    const result = run(ledgers);
    assertEquals(result.diagnostics, []);
    assertEquals(
      result.pending.form8853?.medicare_joint_distribution_ledgers,
      ledgers,
    );
    assertEquals(result.pending.schedule1?.line8e_archer_msa_dist ?? 0, income);
    assertEquals(
      result.pending.schedule2?.line17f_medicare_advantage_msa_tax ?? 0,
      tax,
    );
    assertEquals(result.pending.f1040?.line8_additional_income ?? 0, income);
    assertEquals(result.pending.f1040?.line23_other_taxes ?? 0, tax);
    const filer = extractFilerIdentity(result.pending.f1040);
    assertExists(filer);
    const computed = calculateMedicareJointLedgers(ledgers);
    const xml = buildMefXml(buildPending(result.pending), filer);
    assertEquals((xml.match(/<IRS8853\b/g) ?? []).length, 1);
    assertEquals(
      (xml.match(/<ArcherMSAAndMedcrAdvntgMSAGrp>/g) ?? []).length,
      1,
    );
    assertStringIncludes(xml, "<MSAHolderSSN>111223333</MSAHolderSSN>");
    const ids = [...xml.matchAll(/documentId="([^"]+)"/g)].map((match) =>
      match[1]
    );
    assertEquals(new Set(ids).size, ids.length);
    assertStringIncludes(xml, `<ReturnData documentCnt="${ids.length}">`);
    assertEquals(
      xml.indexOf("<PrimaryTaxpayerMedicareMSAStmt") <
        xml.indexOf("<SpouseTaxpayerMedicareMSAStmt"),
      true,
    );
    const tags = [
      "IRS8853",
      "PrimaryTaxpayerMedicareMSAStmt",
      "SpouseTaxpayerMedicareMSAStmt",
    ];
    const lines = [computed, ...computed.holders.map((holder) => holder.lines)];
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const body = new RegExp(`<${tag}\\b[^>]*>(.*?)</${tag}>`).exec(xml)?.[1];
      assertExists(body);
      for (
        const [field, value] of [
          ["TotalMedicareMSADistriAmt", lines[i].line10],
          ["MedicareMSAUnrmbQualMedExpAmt", lines[i].line11],
          ["TaxableMedicareMSADistriAmt", lines[i].line12],
          ["MedicareMSAAddnlDistriTaxAmt", lines[i].line13b],
        ] as const
      ) assertStringIncludes(body, `<${field}>${value}</${field}>`);
      assertEquals(
        body.includes(
          "<MedicareMSADistriMeetTaxExcInd>X</MedicareMSADistriMeetTaxExcInd>",
        ),
        lines[i].line13a,
      );
      if (i > 0) assertEquals(body.includes("MSAHolderSSN"), false);
    }
    const xsd = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" }),
      pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeTextFile(xmlPath, xml);
      const valid = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, xmlPath],
        stderr: "piped",
      }).output();
      assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
      await Deno.writeFile(pdfPath, await buildPdfBytes(result.pending, filer));
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-layout", pdfPath, "-"],
        stdout: "piped",
      }).output();
      assertEquals(extracted.code, 0);
      const pages = new TextDecoder().decode(extracted.stdout).split("\f");
      const copies = pages.filter((page) => page.includes("Archer MSAs and"));
      assertEquals(copies.length, 3);
      assertEquals(pages.slice(-4, -1), copies);
      for (let i = 0; i < 3; i++) {
        assertStringIncludes(copies[i], i === 2 ? "222334444" : "111223333");
        assertEquals(copies[i].includes("statement"), i !== 0);
        if (i === 0) {
          assertStringIncludes(copies[i], "Alex Example & Casey Example");
        }
        if (i === 1) assertStringIncludes(copies[i], "Alex Example");
        if (i === 2) assertStringIncludes(copies[i], "Casey Example");
        for (
          const [line, value] of [
            ["10", lines[i].line10],
            ["11", lines[i].line11],
            ["12", lines[i].line12],
            ["13b", lines[i].line13b],
          ] as const
        ) {
          assertEquals(
            new RegExp(`\\b${line}\\s+${value}\\b`).test(copies[i]),
            true,
            `${name} copy${i} line${line}`,
          );
        }
      }
      const projected = form8853Pdf.instances?.(
        result.pending.form8853!,
        filer,
        result.pending,
      )!;
      assertEquals(
        projected.map((p) => p.line13a_medicare_msa_exception),
        lines.map((l) => l.line13a),
      );
    } finally {
      await Deno.remove(xmlPath);
      await Deno.remove(pdfPath);
    }
  });
}
Deno.test("Joint Medicare rejects duplicate ownership/distributions/medical sources, wrong owner and tampered totals at actual XML/PDF export", async () => {
  const result = run(mixedPrior);
  const filer = extractFilerIdentity(result.pending.f1040)!;
  const invalids: MedicareHolderLedger[][] = [];
  for (
    const kind of [
      "owner",
      "ssn",
      "distribution",
      "medical",
      "account",
      "prior",
    ]
  ) {
    const invalid = structuredClone(mixedPrior);
    const primary = invalid[0].source, spouse = invalid[1].source;
    if (primary.kind !== "normal" || spouse.kind !== "normal") {
      throw new Error("fixture source");
    }
    if (kind === "owner") invalid[1].owner = "taxpayer";
    if (kind === "ssn") spouse.holder_ssn = "999887777";
    if (kind === "distribution") {
      spouse.distributions[0].distribution_reference =
        primary.distributions[0].distribution_reference;
    }
    if (kind === "medical") {
      spouse.distributions[0].qualified_expense_source_references = [
        ...primary.distributions[0].qualified_expense_source_references,
      ];
    }
    if (kind === "account") {
      spouse.distributions[0].account_source_reference =
        primary.distributions[0].account_source_reference;
    }
    if (kind === "prior") invalid[0].prior_year = undefined;
    invalids.push(invalid);
  }
  const pendings: typeof result.pending[] = invalids.map((ledgers) => ({
    ...result.pending,
    form8853: { medicare_joint_distribution_ledgers: ledgers },
  }));
  pendings.push({
    ...result.pending,
    form8853: {
      ...result.pending.form8853,
      medicare_advantage_distributions: 12000.41,
    },
  });
  const tampered = [...pendings, {
    ...result.pending,
    schedule1: { ...result.pending.schedule1, line8e_archer_msa_dist: 9498 },
  }, {
    ...result.pending,
    schedule2: {
      ...result.pending.schedule2,
      line17f_medicare_advantage_msa_tax: 2151,
    },
  }, {
    ...result.pending,
    f1040: { ...result.pending.f1040, line8_additional_income: 9498 },
  }, {
    ...result.pending,
    f1040: { ...result.pending.f1040, line23_other_taxes: 2151 },
  }];
  for (const pending of tampered) {
    assertThrows(() => buildMefXml(buildPending(pending), filer));
    await assertRejects(() => buildPdfBytes(pending, filer));
  }
  const invalid = fixture(mixedPrior);
  invalid.general.filing_status = "single";
  const wrongReturn = execute(buildExecutionPlan(registry), registry, invalid, {
    taxYear: 2025,
    formType: "f1040",
  });
  const single = extractFilerIdentity(wrongReturn.pending.f1040)!;
  assertThrows(
    () => buildMefXml(buildPending(wrongReturn.pending), single),
    Error,
    "require MFJ",
  );
});
