import { assertEquals, assertThrows } from "@std/assert";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import { form8992Filer } from "../../form8992.fixture.ts";
import { form8611 } from "../../mef/forms/f8611.ts";
import { f8611, inputSchema } from "../../../nodes/inputs/f8611/index.ts";
import { schedule2 } from "../../../nodes/intermediate/aggregation/schedule2/index.ts";
import { form8611Pdf } from "./f8611.ts";

const owner = {
  source_document_reference: "Reviewed prior Forms 8586, 8609, and 8611",
  recapture_year: 2025,
  building_bin: "TX1234567",
  building_us_address: {
    line1: "10 Housing Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  placed_in_service_date: "2017-08-01",
  financed_with_tax_exempt_bonds: false,
  calculation: {
    source_type: "own_credit",
    recapture_event_type: "DISPOSITION",
    credit_period_start_year: 2017,
    recapture_required_after_exceptions: true,
    line1_prior_form8586_credits: 30_000,
    line2_worksheets: [],
    line6_qualified_basis_decrease_ratio: 1,
    line7_prior_accelerated_recapture_amount: 0,
    line11_interest_from_prior_years: 100,
    prior_unused_credits: 1_000,
    unused_additions_to_qualified_basis_credits: 0,
  },
} as const;

const recipient = {
  ...owner,
  building_bin: "TX7654321",
  building_us_address: {
    ...owner.building_us_address,
    line1: "20 Housing Way",
    zip: "78702",
  },
  calculation: {
    source_type: "pass_through",
    line8_flow_through_recapture: 2_000,
    line9_unused_accelerated_credit: 100,
    line11_interest_from_prior_years: 50,
    prior_unused_credits: 400,
    section42j5_partnership_interest_included: false,
  },
} as const;

Deno.test("Form 8611 projects two calculated buildings into native and one-page PDFs", () => {
  const f8611Source = inputSchema.parse({ f8611s: [owner, recipient] });
  const result = f8611.compute(
    { taxYear: 2025, formType: "f1040" },
    f8611Source,
  );
  const line16 = fieldsOf(result.outputs, schedule2)
    ?.line16_lihtc_recapture;
  assertEquals(line16, 10_740);
  const pending = { schedule2: { line16_lihtc_recapture: line16 } };
  const native = form8611.build(f8611Source, { pending });
  const pdf = form8611Pdf.instances!(f8611Source, form8992Filer, pending);
  assertEquals(native.length, 2);
  assertEquals(pdf.length, 2);
  assertEquals(form8611Pdf.pageIndices!(pdf[0]), [0]);
  assertEquals(pdf[0].line14, 9_090);
  assertEquals(pdf[0].line4_whole, "0");
  assertEquals(pdf[0].line4_fraction, "333");
  assertEquals(pdf[0].line6_whole, "1");
  assertEquals(pdf[0].line6_fraction, "000");
  assertEquals(pdf[0].placed_in_service_date, "08/01/2017");
  assertEquals(pdf[1].line8, 2_000);
  assertEquals(pdf[1].line14, 1_650);
  assertEquals(pdf[1].line1, undefined);
  assertEquals(
    native[0].includes("<RecaptureTaxAmt>9090</RecaptureTaxAmt>"),
    true,
  );
  assertEquals(
    native[1].includes("<RecaptureTaxAmt>1650</RecaptureTaxAmt>"),
    true,
  );
  assertEquals(
    form8611Pdf.fields.find((entry) => entry.domainKey === "line14")
      ?.pdfField,
    "topmostSubform[0].Page1[0].f1_25[0]",
  );
});

Deno.test("Form 8611 PDF preserves bond identity and section 42(j)(5) note", () => {
  const bonded = {
    ...recipient,
    financed_with_tax_exempt_bonds: true,
    tax_exempt_bond: {
      issuer_name: "Austin Housing Authority",
      issue_date: "2017-03-01",
      issue_name: "Housing Issue A",
      no_cusip: true,
    },
    calculation: {
      ...recipient.calculation,
      line11_interest_from_prior_years: 0,
      section42j5_partnership_interest_included: true,
    },
  };
  const [pdf] = form8611Pdf.instances!(
    { f8611s: [bonded] },
    form8992Filer,
    { schedule2: { line16_lihtc_recapture: 1_600 } },
  );
  assertEquals(pdf.bond_cusip, "None");
  assertEquals(pdf.bond_issue_date, "03/01/2017");
  assertEquals(pdf.line11, 0);
  assertEquals(pdf.section42j5_note, true);
});

Deno.test("Form 8611 PDF rejects changed recapture source or final return", () => {
  const f8611Source = { f8611s: [owner] };
  assertThrows(
    () => form8611Pdf.instances!(f8611Source, form8992Filer),
    Error,
    "needs the finalized return",
  );
  assertThrows(
    () =>
      form8611Pdf.instances!(
        f8611Source,
        form8992Filer,
        { schedule2: { line16_lihtc_recapture: 9_091 } },
      ),
    Error,
    "differs from Schedule 2 line 16",
  );
  assertThrows(() =>
    form8611Pdf.instances!(
      { f8611s: [{ ...owner, building_bin: "" }] },
      form8992Filer,
      { schedule2: { line16_lihtc_recapture: 9_090 } },
    ), Error);
  assertThrows(() =>
    form8611Pdf.instances!(
      {
        f8611s: [{
          ...owner,
          calculation: {
            ...owner.calculation,
            line6_qualified_basis_decrease_ratio: 0.5,
          },
        }],
      },
      form8992Filer,
      { schedule2: { line16_lihtc_recapture: 9_090 } },
    ), Error);
  assertThrows(
    () =>
      form8611Pdf.instances!(
        {
          f8611s: [owner, {
            ...owner,
            source_document_reference: "Second event",
          }],
        },
        form8992Filer,
        { schedule2: { line16_lihtc_recapture: 18_180 } },
      ),
    Error,
    "one combined document per building BIN",
  );
});
