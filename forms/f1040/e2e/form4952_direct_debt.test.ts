import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { form4952 as nativeForm4952 } from "../2025/mef/forms/f4952.ts";
import { form4952Pdf } from "../2025/pdf/forms/f4952.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { FilingStatus } from "../2025/mef/types.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildMefBundle } from "../2025/mef/builder.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";

const trace = {
  tax_year: 2025,
  owner_tin: "123456789",
  loan_id: "loan-one",
  lender_statement_reference: "lender-2025-interest",
  loan_agreement_reference: "signed-loan-agreement",
  disbursement_record_reference: "2025-direct-disbursement",
  purchase_record_reference: "broker-lot-purchase",
  loan_date: "2025-01-10",
  direct_purchase_date: "2025-01-10",
  borrowed_principal: 100_000,
  direct_taxable_securities_purchase: 100_000,
  asset_id: "taxable-security-lot-1",
  no_other_loan_proceeds_use: true,
  no_tax_exempt_or_passive_activity_asset: true,
  investment_use_maintained_through_2025: true,
  lender_2025_interest_total: 20_000,
  interest_payments: [{
    payment_id: "first-payment",
    payment_date: "2025-06-30",
    payment_record_reference: "bank-payment-june",
    interest_amount: 10_000,
  }, {
    payment_id: "second-payment",
    payment_date: "2025-12-31",
    payment_record_reference: "bank-payment-december",
    interest_amount: 10_000,
  }],
} as const;

function filing(
  source:
    | "interest"
    | "dividend"
    | "qualified_dividend"
    | "oid"
    | "interest_dividend"
    | "oid_dividend"
    | "two_interest"
    | "two_interest_dividend"
    | "two_interest_two_dividends"
    | "interest_two_dividends"
    | "treasury_oid" = "interest",
  spouseOwned = false,
  qualifiedDividendElection = 0,
) {
  return execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: spouseOwned ? "mfj" : "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
      digital_assets: false,
      ...(spouseOwned
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Taxpayer",
          spouse_ssn: "444-55-6666",
          spouse_dob: "1982-03-10",
        }
        : {}),
    },
    ...(spouseOwned
      ? {
        f1098: [{
          lender_name: "Home Lender",
          recipient_tin: "123456789",
          source_document_reference: "2025 spouse-loan fixture mortgage",
          box1_mortgage_interest: 18_000,
          box1_current_year_deductible_interest: 18_000,
          box1_deduction_workpaper_reference: "2025 mortgage workpaper",
          for_routing: "A",
        }],
      }
      : {}),
    ...(source === "two_interest" || source === "two_interest_dividend" ||
        source === "two_interest_two_dividends"
      ? {
        f1099int: [{
          payer_name: "First taxable bond payer",
          source_document_reference: "issued-2025-first-bond-interest",
          box1: 30_000,
          investment_property_for_form4952: true,
        }, {
          payer_name: "Second taxable bond payer",
          source_document_reference: "issued-2025-second-bond-interest",
          box1: 30_000,
          investment_property_for_form4952: true,
        }],
      }
      : source === "interest" || source === "interest_dividend" ||
          source === "interest_two_dividends"
      ? {
        f1099int: [{
          payer_name: "Taxable bond payer",
          ...(source === "interest_dividend" ||
              source === "interest_two_dividends"
            ? { source_document_reference: "issued-2025-bond-interest" }
            : {}),
          box1: source === "interest_dividend" ||
              source === "interest_two_dividends"
            ? 60_000
            : 100_000,
          investment_property_for_form4952: true,
        }],
      }
      : source === "treasury_oid"
      ? {
        f1099int: [{
          payer_name: "Treasury interest broker",
          source_document_reference: "issued-2025-treasury-box3",
          box3: 60_000,
          investment_property_for_form4952: true,
        }],
        f1099oid: [{
          payer_name: "Taxable OID bond broker",
          source_document_reference: "issued-2025-taxable-oid-box1",
          box1_oid: 40_000,
          investment_property_for_form4952: true,
        }],
      }
      : source === "dividend" || source === "qualified_dividend"
      ? {
        f1099div: [{
          payerName: "Taxable stock payer",
          source_document_reference: "issued-2025-stock-dividend",
          isNominee: false,
          box11: false,
          box1a: source === "qualified_dividend" ? 34_000 : 100_000,
          ...(source === "qualified_dividend" ? { box1b: 15_000 } : {}),
          investment_property_for_form4952: true,
        }],
      }
      : {
        f1099oid: [{
          payer_name: "Taxable OID bond payer",
          box1_oid: source === "oid_dividend" ? 60_000 : 100_000,
          investment_property_for_form4952: true,
        }],
      }),
    ...(source === "interest_dividend" || source === "oid_dividend" ||
        source === "two_interest_dividend" ||
        source === "two_interest_two_dividends" ||
        source === "interest_two_dividends"
      ? {
        f1099div: [
          {
            payerName: "Taxable stock payer",
            source_document_reference: "issued-2025-stock-dividend",
            isNominee: false,
            box11: false,
            box1a: source === "interest_two_dividends" ||
                source === "two_interest_two_dividends"
              ? 15_000
              : 40_000,
            ...(source === "two_interest_two_dividends"
              ? { box1b: 5_000 }
              : {}),
            investment_property_for_form4952: true,
          },
          ...(source === "interest_two_dividends" ||
              source === "two_interest_two_dividends"
            ? [{
              payerName: "Second taxable stock payer",
              source_document_reference: "issued-2025-second-stock-dividend",
              isNominee: false,
              box11: false,
              box1a: 25_000,
              investment_property_for_form4952: true,
            }]
            : []),
        ],
      }
      : {}),
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
    form4952: {
      investment_interest_expense: 20_000,
      ...(qualifiedDividendElection > 0
        ? { investment_income_election: qualifiedDividendElection }
        : {}),
      direct_debt_trace: spouseOwned
        ? { ...trace, owner_tin: "444556666" }
        : trace,
      amt_refigure: {
        prior_year_disallowed_interest: 0,
        interest_on_private_activity_bonds: 0,
        other_gross_income_adjustment: 0,
        qualified_dividends_adjustment: 0,
        net_disposition_gain_adjustment: 0,
        net_capital_gain_adjustment: 0,
        investment_expenses_adjustment: 0,
      },
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 4952 traced qualified-dividend election joins Schedule D tax, native, and PDF", async () => {
  const elected = filing("qualified_dividend", false, 1_000);
  assertEquals(elected.diagnostics, []);
  const fields = elected.pending.form4952!;
  assertEquals(fields.line4a, 34_000);
  assertEquals(fields.line4b, 15_000);
  assertEquals(fields.line4g, 1_000);
  assertEquals(fields.line8, 20_000);
  assertEquals(fields.line7, 0);
  assertEquals(elected.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertEquals(elected.pending.f1040?.line3a_qualified_dividends, 15_000);
  assertEquals(elected.pending.f1040?.line3b_ordinary_dividends, 34_000);
  assertEquals(elected.pending.f1040?.line12e_itemized_deductions, 20_000);
  assertEquals(
    elected.pending.income_tax_calculation?.form4952_election,
    1_000,
  );
  const finalFiler = {
    ...testFiler(),
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
  };
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: elected.pending,
      filer: finalFiler,
    }),
    "<InvestmentIncomeElectionAmt>1000</InvestmentIncomeElectionAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, elected.pending).line4g,
    1_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, finalFiler, elected.pending).length,
    1,
  );
  const bundle = await buildMefBundle(buildPending(elected.pending), {
    filer: finalFiler,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentIncomeElectionAmt>1000</InvestmentIncomeElectionAmt>",
  );
  const pdf = await buildPdfBytes(
    buildPending(elected.pending),
    finalFiler,
    ".pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...elected.pending,
          f1040: {
            ...elected.pending.f1040,
            line16_income_tax:
              Number(elected.pending.f1040?.line16_income_tax ?? 0) + 1,
          },
        },
        filer: finalFiler,
      }),
    Error,
    "Schedule D Tax Worksheet",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields!(fields, {
        ...elected.pending,
        income_tax_calculation: {
          ...elected.pending.income_tax_calculation,
          form4952_election: 999,
        },
      }),
    Error,
    "Schedule D Tax Worksheet",
  );
  const dividendSource = elected.pending.f1099div as {
    f1099divs: Record<string, unknown>[];
  };
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...elected.pending,
          f1099div: {
            f1099divs: [{
              ...dividendSource.f1099divs[0],
              box1b: 14_999,
            }],
          },
        },
        filer: finalFiler,
      }),
    Error,
  );
});

Deno.test("Form 4952 direct loan reaches Schedule A, Form 1040, native, and PDF", () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line1, 20_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 100_000);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 20_000);
  const fields = result.pending.form4952!;
  const xml = nativeForm4952.build(fields, {
    pending: result.pending,
    filer: testFiler(),
  });
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
});

Deno.test("Form 4952 traced loan combines Treasury box 3 and taxable OID box 1 investment income", () => {
  const result = filing("treasury_oid");
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form4952!;
  assertEquals(fields.line1, 20_000);
  assertEquals(fields.line4a, 100_000);
  assertEquals(fields.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 100_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentIncomeAmt>100000</InvestmentIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
  const interest = result.pending.f1099int!;
  const oid = result.pending.f1099oid!;
  const interestRows = interest.f1099ints;
  const oidRows = oid.f1099oids;
  if (!Array.isArray(interestRows) || !Array.isArray(oidRows)) {
    throw new Error("Expected synthetic investment payer rows");
  }
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...result.pending,
          f1099oid: {
            ...oid,
            f1099oids: [{
              ...oidRows[0],
              source_document_reference:
                interestRows[0].source_document_reference,
            }],
          },
        },
        filer: testFiler(),
      }),
    Error,
    "supported 1099-INT, 1099-DIV, or taxable 1099-OID investment payer inventory",
  );
  assertThrows(
    () =>
      form4952Pdf.projectFields!(fields, {
        ...result.pending,
        f1099oid: {
          ...oid,
          f1099oids: [{ ...oidRows[0], box1_oid: 39_999 }],
        },
      }),
    Error,
    "Form 4952 interest path supports only",
  );
  assertThrows(
    () =>
      form4952Pdf.instances!(
        fields,
        { ...testFiler(), primarySSN: "999887777" },
        result.pending,
      ),
    Error,
    "owner must match the final filer",
  );
});

Deno.test("MFJ spouse-owned direct investment loan reaches joint Schedule A and Form 1040 with final owner checks", async () => {
  const result = filing("interest", true);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line1, 20_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 100_000);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 38_000);
  const fields = result.pending.form4952!;
  const jointFiler = {
    ...testFiler(),
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "444556666",
      firstName: "Sam",
      lastName: "Taxpayer",
      nameControl: "TAXP",
    },
  };
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: jointFiler,
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, jointFiler, result.pending).length,
    1,
  );
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: jointFiler,
    attachments: [],
  });
  const pdf = await buildPdfBytes(pending, jointFiler, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: result.pending,
        filer: {
          ...jointFiler,
          spouse: { ...jointFiler.spouse, ssn: "999887777" },
        },
      }),
    Error,
    "owner must match the final filer or joint spouse",
  );
  assertThrows(
    () => form4952Pdf.instances!(fields, testFiler(), result.pending),
    Error,
    "owner must match the final filer or joint spouse",
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...result.pending,
          general: { ...result.pending.general, spouse_ssn: "999-88-7777" },
        },
        filer: jointFiler,
      }),
    Error,
    "matching source and final joint-return identities",
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: {
          ...result.pending,
          form4952: {
            ...fields,
            amt_refigure: {
              ...(fields.amt_refigure as Record<string, unknown>),
              other_gross_income_adjustment: 1,
            },
          },
        },
        filer: jointFiler,
      }),
    Error,
    "zero AMT refigure adjustments",
  );
});

Deno.test("Form 4952 traced loan with one ordinary dividend payer reaches native and PDF", () => {
  const result = filing("dividend");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 100_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: { ...result.pending, f1099div: { f1099divs: [] } },
        filer: testFiler(),
      }),
    Error,
    "one retained loan",
  );
});

Deno.test("Form 4952 traced loan excludes one payer's qualified dividends and carries the disallowed interest forward", async () => {
  const result = filing("qualified_dividend");
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form4952!;
  assertEquals(fields.line1, 20_000);
  assertEquals(fields.line4a, 34_000);
  assertEquals(fields.line4b, 15_000);
  assertEquals(fields.line4c, 19_000);
  assertEquals(fields.line4g, 0);
  assertEquals(fields.line6, 19_000);
  assertEquals(fields.line7, 1_000);
  assertEquals(fields.line8, 19_000);
  assertEquals(result.pending.f1040?.line3a_qualified_dividends, 15_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 34_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 19_000);
  assertEquals(result.pending.f1040?.line12e_itemized_deductions, 19_000);

  const xml = nativeForm4952.build(fields, {
    pending: result.pending,
    filer: testFiler(),
  });
  assertStringIncludes(
    xml,
    "<InvestmentPropQualDividendsAmt>15000</InvestmentPropQualDividendsAmt>",
  );
  assertStringIncludes(
    xml,
    "<DisallowedCarryForwardExpAmt>1000</DisallowedCarryForwardExpAmt>",
  );
  assertStringIncludes(
    xml,
    "<InvestmentInterestExpDeductAmt>19000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line4b,
    15_000,
  );
  assertEquals(form4952Pdf.projectFields!(fields, result.pending).line7, 1_000);
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );

  const pending = buildPending(result.pending);
  const finalFiler = {
    ...testFiler(),
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
  };
  const bundle = await buildMefBundle(pending, {
    filer: finalFiler,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentPropQualDividendsAmt>15000</InvestmentPropQualDividendsAmt>",
  );
  const pdf = await buildPdfBytes(pending, finalFiler, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  const source = result.pending.f1099div as {
    f1099divs: Record<string, unknown>[];
  };
  const changedDividend = {
    ...result.pending,
    f1099div: {
      f1099divs: [{ ...source.f1099divs[0], box1b: 14_999 }],
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: changedDividend,
      filer: testFiler(),
    }), Error);
  assertThrows(
    () => form4952Pdf.projectFields!(fields, changedDividend),
    Error,
  );

  const changedLine = {
    ...result.pending,
    f1040: {
      ...result.pending.f1040,
      line3a_qualified_dividends: 14_999,
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: changedLine,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form4952Pdf.projectFields!(fields, changedLine), Error);

  const changedLoan = {
    ...result.pending,
    form4952: {
      ...fields,
      direct_debt_trace: {
        ...trace,
        interest_payments: [{
          ...trace.interest_payments[0],
          interest_amount: 9_999,
        }, trace.interest_payments[1]],
      },
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: changedLoan,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form4952Pdf.projectFields!(fields, changedLoan), Error);
});

Deno.test("Form 4952 traced loan with one taxable OID payer reaches native and PDF", () => {
  const result = filing("oid");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 100_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: { ...result.pending, f1099oid: { f1099oids: [] } },
        filer: testFiler(),
      }),
    Error,
    "one retained loan",
  );
});

Deno.test("Form 4952 traced loan with interest and ordinary dividend payers reaches final return, native, and PDF", () => {
  const result = filing("interest_dividend");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 40_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
  const changed = {
    ...result.pending,
    f1099div: {
      f1099divs: [{
        ...(result.pending.f1099div as { f1099divs: Record<string, unknown>[] })
          .f1099divs[0],
        box1a: 39_999,
      }],
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: changed,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form4952Pdf.projectFields!(fields, changed), Error);
});

Deno.test("Form 4952 traced loan with OID and ordinary dividend payers reaches final return, native, and PDF", () => {
  const result = filing("oid_dividend");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 40_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: { ...result.pending, f1099oid: { f1099oids: [] } },
      filer: testFiler(),
    }), Error);
});

Deno.test("Form 4952 traced loan with two interest payers and one dividend payer reaches filing outputs", () => {
  const result = filing("two_interest_dividend");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 40_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  const changed = {
    ...result.pending,
    f1099int: {
      f1099ints: [
        ...(result.pending.f1099int as {
          f1099ints: Record<string, unknown>[];
        }).f1099ints.slice(0, 1),
        {
          ...(result.pending.f1099int as {
            f1099ints: Record<string, unknown>[];
          }).f1099ints[1],
          source_document_reference: "issued-2025-first-bond-interest",
        },
      ],
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: changed,
      filer: testFiler(),
    }), Error);
  assertThrows(() => form4952Pdf.projectFields!(fields, changed), Error);
});

Deno.test("Form 4952 traced loan joins two interest and two dividend payers with one qualified amount", async () => {
  const result = filing("two_interest_two_dividends");
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form4952!;
  assertEquals(fields.line1, 20_000);
  assertEquals(fields.line4a, 100_000);
  assertEquals(fields.line4b, 5_000);
  assertEquals(fields.line4g, 0);
  assertEquals(fields.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040?.line3a_qualified_dividends, 5_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 40_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentPropQualDividendsAmt>5000</InvestmentPropQualDividendsAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line4b,
    5_000,
  );
  const pending = buildPending(result.pending);
  const finalFiler = {
    ...testFiler(),
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
  };
  const bundle = await buildMefBundle(pending, {
    filer: finalFiler,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  const pdf = await buildPdfBytes(pending, finalFiler, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() > 0, true);

  const interestItems = (result.pending.f1099int as {
    f1099ints: Record<string, unknown>[];
  }).f1099ints;
  const dividendItems = (result.pending.f1099div as {
    f1099divs: Record<string, unknown>[];
  }).f1099divs;
  for (
    const changed of [
      {
        ...result.pending,
        f1099int: {
          f1099ints: [interestItems[0], {
            ...interestItems[1],
            source_document_reference:
              interestItems[0].source_document_reference,
          }],
        },
      },
      {
        ...result.pending,
        f1099div: {
          f1099divs: [{ ...dividendItems[0], box1b: 4_999 }, dividendItems[1]],
        },
      },
      {
        ...result.pending,
        f1099div: {
          f1099divs: [dividendItems[0], {
            ...dividendItems[1],
            source_document_reference:
              interestItems[0].source_document_reference,
          }],
        },
      },
      {
        ...result.pending,
        f1040: { ...result.pending.f1040, line3a_qualified_dividends: 4_999 },
      },
    ]
  ) {
    assertThrows(
      () =>
        nativeForm4952.build(fields, { pending: changed, filer: testFiler() }),
      Error,
    );
    assertThrows(() => form4952Pdf.projectFields!(fields, changed), Error);
  }
});

Deno.test("Form 4952 traced loan with two distinct interest payers reaches native and PDF", () => {
  const result = filing("two_interest");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 60_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentPropGrossIncomeAmt>60000</InvestmentPropGrossIncomeAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  assertEquals(
    form4952Pdf.instances!(fields, testFiler(), result.pending).length,
    1,
  );
  const original = (result.pending.f1099int as {
    f1099ints: Record<string, unknown>[];
  }).f1099ints;
  for (
    const changedPayers of [
      [{ ...original[0] }, {
        ...original[1],
        source_document_reference: original[0].source_document_reference,
      }],
      [{ ...original[0] }, { ...original[1], box1: 29_999 }],
    ]
  ) {
    const changed = {
      ...result.pending,
      f1099int: { f1099ints: changedPayers },
    };
    assertThrows(
      () =>
        nativeForm4952.build(fields, { pending: changed, filer: testFiler() }),
      Error,
    );
    assertThrows(() => form4952Pdf.projectFields!(fields, changed), Error);
  }
});

Deno.test("Form 4952 traced loan with one interest payer and two dividend payers reaches filing outputs", () => {
  const result = filing("interest_two_dividends");
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4952?.line4a, 100_000);
  assertEquals(result.pending.form4952?.line8, 20_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 60_000);
  assertEquals(result.pending.f1040?.line3b_ordinary_dividends, 40_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 20_000);
  const fields = result.pending.form4952!;
  assertStringIncludes(
    nativeForm4952.build(fields, {
      pending: result.pending,
      filer: testFiler(),
    }),
    "<InvestmentInterestExpDeductAmt>20000</InvestmentInterestExpDeductAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields!(fields, result.pending).line8,
    20_000,
  );
  const originalDividends = (result.pending.f1099div as {
    f1099divs: Record<string, unknown>[];
  }).f1099divs;
  const duplicateSource = {
    ...result.pending,
    f1099div: {
      f1099divs: [originalDividends[0], {
        ...originalDividends[1],
        source_document_reference: originalDividends[0]
          .source_document_reference,
      }],
    },
  };
  assertThrows(() =>
    nativeForm4952.build(fields, {
      pending: duplicateSource,
      filer: testFiler(),
    }), Error);
  assertThrows(
    () => form4952Pdf.projectFields!(fields, duplicateSource),
    Error,
  );
});

Deno.test("Form 4952 direct loan rejects payment, loan, and owner tampering at export", () => {
  const result = filing();
  const fields = result.pending.form4952!;
  const changed = {
    ...result.pending,
    form4952: {
      ...fields,
      direct_debt_trace: {
        ...trace,
        interest_payments: [{
          ...trace.interest_payments[0],
          payment_record_reference: "different bank record",
        }, trace.interest_payments[1]],
      },
    },
  };
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: changed,
        filer: testFiler(),
      }),
    Error,
    "matching payments",
  );
  assertThrows(
    () => form4952Pdf.projectFields!(fields, changed),
    Error,
    "matching payments",
  );
  assertThrows(
    () =>
      nativeForm4952.build(fields, {
        pending: result.pending,
        filer: { ...testFiler(), primarySSN: "987654321" },
      }),
    Error,
    "owner",
  );
  assertThrows(
    () =>
      form4952Pdf.instances!(fields, {
        ...testFiler(),
        primarySSN: "987654321",
      }, result.pending),
    Error,
    "owner",
  );
});
