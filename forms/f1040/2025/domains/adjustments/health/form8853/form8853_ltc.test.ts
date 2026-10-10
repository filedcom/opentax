import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { calculateLtcLedger } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/ltc.ts";
import { ltcInsured, ltcPackets } from "./form8853_ltc.fixture.ts";

function evidenceRoot() {
  try {
    return Deno.env.get("FORM8853_LTC_DIR");
  } catch (e) {
    if (e instanceof Deno.errors.NotCapable) return undefined;
    throw e;
  }
}
for (const entry of ltcPackets) {
  Deno.test(`Form 8853 LTC source, allocation, tax and complete packet: ${entry.id}`, async () => {
    const result = f1040_2025.executeReturn(entry.inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const calculated = calculateLtcLedger(entry.inputs.form8853.ltc_ledger);
    assertEquals(calculated.taxable, entry.income);
    assertEquals(calculated.forms[0].line25, entry.limit);
    assertEquals(pending.schedule1.line8e_archer_msa_dist ?? 0, entry.income);
    assertEquals(pending.f1040.line8_additional_income ?? 0, entry.income);
    assertEquals(pending.f1040.line11_agi, 150000 + entry.income);
    assertEquals(
      pending.f1040.line15_taxable_income,
      150000 + entry.income - (entry.joint ? 31500 : 15750),
    );
    assertEquals(Math.round(Number(pending.f1040.line24_total_tax)), entry.tax);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const xml = prepared.bundle.xml;
    assertEquals(xml.match(/<IRS8853 documentId=/g)?.length, 1);
    assertStringIncludes(
      xml,
      `<LTCInsurancePolicyHolderSSN>${
        calculated.forms[0].policyholder.ssn
      }</LTCInsurancePolicyHolderSSN>`,
    );
    assertStringIncludes(
      xml,
      `<LTCTaxablePaymentsAmt>${entry.income}</LTCTaxablePaymentsAmt>`,
    );
    const statement = calculated.forms[0].multiplePayees &&
      !calculated.forms[0].terminalOnly;
    assertEquals(
      (xml.match(/<MultiplePayeesStatement documentId=/g) ?? []).length,
      statement ? 1 : 0,
    );
    if (statement) {
      const id = /<MultiplePayeesStatement documentId="([^"]+)"/.exec(xml)?.[1];
      assertExists(id);
      assertStringIncludes(
        xml,
        `referenceDocumentId="${id}" referenceDocumentName="MultiplePayeesStatement">true`,
      );
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((p) => p.formKey === "form8853").length,
      statement
        ? (entry.id === "multiple-payee-statement-overflow" ? 6 : 2)
        : 1,
    );

    const changedIncome = structuredClone(pending);
    changedIncome.schedule1.line8e_archer_msa_dist = entry.income + 1;
    const changed1040 = structuredClone(pending);
    changed1040.f1040.line8_additional_income = entry.income + 1;
    const missingForm = structuredClone(pending);
    delete missingForm.form8853;
    const missingSource = structuredClone(pending);
    delete missingSource.schedule1.ltc_source_ledger;
    const changedSource = structuredClone(pending);
    const changed = structuredClone(entry.inputs.form8853.ltc_ledger);
    changed.insureds[0].sources[0].source_reference =
      "changed retained policy source";
    changedSource.form8853 = { ltc_ledger: changed };
    const mixed = structuredClone(pending);
    mixed.form8853.ltc_gross_payments = 1;
    const changedOwner = structuredClone(pending);
    const wrongOwner = structuredClone(entry.inputs.form8853.ltc_ledger);
    wrongOwner.insureds[0].filing_policyholders[0].ssn = "999887777";
    changedOwner.form8853 = { ltc_ledger: wrongOwner };
    changedOwner.schedule1.ltc_source_ledger = wrongOwner;
    const stalePeriod = structuredClone(pending);
    const wrongPeriod = structuredClone(entry.inputs.form8853.ltc_ledger);
    wrongPeriod.insureds[0].period.end_date = "2025-02-30";
    stalePeriod.form8853 = { ltc_ledger: wrongPeriod };
    stalePeriod.schedule1.ltc_source_ledger = wrongPeriod;
    const mutations = [
      changedIncome,
      changed1040,
      missingForm,
      missingSource,
      changedSource,
      mixed,
      changedOwner,
      stalePeriod,
    ];
    for (const mutated of mutations) {
      await assertRejects(
        () => f1040_2025.prepareReturn(mutated, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(mutated, filer), Error);
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs: entry.inputs,
            pending,
            filer,
            origins,
            calculated,
            expected: {
              income: entry.income,
              tax: entry.tax,
              limit: entry.limit,
            },
            rejectedNative: mutations.length,
            rejectedFreshPdf: mutations.length,
            sourceAuthenticityVerified: false,
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
  });
}

Deno.test("Form 8853 LTC source guards reject incomplete and inconsistent source inventories", () => {
  const base = ltcPackets.find((p) => p.id === "taxable-per-diem")!.inputs;
  const mutations: Array<(i: ReturnType<typeof ltcInsured>) => void> = [
    (i) => {
      i.sources[0].form1099ltc_box1 += 1;
    },
    (i) => {
      i.sources[0].insured_ssn = "999887777";
    },
    (i) => {
      i.sources.push(structuredClone(i.sources[0]));
    },
    (i) => {
      i.expenses.push(structuredClone(i.expenses[0]));
    },
    (i) => {
      i.chronic_illness = undefined;
    },
    (i) => {
      i.chronic_illness!.certification_date = "2023-01-01";
    },
    (i) => {
      i.period.all_payees_agreed_equal_rate_period = undefined;
    },
    (i) => {
      i.period.start_date = "2025-06-31";
    },
    (i) => {
      i.filing_policyholders[0].ssn = "999887777";
    },
    (i) => {
      i.reimbursements[0].excluded_pre_august_1996_unmodified_contract = {
        issued_on: "1996-08-01",
        no_increasing_exchange_or_modification_confirmed: true,
        contract_review_reference: "incorrect old-contract exemption",
      };
    },
    (i) => {
      i.sources[0].gross_ltc_per_diem = 1.001;
    },
  ];
  for (const mutate of mutations) {
    const insured = ltcInsured();
    mutate(insured);
    assertThrows(() =>
      f1040_2025.executeReturn({
        ...base,
        form8853: { ltc_ledger: { tax_year: 2025, insureds: [insured] } },
      })
    );
  }
});

Deno.test("Form 8853 LTC cannot omit a current-return recipient from a joint source inventory", () => {
  const base =
    ltcPackets.find((p) => p.id === "joint-return-spouse-owner")!.inputs;
  const ledger = structuredClone(
    ltcPackets.find((p) => p.id === "multiple-payee-child-allocation")!.inputs
      .form8853.ltc_ledger,
  );
  const original = ledger.insureds[0].sources[2];
  ledger.insureds[0].sources[2] = {
    ...original,
    policyholder: { ssn: "987654321", name: "Bea Taxpayer" },
  };
  assertThrows(
    () =>
      f1040_2025.executeReturn({ ...base, form8853: { ltc_ledger: ledger } }),
    Error,
    "every current-return policyholder",
  );
});

Deno.test("Form 8853 LTC multiple insureds calculate but cannot fabricate native Section C copies", async () => {
  const base = ltcPackets.find((p) => p.id === "taxable-per-diem")!.inputs;
  const another = ltcInsured();
  another.insured = {
    ...another.insured,
    ssn: "444556666",
    name: "Robin Elder",
  };
  another.sources = another.sources.map((s) => ({
    ...s,
    source_reference: s.source_reference + "-second",
    insured_ssn: another.insured.ssn,
  }));
  another.expenses = another.expenses.map((s) => ({
    ...s,
    source_reference: s.source_reference + "-second",
  }));
  another.reimbursements = another.reimbursements.map((s) => ({
    ...s,
    source_reference: s.source_reference + "-second",
  }));
  const result = f1040_2025.executeReturn({
    ...base,
    form8853: {
      ltc_ledger: { tax_year: 2025, insureds: [ltcInsured(), another] },
    },
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line8_additional_income, 14800);
  const filer = extractFilerIdentity(pending.f1040);
  assertExists(filer);
  await assertRejects(
    () => f1040_2025.prepareReturn(result.pending, filer),
    Error,
    "multiple Section C copies",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "multiple Section C copies",
  );
});
