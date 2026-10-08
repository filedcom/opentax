import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { sha256Hex } from "../../../2025/domains/execution/prepared-source.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA,
} from "../schedule_a/index.ts";
import {
  bindForm8283SectionBCarryoverSource,
  reviewForm8283SectionBCarryoverBundle,
  reviewForm8283SectionBCarryoverReturn,
  sectionBCarryoverAttachmentDescription,
} from "./section_b_carryover_source.ts";
import { inputSchema as form8283InputSchema } from "./index.ts";
import { form8283 } from "../../../2025/mef/forms/deductions/f8283/f8283.ts";
import { form8283Pdf } from "../../../2025/pdf/forms/deductions/f8283.ts";

const priorFormBytes = new TextEncoder().encode(
  "%PDF-1.7 reviewed prior Section B fixture",
);
const appraisalBytes = new TextEncoder().encode(
  "%PDF-1.7 reviewed qualified appraisal fixture",
);
const filedReturnBytes = new TextEncoder().encode(
  "%PDF-1.7 reviewed filed 2024 return with Schedule A fixture",
);
const acceptanceNoticeBytes = new TextEncoder().encode(
  "<Acknowledgement><SubmissionId>2024-submission-1</SubmissionId><EFIN>123456</EFIN><TaxYr>2024</TaxYr><ExtndGovernmentCd>IRS</ExtndGovernmentCd><SubmissionTyp>1040</SubmissionTyp><AcceptanceStatusTxt>Accepted</AcceptanceStatusTxt><StatusDt>2025-02-01</StatusDt><TIN>123456789</TIN></Acknowledgement>",
);
const filedReturnXmlBytes = new TextEncoder().encode(
  '<Return xmlns="http://www.irs.gov/efile"><ReturnHeader><TaxYr>2024</TaxYr><ReturnTypeCd>1040</ReturnTypeCd><Filer><PrimarySSN>123456789</PrimarySSN></Filer></ReturnHeader><ReturnData><IRS1040/><IRS1040ScheduleA><OtherThanByCashOrCheckAmt>15000</OtherThanByCashOrCheckAmt></IRS1040ScheduleA><IRS8283><ArtWorthAtLeast20000DollarsInd>X</ArtWorthAtLeast20000DollarsInd><PropertyInformation><DonatedPropertyDesc>Purchased oil painting</DonatedPropertyDesc><DonatedPropertyPhysicalCondTxt>Excellent</DonatedPropertyPhysicalCondTxt><AppraisedFairMarketValueAmt>30000</AppraisedFairMarketValueAmt><DonorAcquiredDt>2022-10</DonorAcquiredDt><DonorAcquisitionDesc>Purchase</DonorAcquisitionDesc><DonorCostOrAdjustedBasisAmt>20000</DonorCostOrAdjustedBasisAmt><DeductionClaimedAmt>30000</DeductionClaimedAmt></PropertyInformation><AppraiserName><PersonFirstNm>Alex</PersonFirstNm><PersonLastNm>Valuer</PersonLastNm></AppraiserName><AppraiserSignedDt>2024-12-15</AppraiserSignedDt><AppraiserUSAddress><AddressLine1Txt>10 Art Street</AddressLine1Txt><CityNm>Boston</CityNm><StateAbbreviationCd>MA</StateAbbreviationCd><ZIPCd>02108</ZIPCd></AppraiserUSAddress><AppraiserEIN>123456789</AppraiserEIN><ReceivedDt>2024-12-01</ReceivedDt><UsePropertyForUnrelatedUseInd>false</UsePropertyForUnrelatedUseInd><DoneeName><BusinessNameLine1Txt>Public Art Museum</BusinessNameLine1Txt></DoneeName><DoneeEIN>987654321</DoneeEIN><DoneeUSAddress><AddressLine1Txt>1 Museum Way</AddressLine1Txt><CityNm>Boston</CityNm><StateAbbreviationCd>MA</StateAbbreviationCd><ZIPCd>02108</ZIPCd></DoneeUSAddress></IRS8283></ReturnData></Return>',
);

Deno.test("Form 8283 binds a prior Section B artwork and required appraisal to one carryover", async () => {
  const source = {
    contribution_id: "artwork-2024-1",
    contribution_year: 2024,
    property_kind: "purchased_artwork",
    original_donation_date: "2024-12-01",
    donor_acquired_date: "2022-10-01",
    donee_name: "Public Art Museum",
    filed_return_reference: "2024-accepted-return-1",
    filed_taxpayer_ssn: "123456789",
    original_fmv: 30_000,
    original_2024_deduction_claim: 30_000,
    adjusted_basis: 20_000,
    previously_deducted_through_2024: 15_000,
    completed_prior_form: {
      source_document_reference: "prior-form-8283-section-b",
      file_name: "prior-8283.pdf",
      sha256: await sha256Hex(priorFormBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    required_qualified_appraisal: {
      source_document_reference: "prior-art-appraisal",
      file_name: "art-appraisal.pdf",
      sha256: await sha256Hex(appraisalBytes),
      reviewed_by: "Reviewer A",
      reviewed_on: "2026-09-30",
    },
    accepted_2024_filing: {
      filed_return_copy: {
        source_document_reference: "filed-2024-return-copy",
        file_name: "filed-2024-return.pdf",
        sha256: await sha256Hex(filedReturnBytes),
        reviewed_by: "Reviewer A",
        reviewed_on: "2026-09-30",
      },
      filed_return_xml: {
        source_document_reference: "filed-2024-return-xml",
        file_name: "filed-2024-return.xml",
        sha256: await sha256Hex(filedReturnXmlBytes),
        reviewed_by: "Reviewer A",
        reviewed_on: "2026-09-30",
      },
      acceptance_notice: {
        source_document_reference: "irs-2024-acceptance-notice",
        file_name: "accepted-2024-ack.xml",
        sha256: await sha256Hex(acceptanceNoticeBytes),
        reviewed_by: "Reviewer A",
        reviewed_on: "2026-09-30",
        submission_id: "2024-submission-1",
        accepted_status_reviewed: true,
      },
      filed_tax_year: 2024,
      filed_taxpayer_ssn: "123456789",
      filed_return_reference: "2024-accepted-return-1",
      filed_schedule_a_line12_noncash: 15_000,
      sole_2024_noncash_gift_confirmed: true,
      prior_artwork_and_appraisal_in_filing_reviewed: true,
    },
    section_b_appraiser_and_donee_signatures_reviewed: true,
    appraisal_was_attached_to_2024_return_reviewed: true,
    prior_form_printed_facts: {
      property_description: "Purchased oil painting",
      physical_condition: "Excellent",
      donor_acquisition_description: "Purchase",
      appraiser: {
        first_name: "Alex",
        last_name: "Valuer",
        ein: "123456789",
        us_address: {
          line1: "10 Art Street",
          city: "Boston",
          state: "MA",
          zip: "02108",
        },
        signed_date: "2024-12-15",
        signature_on_prior_form_reviewed: true,
      },
      donee: {
        organization_name: "Public Art Museum",
        ein: "987654321",
        us_address: {
          line1: "1 Museum Way",
          city: "Boston",
          state: "MA",
          zip: "02108",
        },
        received_date: "2024-12-01",
        unrelated_use: false,
        signature_on_prior_form_reviewed: true,
      },
      completed_form_fields_match_pdf_reviewed: true,
      appraisal_property_and_value_match_pdf_reviewed: true,
    },
  };
  const carryover = {
    contribution_id: "artwork-2024-1",
    contribution_year: 2024,
    original_category: "capital_gain_30",
    original_fmv: 30_000,
    adjusted_basis: 20_000,
    previously_deducted: 15_000,
    ordinary_carryover_rules_confirmed: true,
  };
  const bind = (
    review: unknown,
    prior: Uint8Array = priorFormBytes,
    appraisal: Uint8Array = appraisalBytes,
    row: unknown = carryover,
    priorXml: Uint8Array = filedReturnXmlBytes,
  ) =>
    bindForm8283SectionBCarryoverSource(
      review,
      row,
      "123456789",
      prior,
      appraisal,
      filedReturnBytes,
      acceptanceNoticeBytes,
      priorXml,
    );
  await bind(source);
  for (
    const [oldValue, newValue] of [
      ["<PrimarySSN>123456789", "<PrimarySSN>999999999"],
      [
        "<OtherThanByCashOrCheckAmt>15000",
        "<OtherThanByCashOrCheckAmt>14999",
      ],
      [
        "<AppraisedFairMarketValueAmt>30000",
        "<AppraisedFairMarketValueAmt>29999",
      ],
      [
        "<DonorCostOrAdjustedBasisAmt>20000",
        "<DonorCostOrAdjustedBasisAmt>19999",
      ],
      ["<DoneeEIN>987654321", "<DoneeEIN>987654320"],
      ["<AppraiserEIN>123456789", "<AppraiserEIN>123456780"],
    ]
  ) {
    const changedXml = new TextEncoder().encode(
      new TextDecoder().decode(filedReturnXmlBytes).replace(oldValue, newValue),
    );
    const changedDigest = await sha256Hex(changedXml);
    await assertRejects(() =>
      bind(
        {
          ...source,
          accepted_2024_filing: {
            ...source.accepted_2024_filing,
            filed_return_xml: {
              ...source.accepted_2024_filing.filed_return_xml,
              sha256: changedDigest,
            },
          },
        },
        priorFormBytes,
        appraisalBytes,
        carryover,
        changedXml,
      )
    );
  }
  for (
    const [oldValue, newValue] of [
      ["<AcceptanceStatusTxt>Accepted", "<AcceptanceStatusTxt>Rejected"],
      ["<TaxYr>2024", "<TaxYr>2023"],
      ["<SubmissionId>2024-submission-1", "<SubmissionId>other-submission"],
      ["<TIN>123456789", "<TIN>999999999"],
      ["<SubmissionTyp>1040", "<SubmissionTyp>1041"],
    ]
  ) {
    const changedNotice = new TextEncoder().encode(
      new TextDecoder().decode(acceptanceNoticeBytes).replace(
        oldValue,
        newValue,
      ),
    );
    const changedSha256 = await sha256Hex(changedNotice);
    await assertRejects(() =>
      bindForm8283SectionBCarryoverSource(
        {
          ...source,
          accepted_2024_filing: {
            ...source.accepted_2024_filing,
            acceptance_notice: {
              ...source.accepted_2024_filing.acceptance_notice,
              sha256: changedSha256,
            },
          },
        },
        carryover,
        "123456789",
        priorFormBytes,
        appraisalBytes,
        filedReturnBytes,
        changedNotice,
        filedReturnXmlBytes,
      )
    );
  }
  await assertRejects(() =>
    bind(source, new TextEncoder().encode("%PDF-1.7 changed prior form"))
  );
  await assertRejects(() =>
    bind(
      source,
      priorFormBytes,
      new TextEncoder().encode("%PDF-1.7 changed appraisal"),
    )
  );
  await assertRejects(() =>
    bind({ ...source, original_2024_deduction_claim: 19_999 })
  );
  await assertRejects(() =>
    bind({
      ...source,
      accepted_2024_filing: {
        ...source.accepted_2024_filing,
        filed_schedule_a_line12_noncash: 14_999,
      },
    })
  );
  await assertRejects(() =>
    bindForm8283SectionBCarryoverSource(
      source,
      carryover,
      "123456789",
      priorFormBytes,
      appraisalBytes,
      new TextEncoder().encode("%PDF-1.7 changed filed return"),
      acceptanceNoticeBytes,
      filedReturnXmlBytes,
    )
  );
  await assertRejects(() =>
    bindForm8283SectionBCarryoverSource(
      source,
      carryover,
      "123456789",
      priorFormBytes,
      appraisalBytes,
      filedReturnBytes,
      new TextEncoder().encode("<Acknowledgment>changed</Acknowledgment>"),
      filedReturnXmlBytes,
    )
  );
  await assertRejects(() =>
    bind({
      ...source,
      accepted_2024_filing: {
        ...source.accepted_2024_filing,
        filed_taxpayer_ssn: "999999999",
      },
    })
  );
  await assertRejects(() =>
    bind({ ...source, filed_taxpayer_ssn: "987654321" })
  );
  await assertRejects(() =>
    bind(source, priorFormBytes, appraisalBytes, {
      ...carryover,
      previously_deducted: 14_999,
    })
  );
  await assertRejects(() =>
    bind({ ...source, appraisal_was_attached_to_2024_return_reviewed: false })
  );
  await assertRejects(() =>
    bind({
      ...source,
      prior_form_printed_facts: {
        ...source.prior_form_printed_facts,
        donee: {
          ...source.prior_form_printed_facts.donee,
          organization_name: "Different Museum",
        },
      },
    })
  );
  await assertRejects(() =>
    bind({
      ...source,
      prior_form_printed_facts: {
        ...source.prior_form_printed_facts,
        appraiser: {
          ...source.prior_form_printed_facts.appraiser,
          ssn: "123456789",
        },
      },
    })
  );
  await assertRejects(() =>
    bind({
      ...source,
      prior_form_printed_facts: {
        ...source.prior_form_printed_facts,
        completed_form_fields_match_pdf_reviewed: false,
      },
    })
  );
  const context = {
    attachmentSha256ByFileName: {
      "prior-8283.pdf": source.completed_prior_form.sha256,
      "art-appraisal.pdf": source.required_qualified_appraisal.sha256,
    },
    attachmentDescriptionsByFileName: {
      "prior-8283.pdf": sectionBCarryoverAttachmentDescription(
        "completed_prior_form",
        "prior-8283.pdf",
      ),
      "art-appraisal.pdf": sectionBCarryoverAttachmentDescription(
        "required_qualified_appraisal",
        "art-appraisal.pdf",
      ),
    },
    documentIdsByAttachmentFileName: {
      "prior-8283.pdf": "BinaryAttachment0001",
      "art-appraisal.pdf": "BinaryAttachment0002",
    },
  };
  const reviewed = await reviewForm8283SectionBCarryoverBundle(
    source,
    carryover,
    "123456789",
    priorFormBytes,
    appraisalBytes,
    filedReturnBytes,
    acceptanceNoticeBytes,
    filedReturnXmlBytes,
    context,
  );
  assertEquals(reviewed.contributionId, "artwork-2024-1");
  assertEquals(reviewed.priorFormDocumentId, "BinaryAttachment0001");
  assertEquals(reviewed.appraisalDocumentId, "BinaryAttachment0002");
  await assertRejects(() =>
    reviewForm8283SectionBCarryoverBundle(
      source,
      carryover,
      "123456789",
      priorFormBytes,
      appraisalBytes,
      filedReturnBytes,
      acceptanceNoticeBytes,
      filedReturnXmlBytes,
      {
        ...context,
        documentIdsByAttachmentFileName: {
          ...context.documentIdsByAttachmentFileName,
          "art-appraisal.pdf": "BinaryAttachment0001",
        },
      },
    )
  );
  await assertRejects(() =>
    reviewForm8283SectionBCarryoverBundle(
      source,
      carryover,
      "123456789",
      priorFormBytes,
      appraisalBytes,
      filedReturnBytes,
      acceptanceNoticeBytes,
      filedReturnXmlBytes,
      {
        ...context,
        attachmentDescriptionsByFileName: {
          ...context.attachmentDescriptionsByFileName,
          "art-appraisal.pdf": "Wrong appraisal description",
        },
      },
    )
  );
  const scheduleSource = {
    agi: 100_000,
    force_itemized: true,
    capital_gain_50_percent_election_confirmed: true as const,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [carryover],
    noncash_contribution_items: [],
  };
  const result = scheduleA.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(scheduleSource),
  );
  const returnContext = {
    filer: {
      primarySSN: "123456789",
      nameLine1: "Artwork Donor",
      nameControl: "DONO",
      address: {
        line1: "1 Main Street",
        city: "Boston",
        state: "MA",
        zip: "02108",
      },
      filingStatus: FilingStatus.Single,
    },
    pending: {
      schedule_a: {
        ...scheduleSource,
        ...result.finalizations![0].fields,
      },
      f1040: {
        line11_agi: 100_000,
        line12e_itemized_deductions:
          result.outputs[0].fields.itemized_deductions,
      },
    },
  };
  assertEquals(
    reviewForm8283SectionBCarryoverReturn(source, carryover, returnContext),
    { contributionId: "artwork-2024-1", line13CarryoverDeduction: 5_000 },
  );
  assertThrows(() =>
    reviewForm8283SectionBCarryoverReturn(
      source,
      carryover,
      {
        ...returnContext,
        pending: {
          ...returnContext.pending,
          f1040: {
            ...returnContext.pending.f1040,
            line12e_itemized_deductions: 4_999,
          },
        },
      },
    )
  );
  assertThrows(() =>
    reviewForm8283SectionBCarryoverReturn(
      source,
      carryover,
      {
        ...returnContext,
        pending: {
          ...returnContext.pending,
          schedule_a: {
            ...returnContext.pending.schedule_a,
            line_13_contribution_carryover: 4_999,
          },
        },
      },
    )
  );
  const filedSource = form8283InputSchema.parse({
    carryover_evidence: [source],
  });
  assertThrows(
    () => form8283.build(filedSource, {}),
    Error,
    "Section B artwork carryover needs authenticated accepted 2024 filing",
  );
  assertThrows(
    () => form8283Pdf.instances!(filedSource, undefined, {}),
    Error,
    "Section B artwork carryover needs authenticated accepted 2024 filing",
  );
});
