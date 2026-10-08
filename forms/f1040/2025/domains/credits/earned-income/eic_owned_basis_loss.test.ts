import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import {
  ownedDebtInputs,
  ownedDebtSource,
} from "../../business/form7203/form7203_owned_debt.fixture.ts";
import {
  mixedDebtCases,
  mixedDebtInputs,
  mixedFamilyInputs,
} from "../../business/form7203/form7203_mixed_debt.fixture.ts";
import {
  twoNotesOpenCases,
  twoNotesOpenInputs,
} from "../../business/form7203/form7203_two_notes_open.fixture.ts";
import {
  overflowDebtCases,
  overflowDebtInputs,
} from "../../business/form7203/form7203_overflow_debt.fixture.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { assertK1EicReview } from "../../../../nodes/inputs/k1_passive_eic.ts";

function qualify(input: any, interest: number, wages: number) {
  Object.assign(input.general, {
    taxpayer_ssn_valid_for_employment: true,
    taxpayer_ssn_issued_before_due_date: true,
    taxpayer_tin_issued_by_due_date: true,
    main_home_in_us_over_half_year: true,
    taxpayer_can_be_claimed_as_dependent: false,
    childless_eic_review: {
      not_qualifying_child_of_another_taxpayer_verified: true,
      qualifying_child_status_record_reference:
        "Reviewed current family status",
    },
    prior_eic_disallowance_review: {
      status: "none",
      irs_account_record_reference: "Reviewed current IRS account",
      no_nonclerical_disallowance_since_1996_verified: true,
    },
    eic_tax_residency_review: {
      status: "all_year_resident",
      taxpayer_status_record_reference: "Reviewed all-year resident status",
      ...(input.general.spouse_ssn
        ? {
          spouse_status_record_reference:
            "Reviewed spouse all-year resident status",
        }
        : {}),
    },
    ...(input.general.spouse_ssn
      ? {
        spouse_ssn_valid_for_employment: true,
        spouse_ssn_issued_before_due_date: true,
        spouse_tin_issued_by_due_date: true,
        spouse_can_be_claimed_as_dependent: false,
      }
      : {}),
  });
  input.w2[0].box1_wages = wages;
  input.w2[0].box2_fed_withheld = 0;
  input.f1099int = [{
    payer_name: "Reviewed bank",
    recipient_tin: "123456789",
    box8: interest,
  }];
  return input;
}
const cases = [
  {
    id: "seven_columns_at_limit",
    input: () =>
      qualify(overflowDebtInputs(overflowDebtCases[3]).inputs, 11950, 5000),
    allowed: 4000,
    suspended: 0,
    agi: 1000,
    interest: 11950,
    eic: 384,
    earned: 5000,
  },
  {
    id: "three_columns_at_limit",
    input: () =>
      qualify(twoNotesOpenInputs(twoNotesOpenCases[0]).inputs, 11950, 5000),
    allowed: 4000,
    suspended: 0,
    agi: 1000,
    interest: 11950,
    eic: 384,
    earned: 5000,
  },
  {
    id: "formal_at_limit",
    input: () => qualify(ownedDebtInputs(ownedDebtSource()), 11950, 5000),
    allowed: 2500,
    suspended: 1500,
    agi: 2500,
    interest: 11950,
    eic: 384,
    earned: 5000,
  },
  {
    id: "formal_above_limit",
    input: () => qualify(ownedDebtInputs(ownedDebtSource()), 11951, 5000),
    allowed: 2500,
    suspended: 1500,
    agi: 2500,
    interest: 11951,
    eic: 0,
    earned: 5000,
  },
  {
    id: "mixed_both_repaid",
    input: () =>
      qualify(mixedDebtInputs(mixedDebtCases[4]).inputs, 11950, 5000),
    allowed: 1500,
    suspended: 2500,
    agi: 3500,
    interest: 11950,
    eic: 384,
    earned: 5000,
  },
  {
    id: "joint_independent_losses",
    input: () => qualify(mixedFamilyInputs().inputs, 11950, 10000),
    allowed: 7600,
    suspended: 400,
    agi: 2400,
    interest: 11950,
    eic: 649,
    earned: 10000,
  },
];

Deno.test("EIC replays owned nonpassive basis losses without subtracting them from investment income or wages", async () => {
  const outputIndex = Deno.args.indexOf("--write-review-artifacts");
  const output = outputIndex < 0 ? undefined : Deno.args[outputIndex + 1];
  for (const c of cases) {
    const inputs = c.input();
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule1.line5_schedule_e, -c.allowed);
    assertEquals(result.pending.f1040.line11_agi, c.agi);
    assertEquals(result.pending.eitc.earned_income, c.earned);
    assertEquals(result.pending.eitc.investment_income_floor, c.interest);
    // Pub596 EIC table: $5,000–5,050 gives384; $10,000–10,050 MFJ gives649.
    assertEquals(result.pending.f1040.line27_eitc ?? 0, c.eic);
    assertEquals(result.pending.form8995.qbi, -c.allowed);
    const pending = buildPending(result.pending),
      filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: any[] = [];
    const pdf = await buildPdfBytes(
      bundle.pending,
      filer,
      undefined,
      bundle,
      origins,
    );
    const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const xsd = new URL(
      "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      import.meta.url,
    ).pathname;
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
    await Deno.remove(xmlPath);
    if (c.eic) {
      for (const key of ["form7203", "form8995"]) {
        const bad = structuredClone(bundle.pending) as any;
        delete bad[key];
        await assertRejects(() =>
          buildMefBundle(bad, { filer, attachments: [] })
        );
        assertThrows(() => irs1040Pdf.projectFields?.(bad.f1040 as any, bad));
      }
      const bad = structuredClone(bundle.pending) as any;
      bad.k1_s_corp.k1_s_corps[0].eic_passive_activity_review = {
        box1: "passive",
        recipient_tin: "123456789",
        activity_statement_reference: "Contradictory passive statement",
        participation_workpaper_reference: "Contradictory participation",
      };
      await assertRejects(() =>
        buildMefBundle(bad, { filer, attachments: [] })
      );
      assertThrows(() => irs1040Pdf.projectFields?.(bad.f1040, bad));
      const loss = structuredClone(bundle.pending) as any;
      loss.schedule1.line5_schedule_e -= 1;
      await assertRejects(() =>
        buildMefBundle(loss, { filer, attachments: [] })
      );
      assertThrows(() => irs1040Pdf.projectFields?.(loss.f1040, loss));
    } else {
      const forged = structuredClone(bundle.pending) as any;
      forged.f1040.line27_eitc = 384;
      forged.eitc.credit_amount = 384;
      await assertRejects(() =>
        buildMefBundle(forged, { filer, attachments: [] })
      );
      assertThrows(() => irs1040Pdf.projectFields?.(forged.f1040, forged));
    }
    if (output) {
      const dir = `${output}/${c.id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({
          inputs,
          filer,
          pending: normalizeAllPending(result.pending),
          preparedPending: bundle.pending,
          carryforwards: result.carryforwards,
          origins,
          expected: {
            allowed: c.allowed,
            suspended: c.suspended,
            agi: c.agi,
            interest: c.interest,
            eic: c.eic,
            earned: c.earned,
          },
        }),
      );
    }
  }
  assertThrows(
    () =>
      assertK1EicReview([{
        box1_ordinary_business: -4000,
        eic_passive_activity_review: {
          box1: "nonpassive",
          recipient_tin: "123456789",
          activity_statement_reference: "Classification alone",
          participation_workpaper_reference: "Classification alone",
        },
      }]),
    Error,
    "finalized Schedule E",
  );
});
