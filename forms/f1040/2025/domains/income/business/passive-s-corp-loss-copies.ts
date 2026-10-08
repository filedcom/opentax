import type { FilerIdentity } from "../../../../mef/header.ts";
import { isDeepStrictEqual } from "node:util";
import { inputSchema as sCorpSchema } from "../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import { inputSchema as partnershipSchema } from "../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { passiveK1Activities } from "../../../../nodes/inputs/income/rental-passthrough/k1_passive_source.ts";
import {
  firstYearPassiveSCorpLoss8582Activity,
  passiveSCorpLossBundle,
} from "../../../../nodes/inputs/income/rental-passthrough/k1_s_corp_passive_loss_source.ts";
import {
  form8582,
  inputSchema as palSchema,
} from "../../../../nodes/intermediate/forms/income/business/form8582/index.ts";
import {
  agi_aggregator,
  inputSchema as agiSchema,
} from "../../../../nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { passiveSCorpLossQbiLines } from "../../../../nodes/intermediate/forms/deductions/business/form8995/passive-s-corp-loss.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { projectFirstYearPassiveSCorp7203 } from "./form7203/form7203-passive-loss-projection.ts";

const sum = (value: number | readonly number[] | undefined) =>
  Array.isArray(value) ? value.reduce((n, a) => n + a, 0) : value ?? 0;

/** Component source replay. The separate whole-return export guard stays closed. */
export function projectPassiveSCorpLossCopies(
  pending: Readonly<Record<string, unknown>>,
) {
  const items = pending.k1_s_corp === undefined
    ? []
    : sCorpSchema.parse(pending.k1_s_corp).k1_s_corps;
  if (
    !items.some((item) => item.first_year_passive_loss_source !== undefined)
  ) return undefined;
  if (items.length !== 1) {
    throw Error(
      "Passive S-corp filing copies need the complete single current source",
    );
  }
  const bundle = passiveSCorpLossBundle(items[0]);
  const f1040 = pending.f1040 as Record<string, number> | undefined;
  const filer = extractFilerIdentity(
    pending.f1040 as Record<string, unknown> ?? {},
  );
  projectFirstYearPassiveSCorp7203(bundle.source, bundle.k1, filer);
  const basis = pending.form7203 as Record<string, unknown> | undefined;
  const qbi = pending.form8995 as Record<string, unknown> | undefined;
  if (
    !basis ||
    Object.keys(basis).some((key) => key !== "current_passive_s_corp_loss") ||
    !isDeepStrictEqual(basis.current_passive_s_corp_loss, bundle) ||
    !qbi || !isDeepStrictEqual(qbi.current_passive_s_corp_loss, bundle)
  ) {
    throw Error(
      "Passive S-corp loss requires its exact retained Form7203 and QBI source copies",
    );
  }
  for (
    const key of [
      "schedule_e",
      "f4835",
      "schedule_c",
      "schedule_f",
      "k1_trust",
      "form4797",
    ]
  ) {
    if (pending[key] && Object.keys(pending[key] as object).length > 0) {
      throw Error(
        "Passive S-corp component copies need separate source review for other activities",
      );
    }
  }
  const partners = pending.k1_partnership === undefined
    ? []
    : partnershipSchema.parse(pending.k1_partnership).k1_partnerships;
  const incomeRows = passiveK1Activities(partners, "k1_partnership", true);
  if (
    partners.some((row) =>
      (row.box1_ordinary_business ?? 0) !== 0 ||
      (row.box2_rental_re ?? 0) < 0 || (row.box3_other_rental ?? 0) < 0 ||
      ((row.box2_rental_re ?? 0) > 0 &&
        row.eic_passive_activity_review?.box2 !== "passive") ||
      ((row.box3_other_rental ?? 0) > 0 &&
        row.eic_passive_activity_review?.box3 !== "passive") ||
      ![filer!.primarySSN, filer!.spouse?.ssn].includes(row.recipient_tin)
    )
  ) {
    throw Error(
      "Passive S-corp component copies need owned positive passive rental K1 sources",
    );
  }
  const incomeSources = partners.map((row) => row.passive_income_source!);
  const income = incomeRows.reduce((n, row) => n + row.current_net, 0);
  const loss = firstYearPassiveSCorpLoss8582Activity(bundle.source, bundle.k1);
  const expectedActivities = [loss.activity, ...incomeRows];
  const pal = palSchema.parse(pending.form8582);
  if (
    !pal.activities || pal.activities.length !== expectedActivities.length ||
    new Set(pal.activities.map((row) => row.activity_id)).size !==
      pal.activities.length ||
    expectedActivities.some((row) =>
      !isDeepStrictEqual(
        row,
        pal.activities!.find((a) => a.activity_id === row.activity_id),
      )
    ) ||
    (pal.current_loss ?? 0) !== loss.stages.passiveLossBefore8582 ||
    (pal.current_income ?? 0) !== income || (pal.prior_unallowed ?? 0) !== 0 ||
    (pal.rental_current_loss ?? 0) !== 0 ||
    (pal.rental_current_income ?? 0) !== 0 ||
    pal.has_other_passive !== true ||
    (pal.current_4797_sale_gains?.length ?? 0) !== 0
  ) {
    throw Error(
      "Passive S-corp actual Form8582 differs from its basis-limited source activity pool",
    );
  }
  const calculated = form8582.compute(
    { taxYear: 2025, formType: "f1040" },
    pal,
  );
  const allowed = -Number(
    calculated.outputs.find((row) => row.nodeType === "schedule1")?.fields
      .line5_schedule_e ?? 0,
  ) || 0;
  const agi = agiSchema.parse(pending.agi_aggregator);
  if (
    agi.pal_current_loss !== loss.stages.passiveLossBefore8582 ||
    (agi.pal_current_income ?? 0) !== income ||
    (agi.pal_prior_unallowed ?? 0) !== 0 ||
    sum(agi.line5_schedule_e) !== income || (agi.pal_rental_loss ?? 0) !== 0 ||
    sum(agi.eic_passive_k1_income) !== income ||
    ((pending.schedule1 as Record<string, unknown> | undefined)
        ?.line5_schedule_e ?? 0) !== income - allowed
  ) {
    throw Error(
      "Passive S-corp source pool differs from finalized Schedule1/AGI",
    );
  }
  const expected =
    agi_aggregator.compute({ taxYear: 2025, formType: "f1040" }, agi).outputs
      .find((row) => row.nodeType === "f1040")!.fields;
  for (
    const key of ["line8_additional_income", "line10_adjustments", "line11_agi"]
  ) {
    if ((f1040?.[key] ?? 0) !== (expected[key] ?? 0)) {
      throw Error(`Passive S-corp allowance differs from finalized ${key}`);
    }
  }
  const taxable = Math.max(
    0,
    Number(f1040!.line11_agi) - Number(f1040!.line12c_deduction_total) -
      Number(f1040!.line13b_additional_deductions ?? 0),
  );
  if (
    f1040!.line13_qbi_deduction !== 0 ||
    f1040!.line15_taxable_income !== taxable
  ) {
    throw Error(
      "Passive S-corp finalized QBI deduction/taxable income differs from allowed-loss sources",
    );
  }
  const { qualifiedPassiveSuspended: _suspended, ...lines } =
    passiveSCorpLossQbiLines(bundle, incomeSources, taxable);
  if (
    !isDeepStrictEqual(
      qbi.current_passive_k1_income_sources ?? [],
      incomeSources,
    ) ||
    Object.entries(lines).some(([key, value]) => qbi[key] !== value) ||
    qbi.qbi_deduction !== 0
  ) {
    throw Error(
      "Passive S-corp current allowed qualified loss differs from actual Form8995",
    );
  }
  return {
    bundle,
    stages: loss.stages,
    lossActivity: loss.activity,
    allowed,
    income,
    qbiLines: lines,
  };
}

/** Required basis copy is replayed before either registered descriptor projects. */
export function projectPassiveSCorp7203Copy(
  raw: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
  filer: FilerIdentity | undefined,
) {
  if (!pending || !isDeepStrictEqual(raw, pending.form7203)) {
    throw Error(
      "Passive Form7203 descriptor needs its exact actual basis source copy",
    );
  }
  const copies = projectPassiveSCorpLossCopies(pending);
  if (!copies) {
    throw Error("Passive Form7203 descriptor lacks its original K1 source");
  }
  return {
    ...projectFirstYearPassiveSCorp7203(
      copies.bundle.source,
      copies.bundle.k1,
      filer,
    ),
    k1: copies.bundle.k1,
  };
}
