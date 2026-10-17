import { EnergyType } from "../../nodes/inputs/credits/business/f8835/index.ts";
import {
  FORM8835_PURCHASE_STATEMENT_DESCRIPTION,
  QualifiedFacilityRequirement,
} from "../../nodes/inputs/credits/business/f8835/purchase-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import type { AtsAssumption } from "./scenario_1040_05_input.ts";
import { SCENARIO_1040_04_FACTS } from "./ty2025_cases.ts";

const PACKET = "irs-ty2025-ats-1040-04";
const STATEMENT_FILE = "Transfer Election Statement.pdf";
const STATEMENT_SHA256 =
  "5dd494c2ff29f13af108af76f27e6e2c3936b0ff5de009ed38b2abb080f5f523";

/** One-page PDF standing in for the statement the cover sheet says is attached. */
function statementPdf(): Uint8Array {
  const text =
    "Transfer Election Statement - Texas Solar Energy (EIN 00-0000029) to Sarah Smith (SSN 400-00-1037): Form 8835 Part II, Form 3800 Part III line 1f, registration PAZ123055555, $13,200 credit. ATS Scenario 4 placeholder.";
  const stream = `BT /F1 8 Tf 36 400 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

/** The binary attachment the Scenario 4 cover sheet assumes is attached. */
export function scenario104004Attachments() {
  return [{
    fileName: STATEMENT_FILE,
    description: FORM8835_PURCHASE_STATEMENT_DESCRIPTION,
    bytes: statementPdf(),
  }];
}

/** Packet amounts and hand-computed lines from the 2025 instructions. */
export const SCENARIO_1040_04_RECONCILIATION = {
  form1040Line1aWages: 36_014,
  form1040Line25aWithholding: 4_581,
  form1040Line15TaxableIncome: 20_264,
  // 2025 Tax Table, $20,250-$20,300 row, single.
  form1040Line16Tax: 2_195,
  solarBaseCreditFromPrintedKwhAndRate: 2_640,
  solarFivefoldCreditIfPrintedLine8EligibilityApplies: 13_200,
  printedForm3800SolarCredit: 13_200,
  printedForm3800VehicleBusinessCredit: 130,
  // Form 3800 Part II line 38: limited to net income tax, TMT $0.
  schedule3Line6aGeneralBusinessCredit: 2_195,
  form1040Line24TotalTax: 0,
  packetConflicts: [
    "Form 3800 p.8 Part III column (i) prints $13,200 (line 1f) and $130 (line 1y) applied against tax, but the return's tax is $2,195; Part II limits the credit allowed to $2,195 and the rest carries forward.",
    "Form 3800 p.8 places the purchased Form 8835 credit on line 1f; the facility was placed in service 9/22/2023 (Form 8835 p.15 line 5), and Form 8835 line 15 sends production in the first four years to line 4e. The packet's line 1f is kept.",
    "Form 3800 p.8 column (c) prints APPLD FOR for the transferor EIN, while Form 8835 p.15 line 2b gives the owner TIN 00-0000029.",
    "Form 8835 p.15 line 2a prints \"8860952 Solar\"; only the facility type, Solar, is used.",
    "Form 8936 Schedule A p.19-20 lines 9 through 11 are blank; the $130 Form 3800 line 1y amount is the only printed vehicle credit.",
    "Form 3800 p.8 line 1y column (c) prints APPLD FOR, but the vehicle credit has no pass-through entity or transferor, so column (c) is not transmitted.",
    "The packet does not list Form 6251; the engine attaches it because Form 6251 instructions require it with a general business credit (Form 3800 Part I line 6 above zero).",
    "IRC section 6418 regulations treat an individual transferee's purchased credit as subject to section 469; the packet reports it as nonpassive (column (g) equals column (f), no Form 8582-CR).",
  ],
} as const;

/** Facts a guard requires that the Scenario 4 packet does not print. */
export const SCENARIO_1040_04_ASSUMPTIONS: readonly AtsAssumption[] = [
  {
    field: "general.taxpayer_prior_year_agi",
    value: 0,
    why: "Form 8936 p.18 line 3a prints 2024 AGI as 0.",
  },
  {
    field: "Transfer Election Statement bytes",
    value: STATEMENT_FILE,
    why:
      "The cover sheet says to assume the attachment exists; a one-page PDF naming the parties, registration and amount stands in for it.",
  },
  {
    field: "f8835[0].purchase_source terms",
    value: "cash paid 2025-12-15; agreement and documentation records",
    why:
      "The packet gives no purchase price, date or agreement. Consideration of $11,880 (90 cents per credit dollar) is recorded; it does not change tax.",
  },
  {
    field: "f8835[0].subject_to_passive_activity_limit",
    value: false,
    why:
      "Form 3800 p.8 reports the purchase only in column (f) with column (g) equal to it and no Form 8582-CR in the packet, so the credit is treated as nonpassive.",
  },
  {
    field: "f8835[0].form3800_line",
    value: "1f",
    why:
      "Printed on Form 3800 p.8; the transferor's statement names the Part III line.",
  },
  {
    field: "f8835[0] production period",
    value: "2025-01-01 to 2025-12-31",
    why: "Form 8835 gives kWh for 2025 without a period.",
  },
  {
    field: "f8936[0].credit_amount and business_use",
    value: 130,
    why:
      "Schedule A lines 9-11 are blank; Form 3800 line 1y prints $130 and Form 8936 Part III (personal use) is blank, so the tentative credit is $130 at 100% business use for 12 months.",
  },
  {
    field: "f8936[0].msrp, vehicle_type, acquisition_date, seller report",
    value: "52,000; other; 2025-01-25; received",
    why:
      "The packet gives none of these; an MSRP under the $55,000 cap and acquisition on the placed-in-service date keep the printed credit eligible.",
  },
];

/** Complete Scenario 4 return from the packet, with recorded assumptions. */
export function scenario104004Input() {
  const { taxpayer, w2, form8835: solar, form8936ScheduleA: vehicle } =
    SCENARIO_1040_04_FACTS;
  return {
    general: {
      ats_test_submission: true,
      taxpayer_first_name: taxpayer.firstName,
      taxpayer_last_name: taxpayer.lastName,
      taxpayer_ssn: taxpayer.ssn,
      taxpayer_dob: taxpayer.dateOfBirth,
      taxpayer_prior_year_agi: 0,
      address_line1: taxpayer.address.line1,
      address_city: taxpayer.address.city,
      address_state: taxpayer.address.state,
      address_zip: taxpayer.address.zip,
      filing_status: FilingStatus.Single,
      digital_assets: taxpayer.digitalAssets,
    },
    w2: [{
      source_document_reference: `${PACKET}-w2-page-4`,
      employer_name: w2.employerName,
      employer_ein: w2.employerEin,
      employee_ssn: w2.employeeSsn,
      employer_address_line1: w2.employerAddress.line1,
      employer_address_city: w2.employerAddress.city,
      employer_address_state: w2.employerAddress.state,
      employer_address_zip: w2.employerAddress.zip,
      box1_wages: w2.box1Wages,
      box2_fed_withheld: w2.box2FederalWithholding,
      box3_ss_wages: w2.box3SocialSecurityWages,
      box4_ss_withheld: w2.box4SocialSecurityWithholding,
      box5_medicare_wages: w2.box5MedicareWages,
      box6_medicare_withheld: w2.box6MedicareWithholding,
    }],
    f8835: [{
        energy_type: EnergyType.Solar,
        subject_to_passive_activity_limit: false,
        kwh_produced: solar.solarKilowattHoursProducedAndSold,
        kwh_sold: solar.solarKilowattHoursProducedAndSold,
        facility_description: "Solar",
        facility_us_address: {
          line1: "808 Spring Love Lane",
          city: "Houston",
          state: "TX",
          zip: "77004",
        },
        facility_latitude: 24.778212,
        facility_longitude: -103.743636,
        facility_owned_by_filer: false,
        facility_owner_business: {
          name: solar.facilityOwner,
          ein: solar.facilityOwnerTin,
        },
        existing_facility_expansion: false,
        solar_dc_nameplate_kw: solar.solarDcNameplateKw,
        ac_nameplate_kw: solar.solarAcNameplateKw,
        facility_placed_in_service_date: solar.placedInService,
        facility_construction_start_date: solar.constructionBegan,
        production_period_start_date: "2025-01-01",
        production_period_end_date: "2025-12-31",
        increased_credit_reason: "none",
        domestic_content_bonus: false,
        energy_community_bonus: false,
        is_fiscal_year: false,
        registration_number: solar.registrationNumber,
        purchase_source: {
          transferor_name: solar.facilityOwner,
          transferor_tin: solar.facilityOwnerTin,
          registration_number: solar.registrationNumber,
          form3800_line: "1f",
          purchased_credit_amount:
            SCENARIO_1040_04_FACTS.form3800.partIIIline1f
              .creditTransferElectionAmount,
          agreement_reference: `${PACKET}-transfer-agreement`,
          cash_consideration_cents: 1_188_000,
          paid_on: "2025-12-15",
          unrelated_under_267b_and_707b_verified: true,
          minimum_documentation_received_verified: true,
          qualified_facility_requirements: [
            QualifiedFacilityRequirement.UnderOneMw,
            QualifiedFacilityRequirement.ConstructionBefore20230129,
            QualifiedFacilityRequirement.PrevailingWageAndApprenticeship,
          ],
          statement_file_name: STATEMENT_FILE,
          statement_sha256: STATEMENT_SHA256,
        },
      }],
    f8936: {
      current_year_magi: { adjusted_gross_income: w2.box1Wages },
      prior_year_magi: { adjusted_gross_income: 0 },
      filing_status: FilingStatus.Single,
      prior_year_filing_status: FilingStatus.Single,
      f8936s: [{
        vin: vehicle.vin,
        vehicle_year: vehicle.vehicleYear,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        placed_in_service_date: vehicle.placedInService,
        acquisition_date: vehicle.placedInService,
        seller_report_received: true,
        transferred_to_dealer: vehicle.creditTransferredToDealer,
        resold_within_30_days: false,
        acquired_for_use_not_resale: true,
        credit_kind: "new_clean_vehicle",
        credit_amount: SCENARIO_1040_04_RECONCILIATION
          .printedForm3800VehicleBusinessCredit,
        msrp: 52_000,
        vehicle_type: "other",
        business_use: {
          kind: "mileage",
          business_miles: 10_000,
          commuting_miles: 0,
          total_miles: 10_000,
          months_in_business_use: 12,
        },
        business_credit_subject_to_passive_activity_limit: false,
      }],
    },
  };
}
