import { test } from "bun:test";
import * as fs from "node:fs/promises";
import * as sys from "../../../../../../scripts/support/sys.ts";
import {
  centsLedger,
  deathLedger,
  fixture,
  fullyExceptedLedger,
  fullyQualifiedLedger,
  noPriorLedger,
  partialLedger,
  priorBalanceLedger,
  spouseLedger,
} from "../../../../2025/pdf/reviews/general/composed-returns/review-8853-medicare.fixture.ts";
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
import { form8853 as native } from "../../../../2025/mef/forms/adjustments/health/f8853.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import {
  calculateMedicareLedger,
} from "../../../../nodes/intermediate/forms/adjustments/health/form8853/medicare_distributions.ts";

test("Medicare worksheet uses balance less60% deductible without reducing taxable income", () => {
  assertEquals(calculateMedicareLedger(priorBalanceLedger, 2025).worksheet, {
    line1: 8000,
    hadAccountAtPriorYearEnd: true,
    line2: 10000,
    line3: 8000,
    line4: 4800,
    line5: 5200,
    line6: 2800,
    line7: 1400,
  });
  assertEquals(calculateMedicareLedger(partialLedger, 2025).worksheet, {
    line1: 3000,
    hadAccountAtPriorYearEnd: true,
    line2: 10000,
    line3: 12000,
    line4: 7200,
    line5: 2800,
    line6: 200,
    line7: 100,
  });
  assertEquals(calculateMedicareLedger(partialLedger, 2025).line12, 9000);
  const zeroPenalty = structuredClone(priorBalanceLedger);
  if (!zeroPenalty.prior_year?.had_account_at_prior_year_end) {
    throw new Error("fixture prior-year kind");
  }
  zeroPenalty.prior_year.balance_at_prior_year_end = 20000;
  assertEquals(calculateMedicareLedger(zeroPenalty, 2025).line13b, 0);
  assertEquals(calculateMedicareLedger(zeroPenalty, 2025).line13a, false);
});
test("Medicare worksheet and source rejects absent review, duplicate distributions and missing holder bills", () => {
  assertThrows(
    () => calculateMedicareLedger({ ...noPriorLedger, prior_year: undefined }, 2025),
    Error,
    "prior-year account review",
  );
  const duplicate = structuredClone(noPriorLedger);
  if (duplicate.source.kind !== "normal") throw new Error("fixture source");
  duplicate.source.distributions.push(duplicate.source.distributions[0]);
  assertThrows(() => calculateMedicareLedger(duplicate, 2025), Error, "duplicate");
  duplicate.source.distributions.pop();
  duplicate.source.distributions[0].qualified_expense_source_references = [];
  assertThrows(
    () => calculateMedicareLedger(duplicate, 2025),
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
  test(`Medicare MSA ${name} source→1040→native XSD and filled PDF`, async () => {
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
    const lines = calculateMedicareLedger(ledger, 2025);
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
      "../../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const xmlPath = await sys.makeTempFile({ suffix: ".xml" });
    const pdfPath = await sys.makeTempFile({ suffix: ".pdf" });
    try {
      await fs.writeFile(xmlPath, xml);
      const validation = await new sys.Command("xmllint", {
        args: ["--noout", "--schema", xsd, xmlPath],
        stderr: "piped",
      }).output();
      assertEquals(
        validation.code,
        0,
        new TextDecoder().decode(validation.stderr),
      );
      await fs.writeFile(pdfPath, await buildPdfBytes(result.pending, filer));
      const output = await new sys.Command("pdftotext", {
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
      await sys.remove(xmlPath);
      await sys.remove(pdfPath);
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

test("Medicare estate final-return source retains existing full-return blocker", async () => {
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

test("Form8853 medicare rejects reused medical expense references through native and PDF export", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture(partialLedger),
    { taxYear: 2025, formType: "f1040" },
  );
  const filer = extractFilerIdentity(result.pending.f1040)!;
  for (const acrossRows of [false, true]) {
    const invalid = structuredClone(partialLedger);
    if (invalid.source.kind !== "normal") throw new Error("fixture source");
    const first = invalid.source.distributions[0];
    if (acrossRows) {
      invalid.source.distributions[1].qualified_expense_source_references = [
        ...first.qualified_expense_source_references,
      ];
    } else {first.qualified_expense_source_references.push(
        first.qualified_expense_source_references[0],
      );}
    const pending = {
      ...result.pending,
      form8853: {
        ...result.pending.form8853,
        medicare_distribution_ledger: invalid,
      },
    };
    assertThrows(
      () => buildMefXml(buildPending(pending), filer),
      Error,
      "qualified expense reference cannot be reused",
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      "qualified expense reference cannot be reused",
    );
  }
  const invalidDeath = structuredClone(deathLedger);
  if (invalidDeath.source.kind !== "death_transfer") {
    throw new Error("fixture source");
  }
  invalidDeath.source.expenses.push({ ...invalidDeath.source.expenses[0] });
  assertThrows(
    () => calculateMedicareLedger(invalidDeath, 2025),
    Error,
    "qualified expense reference cannot be reused",
  );
});

// IRC §138(c)(2) and the Form 8853 Section B worksheet are not indexed: a
// 2026 ledger with 2026 distributions computes the same lines as TY2025.
test("Medicare MSA ledger reads the return year's distribution dates", () => {
  const in2026 = structuredClone(priorBalanceLedger);
  if (in2026.source.kind !== "normal") throw new Error("fixture source kind");
  for (const row of in2026.source.distributions) {
    row.distribution_date = `2026${row.distribution_date.slice(4)}`;
  }
  assertEquals(
    calculateMedicareLedger(in2026, 2026).worksheet,
    calculateMedicareLedger(priorBalanceLedger, 2025).worksheet,
  );
  assertThrows(
    () => calculateMedicareLedger(priorBalanceLedger, 2026),
    Error,
    "distribution date must be in filing year",
  );
});
