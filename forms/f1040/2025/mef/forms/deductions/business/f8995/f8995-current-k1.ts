import { box11Line10SourceRows } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/box11_line10.ts";
import { inputSchema as farmSchema } from "../../../../../../nodes/inputs/income/business/f4835/index.ts";
import {
  currentFarmRentalNet,
  reconcileCurrentFarmRentalQbi,
} from "../../../../../../nodes/inputs/income/business/f4835/qbi-source.ts";
import { currentK1QbiFarmRows } from "../../../../../../nodes/inputs/deductions/business/k1_qbi_source.ts";
import { inputSchema as palSchema } from "../../../../../../nodes/intermediate/forms/income/business/form8582/index.ts";
import { isDeepStrictEqual } from "node:util";
import { inputSchema as partnershipSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import { inputSchema as corporationSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/k1_s_corp/index.ts";
import {
  currentK1Qbi,
  currentK1QbiLines,
} from "../../../../../../nodes/inputs/deductions/business/k1_qbi_source.ts";
import type { Filed8995 } from "./f8995-route.ts";

export function assertCurrentK1Qbi(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  const partnerships = pending?.k1_partnership === undefined
    ? []
    : partnershipSchema.parse(pending.k1_partnership).k1_partnerships;
  const corporations = pending?.k1_s_corp === undefined
    ? []
    : corporationSchema.parse(pending.k1_s_corp).k1_s_corps;
  const items = [...partnerships, ...corporations];
  const sources = items.flatMap((item) => {
    const s = currentK1Qbi(item);
    return s ? [s] : [];
  });
  const canonical = (rows: readonly any[]) =>
    [...rows].sort((a, b) =>
      `${a.issuer_ein ?? a.activity_id}:${a.recipient_tin}:${
        a.issued_k1_reference ?? ""
      }`.localeCompare(
        `${b.issuer_ein ?? b.activity_id}:${b.recipient_tin}:${
          b.issued_k1_reference ?? ""
        }`,
      )
    );
  const actualFarms = pending?.f4835 === undefined
    ? []
    : farmSchema.parse(pending.f4835).f4835s;
  const farms = actualFarms.flatMap((item) => {
    const s = reconcileCurrentFarmRentalQbi(item);
    return s ? [s] : [];
  });
  const incomes = [
    ...items.flatMap((item) =>
      item.passive_income_source ? [item.passive_income_source] : []
    ),
    ...box11Line10SourceRows(partnerships).flatMap((row) =>
      row.current_passive_source ? [row.current_passive_source] : []
    ),
  ];
  if (
    actualFarms.length !== farms.length || (farms.length &&
      (!isDeepStrictEqual(farms, fields.current_passive_farm_qbi_sources) ||
        !isDeepStrictEqual(
          canonical(incomes),
          canonical(fields.current_passive_k1_income_sources as any[] ?? []),
        )))
  ) {
    throw new Error(
      "Form 8995 RPE/farm PAL needs complete owned current lease/receipt/payment QBI sources",
    );
  }
  if (farms.length) {
    const pal = palSchema.parse(pending?.form8582);
    const expectedRows = [
      ...farms.map((s) => ({
        id: s.activity_id,
        net: currentFarmRentalNet(s),
      })),
      ...incomes.flatMap((s) =>
        s.activities.map((r) => ({ id: r.activity_id, net: r.current_income }))
      ),
    ];
    if (
      (pal.activities ?? []).length !== expectedRows.length ||
      expectedRows.some((row) =>
        !pal.activities?.some((a) =>
          a.activity_id === row.id && a.current_net === row.net &&
          a.activity_type === "B" && a.prior_unallowed_operating === 0 &&
          a.prior_unallowed_4797_part1 === 0 &&
          a.prior_unallowed_4797_part2 === 0
        )
      ) ||
      (pal.current_4797_sale_gains ?? []).length !== 0
    ) {
      throw new Error(
        "Form 8995 farm QBI loss needs the actual complete current non-PTP passive activity pool",
      );
    }
  }
  const general = pending?.general as Record<string, unknown> | undefined;
  const digits = (v: unknown) =>
    typeof v === "string" ? v.replace(/\D/g, "") : "";
  const owners = [
    digits(general?.taxpayer_ssn),
    ...(general?.filing_status === "mfj" ? [digits(general.spouse_ssn)] : []),
  ];
  const f = pending?.f1040 as Record<string, number> | undefined;
  const sum = (name: string) => {
    const v = fields[name];
    return Array.isArray(v) ? v.reduce((t, a) => t + a, 0) : (v ?? 0);
  };
  if (
    !f || sources.length === 0 ||
    !isDeepStrictEqual(
      canonical(sources),
      canonical(fields.current_k1_qbi_sources as any[] ?? []),
    ) ||
    sources.some((s) => !owners.includes(s.recipient_tin)) ||
    farms.some((s) => !owners.includes(s.recipient_tin)) ||
    items.some((item) =>
      (("box20z_qbi" in item
          ? item.box20z_qbi
          : "qbi_amount" in item
          ? item.qbi_amount
          : undefined) ?? item.box1_ordinary_business ?? 0) > 0 &&
      !item.qualified_business_income_source
    ) ||
    new Set(
        sources.map((s) =>
          `${s.issuer_ein}:${s.recipient_tin}:${s.issued_section199a_statement_reference}`
        ),
      ).size !== sources.length ||
    [
      "qbi_from_schedule_c",
      "qbi_from_schedule_f",
      "sstb_qbi",
      "line6_sec199a_dividends",
      "qbi_loss_carryforward",
      "reit_loss_carryforward",
      "se_tax_deduction",
      "se_health_insurance_deduction",
      "retirement_plan_deduction",
      "net_capital_gain",
    ].some((key) => sum(key) !== 0)
  ) {
    throw new Error(
      "Form 8995 current K-1 filing needs matching complete actual owner/statement sources",
    );
  }
  const taxable = Math.max(
    0,
    f.line11_agi - (f.line12c_deduction_total ?? 0) -
      (f.line13b_additional_deductions ?? 0),
  );
  const threshold = general?.filing_status === "mfj" ? 394600 : 197300;
  if (taxable > threshold) {
    throw new Error(
      "Current K-1 QBI above threshold needs the advanced wage/property source route",
    );
  }
  const expected = currentK1QbiLines(sources, taxable, farms, incomes);
  if (
    sum("qbi") !== sources.reduce((t, s) => t + s.statement_qbi, 0) ||
    fields.qbi_deduction !== expected.line15 ||
    (f.line13_qbi_deduction ?? 0) !== expected.line15 ||
    (f.line15_taxable_income ?? 0) !== Math.max(0, taxable - expected.line15)
  ) {
    throw new Error(
      "Form 8995 current K-1 deduction differs from finalized Form 1040",
    );
  }
  const lines: Record<number, number> = {};
  for (let line = 2; line <= 17; line++) {
    const key = `line${line}` as keyof typeof expected;
    if (fields[key] !== expected[key]) {
      throw new Error(
        `Form 8995 current K-1 ${key} differs from actual calculation`,
      );
    }
    lines[line] = expected[key] as number;
  }
  return {
    businesses: [
      ...sources.map((s) => ({
        businessName: s.business_name,
        tin: { kind: "ein" as const, value: s.issuer_ein },
        qbi: s.statement_qbi,
      })),
      ...currentK1QbiFarmRows(farms, incomes),
    ],
    lines: lines as Filed8995["lines"],
  };
}
