import { PDFCheckBox, PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { increasedFixture } from "./form8835_increased.fixture.ts";
import { communityFixture } from "./form8835_community.fixture.ts";
import {
  type F8835Item,
  inputSchema,
} from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import {
  form8835PwaDeclaration,
  form8835PwaDescription,
  type PwaSource,
} from "../../../../../nodes/inputs/credits/business/f8835/pwa-source.ts";
import {
  form8835PwaFields,
  pwaContinuationPrefix,
} from "../../../../mef/forms/credits/business/f8835_pwa_statement.ts";
import { loadPdfTemplate } from "../../../../pdf/support/template-cache.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const pwaCases = [
  {
    id: "pwa-2023-current",
    start: "2023-06-01",
    service: "2025-01-01",
    repairs: false,
    employers: 1,
    fringeCash: false,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-2024-current-repairs",
    start: "2024-06-01",
    service: "2025-01-01",
    repairs: true,
    employers: 1,
    fringeCash: false,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-prior-no-repairs",
    start: "2023-06-01",
    service: "2024-01-01",
    repairs: false,
    employers: 1,
    fringeCash: false,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-prior-repairs",
    start: "2023-06-01",
    service: "2024-01-01",
    repairs: true,
    employers: 1,
    fringeCash: false,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-cash-fringe",
    start: "2024-06-01",
    service: "2025-01-01",
    repairs: false,
    employers: 1,
    fringeCash: true,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-working-foreperson",
    start: "2024-06-01",
    service: "2025-01-01",
    repairs: false,
    employers: 1,
    fringeCash: false,
    foreperson: true,
    bonuses: false,
  },
  {
    id: "pwa-two-continuations",
    start: "2024-06-01",
    service: "2025-01-01",
    repairs: true,
    employers: 20,
    fringeCash: false,
    foreperson: false,
    bonuses: false,
  },
  {
    id: "pwa-two-facilities-bonuses",
    start: "2023-06-01",
    service: "2024-01-01",
    repairs: true,
    employers: 2,
    fringeCash: false,
    foreperson: false,
    bonuses: true,
  },
];

/** Synthetic source paperwork: its typed review assertions are not signature authentication. */
export async function pwaFixture(c: typeof pwaCases[number]) {
  const fixture = c.bonuses
    ? await communityFixture({
      id: c.id,
      kind: "phase_ii",
      reason: "small",
      capacity: 900,
      count: 2,
      kwh: 1000000,
      domestic: true,
    })
    : await increasedFixture(1, 100000, 1800, true);
  for (let i = 0; i < fixture.input.f8835.length; i++) {
    const f = fixture.input.f8835[i] as any;
    const s: PwaSource = {
      ...f.small_facility_source,
      method: "direct_compliance",
      construction_began_on: c.start,
      placed_in_service_on: c.service,
      placed_in_service_record_reference: `Synthetic commissioning ${i}`,
      construction_history: {
        earliest_qualifying_start_verified: true,
        beginning: {
          method: "physical_work",
          record_reference: `Synthetic permanent foundation ${i}`,
          work_began_on: c.start,
          work_description: "Permanent generating equipment foundations",
          significant_integral_physical_work_verified: true,
          excludes_preliminary_and_inventory_work_verified: true,
          performer: "contractor",
          binding_contract_reference: `Synthetic contract ${i}`,
          binding_contract_signed_on: `${c.start.slice(0, 4)}-01-01`,
          enforceable_contract_reviewed: true,
        },
        continuity: {
          method: "safe_harbor",
          review_reference: `Synthetic continuity ${i}`,
        },
      },
      original_independent_facility_reviewed: true,
      complete_construction_and_current_year_work_inventory_verified: true,
      primary_and_secondary_worksites_reviewed: true,
      excluded_maintenance_and_nonlabor_records_review_reference:
        `Synthetic work inventory ${i}`,
      no_wage_corrections_penalty_cures_or_good_faith_exception: true,
      project_labor_agreement: false,
      alterations_or_repairs_in_2025: c.repairs,
      form7220_file_name: `Pwa${i + 1}.pdf`,
      form7220_sha256: "0".repeat(64),
      employers: [],
      wage_determinations: [],
      programs: [],
      workers: [],
      payroll: [],
    };
    // The bonus fixture starts below 1 MW; retain its unit identities at 1.8 MW.
    s.generating_units.forEach((u) => u.nameplate_kw_ac = 900);
    for (let e = 0; e < c.employers; e++) {
      const ref = `employer-${e}`, classification = "Electrician";
      s.employers.push({
        reference: ref,
        name: `Synthetic Works ${e + 1}`,
        ein: String(120000000 + e),
        relationship: e ? "subcontractor" : "contractor",
        engagement_record_reference: `Contract ${e}`,
        complete_worker_inventory_verified: true,
      });
      s.wage_determinations.push({
        reference: ref,
        work_classification: classification,
        worksite_reference: `Site ${i}`,
        determination_record_reference: `Wage decision ${e}`,
        applicable_contract_and_geography_review_reference:
          `Applicable decision ${e}`,
        valid_from: c.start,
        valid_through: "2025-12-31",
        basic_hourly_rate_cents: 3600,
        fringe_hourly_rate_cents: 1200,
        applicable_effective_date_and_classification_verified: true,
      });
      s.programs.push({
        reference: ref,
        work_classification: classification,
        registered_program_record_reference: `Program ${e}`,
        registered_with: "DOL",
        valid_from: c.start,
        valid_through: "2025-12-31",
        geographic_ratio_review_reference: `Ratio review ${e}`,
        first_apprentice_journeyworkers: 1,
        each_additional_apprentice_journeyworkers: 3,
      });
      for (let w = 0; w < (c.foreperson ? 5 : 4); w++) {
        const worker = `${ref}/worker-${w}`, apprentice = w === 3;
        s.workers.push({
          reference: worker,
          employer_reference: ref,
          employment_record_reference: `Employment ${worker}`,
          role: apprentice
            ? "apprentice"
            : w === 4
            ? "working_foreperson"
            : "journeyworker",
          ...(apprentice
            ? {
              apprentice: {
                program_reference: ref,
                registration_record_reference: `Registration ${worker}`,
                registered_from: c.start,
                registered_through: "2025-12-31",
                wage_schedule_record_reference: `Wage schedule ${worker}`,
                basic_rate_basis_points: 5000,
                fringe_hourly_rate_cents: 1200,
                applicable_program_wage_and_fringe_reviewed: true as const,
              },
            }
            : {}),
        });
        const minutes = w === 4
          ? 61
          : c.start < "2024-01-01"
          ? apprentice ? 60 : 140
          : apprentice
          ? 90
          : 170;
        const add = (
          suffix: string,
          worked: string,
          activity: "construction" | "alteration_or_repair",
          minutes: number,
        ) => {
          s.payroll.push({
            reference: `${worker}/${suffix}`,
            worker_reference: worker,
            wage_determination_reference: ref,
            worked_on: worked,
            paid_on: worked,
            activity,
            minutes_worked: minutes,
            cash_wages_paid_cents: minutes *
              ((apprentice ? 30 : 60) + (c.fringeCash ? 20 : 0)),
            overtime_premium_cents: 0,
            bona_fide_fringe_paid_cents: c.fringeCash ? 0 : minutes * 20,
            payment_record_reference: `Payment ${worker}/${suffix}`,
            time_record_reference: `Time ${worker}/${suffix}`,
            fringe_allocation_record_reference: `Fringe ${worker}/${suffix}`,
            payment_timing_and_bona_fide_fringe_verified: true,
            single_rate_work_and_pay_reconciled: true,
          });
        };
        add("build", c.start, "construction", minutes);
        if (c.repairs && w === 0) {
          add("repair", "2025-07-01", "alteration_or_repair", 60);
        }
      }
    }
    delete f.small_facility_source;
    f.pwa_source = s;
    f.increased_credit_reason = "prevailing_wage_and_apprenticeship";
    f.meets_prevailing_wage = true;
    f.meets_apprenticeship = true;
    f.pwa_form7220_file_name = s.form7220_file_name;
    f.facility_construction_start_date = c.start;
    f.facility_placed_in_service_date = c.service;
    f.ac_nameplate_kw = 1800;
    f.maximum_net_output_mw = 1.8;
    fixture.input.form3800_current_production_allocation.facilities[i]
      .facility_placed_in_service_date = c.service;
    if (f.energy_community_source) {
      f.energy_community_source.generating_units.forEach((u: any) =>
        u.nameplate_kw_ac = 900
      );
    }
    if (f.energy_community_source && i === 1) {
      const community = f.energy_community_source;
      delete community.units_and_capacity_as_of_qualification_date_verified;
      Object.assign(community, {
        method: "beginning_of_construction_nameplate",
        qualification_date: c.start,
        unit_locations_fixed_from_beginning_of_construction_verified: true,
        original_project_and_final_units_reconciled: true,
        independent_single_facility_reviewed: true,
        construction_history: structuredClone(s.construction_history),
      });
      for (const unit of community.generating_units) {
        if (unit.qualification.category === "brownfield") {
          unit.qualification.condition_as_of = c.start;
          unit.qualification.report_completed_on = c.start;
        }
      }
    }
    const increase = fixture.attachments.find((a) =>
      a.fileName === s.statement_file_name
    )!;
    const statement = await PDFDocument.load(increase.bytes);
    const form = statement.getForm();
    form.getTextField("Form8835Increase.MaximumNetOutputMW").setText("1.8");
    const declaration = form.getTextField("Form8835Increase.Declaration");
    declaration.setText(form8835PwaDeclaration(f));
    declaration.setFontSize(9);
    increase.bytes = await statement.save();
    s.statement_sha256 = await sha256Hex(increase.bytes);
    const bytes = await makeForm7220(
      inputSchema.parse({ f8835s: [f] }).f8835s[0],
    );
    s.form7220_sha256 = await sha256Hex(bytes);
    fixture.attachments.push({
      fileName: s.form7220_file_name,
      description: form8835PwaDescription(f.facility_description),
      bytes,
    });
  }
  const credits = fixture.input.f8835.map((f) =>
    Math.round(f.kwh_sold * .006) * 5 * (c.bonuses ? 1.2 : 1)
  );
  const used = Math.min(23049, credits.reduce((a, b) => a + b, 0));
  return {
    ...fixture,
    expected: { credits, productionUsed: used, tax: 25067 - 2001 - used },
  };
}

async function makeForm7220(item: F8835Item) {
  const template = await loadPdfTemplate(
    "https://www.irs.gov/pub/irs-pdf/f7220.pdf",
    ".pdf-cache",
    "6d5d7bf5ccee360ab3054752e4a649f1f5ea7298ac50840d85727fa3da77e6cc",
  );
  const pdf = await PDFDocument.load(template);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const expected = form8835PwaFields(item);
  // Blank, widget-free official backgrounds; fresh canonical fields for each copy.
  for (const copy of expected.continuations) {
    const blank = await PDFDocument.load(template);
    const specs = blank.getForm().getFields().filter((f) =>
      f.getName().includes(`.Page${copy.templatePage + 1}[0].`)
    ).map((f) => ({
      name: f.getName(),
      alignment: (f as PDFTextField).getAlignment(),
      multiline: (f as PDFTextField).isMultiline(),
      rectangles: f.acroField.getWidgets().map((w) => w.getRectangle()),
    }));
    blank.getForm().flatten();
    const [page] = await pdf.copyPages(blank, [copy.templatePage]);
    pdf.addPage(page);
    page.drawText(
      `${item.pwa_source!.taxpayer_name} | ${
        item.pwa_source!.taxpayer_tin
      } | Part ${copy.part} continuation ${copy.copy}`,
      { x: 36, y: page.getHeight() - 25, size: 8, font },
    );
    for (const spec of specs) {
      const field = pdf.getForm().createTextField(
        pwaContinuationPrefix(copy.part, copy.copy) + spec.name,
      );
      field.setAlignment(spec.alignment);
      if (spec.multiline) field.enableMultiline();
      for (const rect of spec.rectangles) {
        field.addToPage(page, {
          ...rect,
          borderWidth: 0,
          backgroundColor: undefined,
          borderColor: undefined,
        });
      }
      field.setFontSize(8);
    }
  }
  for (const field of pdf.getForm().getFields()) {
    const value = expected.fields[field.getName()];
    if (field instanceof PDFTextField) {
      const text = typeof value === "string" ? value : "";
      field.setText(text);
      field.setFontSize(8);
    } else if (field instanceof PDFCheckBox) {
      value === true ? field.check() : field.uncheck();
    }
  }
  pdf.getPages()[0].drawText("SYNTHETIC TEST SOURCE - NOT A SIGNED FILING", {
    x: 170,
    y: 18,
    size: 8,
    font,
  });
  pdf.getForm().updateFieldAppearances(font);
  return await pdf.save();
}
