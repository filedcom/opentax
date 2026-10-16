import { z } from "zod";
import {
  calculateIraBasis2026,
  iraBasisSource2026Schema,
} from "./ira-basis-source.ts";
import {
  businessReturnSource2026Schema,
  resolveBusinessQbi2026,
} from "./business-qbi.ts";
import { w2Item2026Schema } from "./w2-source.ts";
import { FilingStatus } from "../../nodes/types.ts";
import {
  isSourceMoney,
  sourceCents,
  sumSourceMoney,
} from "../../nodes/intermediate/forms/taxes/retirement/form4972/source-rounding.ts";

const ref = z.string().trim().min(1);
const internalClaim = iraBasisSource2026Schema.shape.claim;
const internalOwner = internalClaim.shape.owners.element;
const election = internalOwner.shape.nondeductible_election.unwrap();

/** Evidence selects the executed sources; an entered compensation total is not
 * part of the intake contract. Other compensation and spousal allocation need
 * their own source owners before they can participate in this route. */
export const iraBasisClaim2026Schema = internalClaim.extend({
  owners: z.array(
    internalOwner.extend({
      nondeductible_election: election.omit({ own_eligible_compensation: true })
        .extend({
          wage_document_references: z.array(ref).max(100),
          business_inventory_reference: ref.optional(),
          personal_service_business_references: z.array(ref).max(100),
          listed_businesses_personal_services_material_income_factor_verified: z
            .literal(true),
          no_self_employed_retirement_plan_deduction: z.literal(true),
          no_other_compensation_or_exclusions: z.literal(true),
        }).strict().optional(),
    }).strict(),
  ).min(1).max(2),
}).strict();

export const iraBasisBinding2026Schema = iraBasisSource2026Schema.omit({
  claim: true,
}).extend({
  claim: iraBasisClaim2026Schema,
  wage_sources: z.array(w2Item2026Schema).default([]),
  business_sources_2026: businessReturnSource2026Schema.optional(),
}).strict();
export type IraBasisBinding2026 = z.input<typeof iraBasisBinding2026Schema>;

function sameReferences(actual: string[], reviewed: string[]) {
  return new Set(actual).size === actual.length &&
    new Set(reviewed).size === reviewed.length &&
    actual.length === reviewed.length &&
    actual.every((r) => reviewed.includes(r));
}

/** Internal bridge: callers supply resolved current IRA copies and executed
 * wage/business inventories. Public registration belongs to the retirement
 * adapter, which owns correction lineage and return identity. */
export function bindIraBasis2026(raw: IraBasisBinding2026) {
  const input = iraBasisBinding2026Schema.parse(raw);
  const wages = input.wage_sources;
  const owners = [
    input.taxpayer_ssn,
    ...(input.filing_status === FilingStatus.MFJ ? [input.spouse_ssn] : []),
  ];
  if (
    !sameReferences(
      wages.map((w) => w.source_document_reference),
      wages.map((w) => w.source_document_reference),
    ) ||
    wages.some((w) => !owners.includes(w.employee_ssn.replaceAll("-", "")))
  ) {
    throw Error(
      "IRA compensation needs unique wage sources for actual return owners",
    );
  }
  const hsaWages = input.claim.hsa_funding_sources?.wage_sources;
  if (
    hsaWages && (!sameReferences(
      wages.map((w) => w.source_document_reference),
      hsaWages.map((w) => w.source_document_reference),
    ) || wages.some((w) =>
      JSON.stringify(w2Item2026Schema.parse(w)) !==
        JSON.stringify(w2Item2026Schema.parse(hsaWages.find((v) =>
          v.source_document_reference === w.source_document_reference
        )))
    ))
  ) throw Error("IRA and HSA funding need the same actual wage inventory");
  const business = input.business_sources_2026;
  if (business) {
    if (
      business.filing_status !== input.filing_status ||
      business.taxpayer_tin !== input.taxpayer_ssn ||
      business.spouse_tin !==
        (input.filing_status === FilingStatus.MFJ
          ? input.spouse_ssn
          : undefined)
    ) {
      throw Error(
        "IRA compensation business inventory differs from return owners",
      );
    }
    const linkedWages = business.w2s;
    if (
      !sameReferences(
        wages.map((w) => w.source_document_reference),
        linkedWages.map((w) => w.source_document_reference),
      ) ||
      wages.some((w) =>
        JSON.stringify(w) !== JSON.stringify(
          w2Item2026Schema.parse(linkedWages.find((b) =>
            b.source_document_reference === w.source_document_reference
          )),
        )
      )
    ) {
      throw Error(
        "IRA compensation and business SE need the same actual W-2 inventory",
      );
    }
  }
  const resolved = business
    ? resolveBusinessQbi2026(business).business
    : undefined;
  const compensation = input.claim.owners.flatMap((o) => {
    const e = o.nondeductible_election;
    if (!e) return [];
    const ownedWages = wages.filter((w) =>
      w.employee_ssn.replaceAll("-", "") === o.owner_tin
    );
    const ownedBusinesses = resolved?.businesses.filter((b) =>
      b.source.owner_tin === o.owner_tin
    ) ?? [];
    if (
      ownedWages.some((w) => w.box13_statutory_employee) ||
      ownedBusinesses.some((b) => b.source.kind === "statutory_employee")
    ) {
      throw Error(
        "Statutory-employee IRA compensation needs its expense reconciliation route",
      );
    }
    if (
      !sameReferences(
        ownedWages.map((w) => w.source_document_reference),
        e.wage_document_references,
      ) ||
      !sameReferences(
        ownedBusinesses.map((b) => b.source.business_reference),
        e.personal_service_business_references,
      ) ||
      e.business_inventory_reference !==
        (ownedBusinesses.length ? business!.record_reference : undefined)
    ) {
      throw Error(
        "IRA compensation review must bind all actual owner wage and business sources",
      );
    }
    // Publication 590-A: box 1 less box 11, plus code Q combat pay. A net
    // self-employment loss never reduces the owner's wage compensation.
    const wageCompensation = sumSourceMoney(ownedWages.map((w) => {
      const deferred = w.box11_nonqual_plans ?? 0;
      if (
        ![
          w.box1_wages,
          deferred,
          ...(w.box12_entries ?? []).filter((v) => v.code === "Q").map((v) =>
            v.amount
          ),
        ].every(isSourceMoney)
      ) {
        throw Error("IRA compensation source amounts need exact cents");
      }
      if (deferred > w.box1_wages) {
        throw Error("IRA wage compensation needs box 11 reconciled to box 1");
      }
      return (sourceCents(w.box1_wages) - sourceCents(deferred)) / 100;
    }));
    const combatPay = sumSourceMoney(
      ownedWages.flatMap((w) =>
        (w.box12_entries ?? []).filter((v) => v.code === "Q").map((v) =>
          v.amount
        )
      ),
    );
    const netProfit = ownedBusinesses.reduce((n, b) => n + b.lines.line31, 0);
    const seDeduction = resolved?.owners.find((v) =>
      v.owner_tin === o.owner_tin
    )
      ?.schedule_se?.line13 ?? 0;
    const businessCompensation = Math.max(0, netProfit - seDeduction);
    return [{
      owner_tin: o.owner_tin,
      wage_document_references: e.wage_document_references,
      business_inventory_reference: e.business_inventory_reference,
      wage_compensation: wageCompensation,
      nontaxable_combat_pay: combatPay,
      net_business_profit: netProfit,
      deductible_se_tax: seDeduction,
      business_compensation: businessCompensation,
      own_eligible_compensation: sumSourceMoney([
        wageCompensation,
        combatPay,
        businessCompensation,
      ]),
    }];
  });
  const calculation = calculateIraBasis2026({
    filing_status: input.filing_status,
    taxpayer_ssn: input.taxpayer_ssn,
    spouse_ssn: input.spouse_ssn,
    taxpayer_dob: input.taxpayer_dob,
    spouse_dob: input.spouse_dob,
    taxpayer_can_be_claimed_as_dependent:
      input.taxpayer_can_be_claimed_as_dependent,
    spouse_can_be_claimed_as_dependent:
      input.spouse_can_be_claimed_as_dependent,
    current_copies: input.current_copies,
    form4852_sources_2026: input.form4852_sources_2026,
    claim: {
      ...input.claim,
      owners: input.claim.owners.map((o) => {
        const e = o.nondeductible_election;
        return {
          ...o,
          nondeductible_election: e
            ? {
              record_reference: e.record_reference,
              owner_tin: e.owner_tin,
              all_listed_contributions_elected_nondeductible:
                e.all_listed_contributions_elected_nondeductible,
              no_ira_deduction_claimed: e.no_ira_deduction_claimed,
              compensation_record_reference: e.compensation_record_reference,
              no_spousal_compensation_allocation:
                e.no_spousal_compensation_allocation,
              own_eligible_compensation: compensation.find((v) =>
                v.owner_tin === o.owner_tin
              )!.own_eligible_compensation,
            }
            : undefined,
        };
      }),
    },
  });
  return { source_input: input, compensation, calculation };
}
