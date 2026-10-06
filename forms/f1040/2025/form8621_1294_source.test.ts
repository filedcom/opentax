import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { schedule2Pdf } from "./pdf/forms/schedule2.ts";
import { schedule2 as schedule2Native } from "./mef/forms/schedule2.ts";
import { form8621Pdf } from "./pdf/forms/f8621.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import { ExcessEventKind } from "../nodes/inputs/f8621/excess_distribution.ts";
import { calculateSection1294PriorStatus } from "../nodes/inputs/f8621/section1294.ts";

const base = pdfReviewFixtures.find((row) => row.id === "single-w2-refund")!;

function copy(document_id: string, content: string) {
  const bytes = new TextEncoder().encode(content);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
}

Deno.test("Form 8621 Part VI allocates prior elections newest first and checks acceptance bytes", () => {
  const election = (year: number, earnings: number, tax: number) => ({
    election_tax_year: year,
    remaining_undistributed_earnings_usd: earnings,
    deferred_tax_outstanding_usd: tax,
    prior_filed_form: {
      ...copy(`filed-${year}`, `Accepted filed Form 8621 ${year}`),
      pfic_reference_id: "QEF001",
      prior_line8e_undistributed_earnings_usd: earnings,
      prior_line9c_deferred_tax_usd: tax,
      submission_id: `submission-${year}`,
    },
    accepted_acknowledgment: {
      ...copy(`ack-${year}`, `Accepted acknowledgment ${year}`),
      submission_id: `submission-${year}`,
      disposition: "Accepted" as const,
    },
    ...(year < 2024
      ? {
        latest_2024_status: {
          ...copy(
            `status-2024-${year}`,
            `Accepted 2024 status of ${year} election`,
          ),
          pfic_reference_id: "QEF001",
          election_tax_year: year,
          line18_earnings_before_2024_termination_usd: earnings,
          line19_deferred_tax_before_2024_termination_usd: tax,
          line22_earnings_terminated_2024_usd: 0,
          line23_deferred_tax_due_2024_usd: 0,
          submission_id: "submission-status-2024",
          accepted_acknowledgment: {
            ...copy("ack-status-2024", "Accepted 2024 Form 8621 status"),
            submission_id: "submission-status-2024",
            disposition: "Accepted" as const,
          },
        },
      }
      : {}),
  });
  const source = {
    filing_date: "2026-04-15",
    prior_elections: [election(2023, 1000, 200), election(2024, 2000, 400)],
    termination_events: [{
      event_id: "distribution-2025",
      date: "2025-09-01",
      description: "Cash distribution",
      earnings_distributed_or_deemed_usd: 2500,
      activity_record: copy("distribution-record", "2025 distribution 2500"),
    }],
  };
  const columns = calculateSection1294PriorStatus(source, "QEF001");
  assertEquals(columns.map((row) => row.taxYear), [2024, 2023]);
  assertEquals(columns.map((row) => row.earningsDistributed), [2000, 500]);
  assertEquals(columns.map((row) => row.taxDue), [400, 100]);
  assertEquals(columns[1].taxRemaining, 100);
  assertEquals(
    calculateSection1294PriorStatus({
      ...source,
      filing_date: "2026-02-01",
      termination_events: [{
        ...source.termination_events[0],
        earnings_distributed_or_deemed_usd: 3000,
      }],
    }, "QEF001").map((row) => row.taxDue),
    [400, 200],
  );
  assertThrows(
    () =>
      calculateSection1294PriorStatus({
        ...source,
        filing_date: "2026-02-01",
        termination_events: [{
          ...source.termination_events[0],
          earnings_distributed_or_deemed_usd: 1900,
        }],
      }, "QEF001"),
    Error,
    "line 26 negative",
  );
  const priorPartial = election(2023, 1000, 200);
  const partialSource = {
    ...source,
    prior_elections: [{
      ...priorPartial,
      prior_filed_form: {
        ...priorPartial.prior_filed_form,
        prior_line8e_undistributed_earnings_usd: 2000,
        prior_line9c_deferred_tax_usd: 400,
      },
      latest_2024_status: {
        ...priorPartial.latest_2024_status!,
        line18_earnings_before_2024_termination_usd: 2000,
        line19_deferred_tax_before_2024_termination_usd: 400,
        line22_earnings_terminated_2024_usd: 1000,
        line23_deferred_tax_due_2024_usd: 200,
        line25_deferred_tax_remaining_usd: 200,
      },
    }, election(2024, 2000, 400)],
  };
  assertEquals(
    calculateSection1294PriorStatus(partialSource, "QEF001")[1].earnings,
    1000,
  );
  assertThrows(
    () =>
      calculateSection1294PriorStatus({
        ...partialSource,
        prior_elections: [{
          ...partialSource.prior_elections[0],
          latest_2024_status: {
            ...partialSource.prior_elections[0].latest_2024_status!,
            line25_deferred_tax_remaining_usd: 201,
          },
        }, partialSource.prior_elections[1]],
      }, "QEF001"),
    Error,
    "2024 accepted election status differs",
  );
  const covidElection = election(2020, 1000, 200);
  const covidSource = {
    ...source,
    prior_elections: [{
      ...covidElection,
      prior_filed_form: {
        ...covidElection.prior_filed_form,
        applicable_original_due_date: "2021-05-17",
        due_date_evidence: {
          ...copy(
            "irs-2020-due-date",
            "IRS Notice 2021-21 May 17 2021 due date",
          ),
          election_tax_year: 2020,
          applicable_original_due_date: "2021-05-17",
        },
      },
    }, election(2024, 2000, 400)],
  };
  assertEquals(
    calculateSection1294PriorStatus(covidSource, "QEF001")[1].taxDue,
    100,
  );
  assertThrows(
    () =>
      calculateSection1294PriorStatus({
        ...covidSource,
        prior_elections: [{
          ...covidSource.prior_elections[0],
          prior_filed_form: {
            ...covidSource.prior_elections[0].prior_filed_form,
            applicable_original_due_date: "2021-04-15",
          },
        }, covidSource.prior_elections[1]],
      }, "QEF001"),
    Error,
    "due date differs from retained evidence",
  );
  assertThrows(
    () =>
      calculateSection1294PriorStatus({
        ...source,
        prior_elections: [{
          ...source.prior_elections[0],
          accepted_acknowledgment: {
            ...source.prior_elections[0].accepted_acknowledgment,
            submission_id: "wrong-submission",
          },
        }, source.prior_elections[1]],
      }, "QEF001"),
    Error,
    "acceptance differ",
  );
});

Deno.test("Form 8621 Election B refigures the current return tax from QEF income", async () => {
  const sourceInputs: Parameters<typeof f1040_2025.executeReturn>[0] = {
    ...base.inputs,
    f8621: [{
      company_name: "QEF Source Fund",
      company_ein_or_ref: "QEF001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.QEF,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      qef_ordinary_income: 2000,
      qef_capital_gain: 0,
      parent_source: {
        corporation_address: {
          line1: "1 Fund Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "qef_new_2025",
        no_outstanding_section1294_election: true,
        issuer_record: copy(
          "issuer-2025",
          "Issuer's 2025 report for QEF Source Fund",
        ),
        qef_annual_statement: {
          ...copy("qef-2025", "QEF annual statement: 2000 ordinary, 0 capital"),
          ordinary_earnings_usd: 2000,
          net_capital_gain_usd: 0,
        },
        qef_1294_activity_record: {
          ...copy(
            "broker-2025",
            "Broker 2025 ledger: no distributions or transfers",
          ),
          distributions_cash_and_property_usd: 0,
          transferred_share_earnings_usd: 0,
        },
      },
      qef_1294_election: {
        distributions_cash_and_property_usd: 0,
        transferred_share_earnings_usd: 0,
        undistributed_ordinary_earnings_usd: 2000,
        undistributed_capital_gain_usd: 0,
        no_section951_inclusion: true,
      },
    }],
  };
  const result = f1040_2025.executeReturn(sourceInputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const f1040 = pending.f1040! as Record<string, number>;
  assertEquals(
    f1040.form8621_1294_total_tax_before_deferral,
    f1040.line24_total_tax + f1040.form8621_1294_deferred_tax,
  );
  assertEquals(f1040.line15_taxable_income, 61250);
  assertEquals(f1040.form8621_1294_total_tax_before_deferral, 8395);
  assertEquals(f1040.form8621_1294_deferred_tax, 440);
  assertEquals(f1040.line24_total_tax, 7955);
  assertEquals(pending.schedule1?.line8z_form8621_qef, 2000);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<ElectToExtndTmForPymtOfTxInd>X</ElectToExtndTmForPymtOfTxInd>",
  );
  assertStringIncludes(xml, "<DeferredTaxAmt>440</DeferredTaxAmt>");
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  const doc = await PDFDocument.load(pdf);
  assertEquals(doc.getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    2,
  );
  const reviewPdf = Deno.env.get("FORM8621_REVIEW_PDF");
  if (reviewPdf) await Deno.writeFile(reviewPdf, pdf);
  for (
    const mutation of [
      (p: Record<string, any>) =>
        p.income_tax_calculation.form8621_1294_undistributed_ordinary++,
      (p: Record<string, any>) => p.f1040.form8621_1294_deferred_tax++,
      (p: Record<string, any>) =>
        p.f1040.form8621_1294_deferred_tax_before_credits++,
    ]
  ) {
    const changed = structuredClone(pending) as Record<string, any>;
    mutation(changed);
    assertThrows(
      () => buildMefXml(changed, base.filer),
      Error,
      "Form 8621 section 1294",
    );
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        path,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8621 retains one filing and two distinct Part V continuation pages", async () => {
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8621: [{
      company_name: "Two Disposition Fund",
      company_ein_or_ref: "PFICTWO",
      country_of_incorporation: "Ireland",
      regime: PficRegime.EXCESS_DISTRIBUTION,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      parent_source: {
        corporation_address: {
          line1: "2 Fund Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "section1291_no_new_election",
        no_outstanding_section1294_election: true,
        issuer_record: copy("issuer-two", "Issuer 2025 holdings and two sales"),
      },
      excess_events: [
        {
          kind: ExcessEventKind.Disposition,
          amount_usd: 1000,
          holding_period_start: "2025-01-01",
          event_date: "2025-06-30",
          first_pfic_tax_year: 2025,
          year_charges: [],
        },
        {
          kind: ExcessEventKind.Disposition,
          amount_usd: 1500,
          holding_period_start: "2025-07-01",
          event_date: "2025-12-15",
          first_pfic_tax_year: 2025,
          year_charges: [],
        },
      ],
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    5,
  );
  assertEquals(
    new Set(
      origins.filter((origin) => origin.formKey === "form8621").map((origin) =>
        origin.formCopy
      ),
    ),
    new Set([1]),
  );
});

Deno.test("Form 8621 continuing QEF Part VI joins Schedule 2 and prints page 4", async () => {
  const prior = {
    election_tax_year: 2024,
    remaining_undistributed_earnings_usd: 2000,
    deferred_tax_outstanding_usd: 400,
    prior_filed_form: {
      ...copy("filed-2024", "Accepted filed 2024 Form 8621"),
      pfic_reference_id: "QEF001",
      prior_line8e_undistributed_earnings_usd: 2000,
      prior_line9c_deferred_tax_usd: 400,
      submission_id: "submission-2024",
    },
    accepted_acknowledgment: {
      ...copy("ack-2024", "IRS acceptance acknowledgment 2024"),
      submission_id: "submission-2024",
      disposition: "Accepted" as const,
    },
  };
  const partVIInputs: Parameters<typeof f1040_2025.executeReturn>[0] = {
    ...base.inputs,
    f8621: [{
      company_name: "QEF Source Fund",
      company_ein_or_ref: "QEF001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.QEF,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      parent_source: {
        corporation_address: {
          line1: "1 Fund Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: false,
        election_status: "qef_continuing",
        no_outstanding_section1294_election: false,
        issuer_record: copy("issuer-continuing", "2025 issuer QEF holdings"),
        qef_annual_statement: {
          ...copy("qef-2025-zero", "2025 QEF annual statement zero earnings"),
          ordinary_earnings_usd: 0,
          net_capital_gain_usd: 0,
        },
        prior_election_filing: {
          ...copy("prior-qef-election", "Accepted 2024 QEF election"),
          tax_year: 2024,
          election_kind: "qef",
          accepted_submission_id: "submission-2024",
          acceptance_record: {
            ...copy("prior-qef-ack", "IRS acceptance acknowledgment"),
            submission_id: "submission-2024",
            disposition: "Accepted",
          },
        },
        section1294_prior_status: {
          filing_date: "2026-04-15",
          prior_elections: [prior],
          termination_events: [{
            event_id: "2025-distribution",
            date: "2025-09-01",
            description: "Cash distribution",
            earnings_distributed_or_deemed_usd: 1000,
            activity_record: copy(
              "broker-2025-distribution",
              "QEF cash distribution 1000",
            ),
          }],
        },
      },
    }],
  };
  const result = f1040_2025.executeReturn(partVIInputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const column = calculateSection1294PriorStatus(
    (result.pending.form8621 as any).items[0].item.parent_source
      .section1294_prior_status,
    "QEF001",
  )[0];
  assertEquals(pending.schedule2?.line17z_form8621_1294_deferred_tax, 200);
  assertEquals(
    pending.schedule2?.line17q_form8621_1294_interest,
    column.interestDue,
  );
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<OutstandingElectionTaxYr>2024</OutstandingElectionTaxYr>",
  );
  assertStringIncludes(xml, "<OtherTaxTxt>1294DT</OtherTaxTxt>");
  assertStringIncludes(xml, "<AccruedInterestDueThisRetAmt");
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    3,
  );
  const combinedStatement = await PDFDocument.create();
  await schedule2Pdf.appendSupplementalPages!(
    combinedStatement,
    pending.schedule2 as Record<string, unknown>,
    base.filer,
    {
      form8621: pending.form8621 as Record<string, unknown>,
      form8978_reporting_year: { schedule2_line17z_reduction: 50 },
    },
  );
  assertEquals(combinedStatement.getPageCount(), 1);
  const canceledLine17z = schedule2Native.build(
    pending.schedule2 as Record<string, unknown>,
    {
      pending: {
        form8621: pending.form8621,
        form8978_reporting_year: { schedule2_line17z_reduction: 200 },
      },
      documentIdsByPendingKey: {
        form8621: ["irs8621-1"],
        any_other_taxes_statement: ["other-taxes-1"],
      },
    } as any,
  );
  assertStringIncludes(
    canceledLine17z,
    '<TotalAnyOtherTaxesAmt referenceDocumentId="other-taxes-1" referenceDocumentName="AnyOtherTaxesStatement">0</TotalAnyOtherTaxesAmt>',
  );
  const reviewPdf = Deno.env.get("FORM8621_PARTVI_REVIEW_PDF");
  if (reviewPdf) await Deno.writeFile(reviewPdf, pdf);
  const changed = structuredClone(pending) as Record<string, any>;
  changed.schedule2.line17z_form8621_1294_deferred_tax++;
  assertThrows(() => buildMefXml(changed, base.filer), Error);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        path,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
});

// A seventh outstanding election requires a second physical Part VI page.
Deno.test("Form 8621 Part VI continues a seventh sourced election on page 4", async () => {
  const sourceInputs: Parameters<typeof f1040_2025.executeReturn>[0] = {
    ...base.inputs,
    f8621: [{
      company_name: "QEF Seven Elections",
      company_ein_or_ref: "QEF007",
      country_of_incorporation: "Ireland",
      regime: PficRegime.QEF,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      parent_source: {
        corporation_address: {
          line1: "7 Fund Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: false,
        election_status: "qef_continuing",
        no_outstanding_section1294_election: false,
        issuer_record: copy("issuer-seven", "Issuer 2025 holdings"),
        qef_annual_statement: {
          ...copy("qef-seven", "QEF 2025 zero earnings"),
          ordinary_earnings_usd: 0,
          net_capital_gain_usd: 0,
        },
        prior_election_filing: {
          ...copy("prior-qef-seven", "Accepted 2024 QEF election"),
          tax_year: 2024,
          election_kind: "qef",
          accepted_submission_id: "submission-2024",
          acceptance_record: {
            ...copy("prior-qef-seven-ack", "Accepted submission 2024"),
            submission_id: "submission-2024",
            disposition: "Accepted",
          },
        },
        section1294_prior_status: {
          filing_date: "2026-04-15",
          prior_elections: [2024, 2023, 2022, 2021, 2018, 2017, 2016].map((
            year,
          ) => ({
            election_tax_year: year,
            remaining_undistributed_earnings_usd: 100,
            deferred_tax_outstanding_usd: 20,
            prior_filed_form: {
              ...copy(`filed-${year}`, `Filed Form 8621 ${year}`),
              pfic_reference_id: "QEF007",
              prior_line8e_undistributed_earnings_usd: 100,
              prior_line9c_deferred_tax_usd: 20,
              submission_id: `submission-${year}`,
            },
            accepted_acknowledgment: {
              ...copy(`ack-${year}`, `Accepted acknowledgment ${year}`),
              submission_id: `submission-${year}`,
              disposition: "Accepted",
            },
            ...(year < 2024
              ? {
                latest_2024_status: {
                  ...copy(
                    `status-${year}`,
                    `Accepted 2024 Form 8621 status ${year}`,
                  ),
                  pfic_reference_id: "QEF007",
                  election_tax_year: year,
                  line18_earnings_before_2024_termination_usd: 100,
                  line19_deferred_tax_before_2024_termination_usd: 20,
                  line22_earnings_terminated_2024_usd: 0,
                  line23_deferred_tax_due_2024_usd: 0,
                  submission_id: "status-submission-2024",
                  accepted_acknowledgment: {
                    ...copy("ack-status-2024", "Accepted 2024 status filing"),
                    submission_id: "status-submission-2024",
                    disposition: "Accepted",
                  },
                },
              }
              : {}),
          })),
          termination_events: [],
        },
      },
    }],
  };
  const result = f1040_2025.executeReturn(sourceInputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, base.filer);
  assertEquals((xml.match(/<ElectionStatus>/g) ?? []).length, 7);
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        xmlPath,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    4,
  );
  const reviewPdf = Deno.env.get("FORM8621_PARTVI_CONTINUATION_REVIEW_PDF");
  if (reviewPdf) await Deno.writeFile(reviewPdf, pdf);
});

Deno.test("Form 8621 multiple MTM dispositions keep sale sources and separate net gains and losses", async () => {
  const sale = (
    id: string,
    value: number,
    basis: number,
    inclusions: number,
  ) => ({
    transaction_id: id,
    disposition_date: id === "sale-gain" ? "2025-06-01" : "2025-10-01",
    shares_disposed: 10,
    fair_market_value_usd: value,
    adjusted_basis_usd: basis,
    unreversed_inclusions_usd: inclusions,
    broker_record_id: `${id}-broker`,
    basis_record_id: `${id}-basis`,
    broker_record: copy(`${id}-broker`, `${id} broker proceeds ${value}`),
    basis_record: copy(`${id}-basis`, `${id} adjusted basis ${basis}`),
  });
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8621: [{
      company_name: "MTM Source Fund",
      company_ein_or_ref: "MTM001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.MTM,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      mtm_adjusted_basis_at_year_end: 20000,
      mtm_unreversed_inclusions: 0,
      mtm_dispositions: [
        sale("sale-gain", 2400, 2000, 0),
        sale("sale-loss", 1800, 2000, 300),
      ],
      parent_source: {
        corporation_address: {
          line1: "1 Market Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "mtm_new_2025",
        no_outstanding_section1294_election: true,
        issuer_record: copy(
          "mtm-issuer",
          "Issuer 2025 holdings and exchange listing",
        ),
        mtm_year_end_value_record: {
          ...copy("mtm-quote", "Market quoted value 20000 at 2025 year end"),
          quoted_value_usd: 20000,
          market_name: "Recognized Exchange",
        },
        mtm_adjusted_basis_record: {
          ...copy("mtm-basis", "Adjusted stock basis 20000 and no inclusions"),
          adjusted_basis_usd: 20000,
          unreversed_inclusions_usd: 0,
        },
      },
    }],
  });
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line8z_form8621_mtm, 200);
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<OrdinaryIncomeFromPFICStkAmt>400</OrdinaryIncomeFromPFICStkAmt>",
  );
  assertStringIncludes(
    xml,
    "<LossLimitedByOrdinaryIncomeAmt>-200</LossLimitedByOrdinaryIncomeAmt>",
  );
  assertStringIncludes(xml, "<GainOrLossMrktToMrktElectStmt");
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    3,
  );
  const reviewPdf = Deno.env.get("FORM8621_MTM_REVIEW_PDF");
  if (reviewPdf) await Deno.writeFile(reviewPdf, pdf);
  const line = (pending.form8621 as any).items[0];
  const manyLine = {
    ...line,
    item: {
      ...line.item,
      mtm_dispositions: Array.from({ length: 20 }, (_, index) => ({
        ...line.item.mtm_dispositions[index % 2],
        transaction_id: `pagination-${index}`,
      })),
    },
  };
  const manyPages = await PDFDocument.create();
  await form8621Pdf.appendSupplementalPages!(manyPages, {
    _form8621_line: manyLine,
    _form8621_partv_continuations: [],
    _form8621_partvi_continuations: [],
  }, base.filer);
  if (manyPages.getPageCount() < 2) {
    throw new Error("Form 8621 MTM statement did not continue across pages");
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        path,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 8621 line 14c residual capital loss routes through sourced Form 8949", async () => {
  const sale = {
    transaction_id: "mtm-capital-loss",
    disposition_date: "2025-10-01",
    shares_disposed: 10,
    fair_market_value_usd: 1800,
    adjusted_basis_usd: 2100,
    unreversed_inclusions_usd: 100,
    broker_record_id: "mtm-capital-broker",
    basis_record_id: "mtm-capital-basis",
    broker_record: {
      ...copy(
        "mtm-capital-broker",
        "Broker 2025 MTM sale proceeds 1800, no Form 1099-B",
      ),
      tax_form_kind: "no_1099B" as const,
    },
    basis_record: copy(
      "mtm-capital-basis",
      "MTM sale adjusted basis 2100, inclusions 100",
    ),
    other_loss_review: {
      acquisition_date: "2025-01-01",
      capital_asset_held_for_investment: true as const,
      broker_tax_form: "no_1099B" as const,
      wash_sale_disallowed_usd: 0 as const,
      acquisition_record: {
        ...copy("mtm-acquisition", "Bought investment PFIC stock 2025-01-01"),
        acquisition_date: "2025-01-01",
        capital_asset_held_for_investment: true as const,
      },
    },
  };
  const inputs = {
    ...base.inputs,
    f8621: [{
      company_name: "MTM Capital Fund",
      company_ein_or_ref: "MTM002",
      country_of_incorporation: "Ireland",
      regime: PficRegime.MTM,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      mtm_adjusted_basis_at_year_end: 20000,
      mtm_unreversed_inclusions: 0,
      mtm_dispositions: [sale],
      parent_source: {
        corporation_address: {
          line1: "2 Market Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "mtm_new_2025" as const,
        no_outstanding_section1294_election: true,
        issuer_record: copy(
          "mtm-capital-issuer",
          "Issuer 2025 investment shares",
        ),
        mtm_year_end_value_record: {
          ...copy("mtm-capital-quote", "Year end quoted value 20000"),
          quoted_value_usd: 20000,
          market_name: "Recognized Exchange",
        },
        mtm_adjusted_basis_record: {
          ...copy("mtm-capital-year-basis", "Year end basis 20000"),
          adjusted_basis_usd: 20000,
          unreversed_inclusions_usd: 0,
        },
      },
    }],
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule1?.line8z_form8621_mtm, -100);
  assertEquals(pending.form8949?.[0]?.gain_loss, -200);
  assertEquals(pending.form8949?.[0]?.part, "C");
  const xml = buildMefXml(pending, base.filer);
  assertStringIncludes(
    xml,
    "<LossExcessOfUnrvrsdInclsnAmt>200</LossExcessOfUnrvrsdInclsnAmt>",
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(
    origins.filter((origin) => origin.formKey === "form8621").length,
    2,
  );
  const reviewPdf = Deno.env.get("FORM8621_14C_REVIEW_PDF");
  if (reviewPdf) await Deno.writeFile(reviewPdf, pdf);
  const changed = structuredClone(pending) as Record<string, any>;
  changed.form8949[0].gain_loss--;
  assertThrows(() => buildMefXml(changed, base.filer), Error);
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        path,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(path);
  }
});
