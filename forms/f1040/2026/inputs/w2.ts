import { newCodes, w2Item2026Schema } from "./w2-source.ts";
export { w2Item2026Schema } from "./w2-source.ts";
import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import {
  Box12Code,
  box14Amount,
  w2,
  w2ItemSchema,
} from "../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { wages2026 } from "../../nodes/config/2026-wages.ts";

const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);

export const inputSchema = z.object({
  w2s: z.array(w2Item2026Schema).default([]),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
}).strict();

export class W2Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "w2";
  readonly inputSchema = inputSchema;
  // Shared destination identities; the 2026 registry must supply its own nodes.
  readonly outputNodes = w2.outputNodes;
  override get outputNodeTypes(): readonly string[] {
    return [
      ...this.outputNodes.nodeTypes.filter((node) => node !== "form8889"),
      // Resolve by registry key: source replays must not import downstream AGI.
      "f3903",
      "f1099r",
      "able_accounts",
      "hsa_accounts",
    ];
  }

  compute(ctx: NodeContext, rawInput: z.input<typeof inputSchema>): NodeResult {
    if (ctx.formType !== "f1040" || ctx.taxYear !== 2026) {
      throw new Error("2026 W-2 needs f1040:2026 context");
    }
    const input = inputSchema.parse(rawInput);
    if (input.w2s.length === 0) {
      return {
        outputs: [{ nodeType: "schedule3", fields: { line11_excess_ss: 0 } }],
      };
    }
    const primary = input.taxpayer_ssn.replaceAll("-", "");
    const spouse = input.spouse_ssn?.replaceAll("-", "");
    if (
      input.filing_status === FilingStatus.MFJ &&
      (!spouse || spouse === primary)
    ) {
      throw new Error(
        "Joint W-2 intake needs distinct taxpayer and spouse identities",
      );
    }
    const employerTotals = new Map<
      string,
      { wages: number; withheld: number; missingWithholding: boolean }
    >();
    const deferralsByOwner = new Map<string, number>();
    for (const item of input.w2s) {
      const owner = item.employee_ssn.replaceAll("-", "");
      if (
        owner !== primary &&
        !(input.filing_status === FilingStatus.MFJ && owner === spouse)
      ) {
        throw new Error("W-2 employee does not belong to this return");
      }
      const pair = `${owner}:${item.employer_ein.replaceAll("-", "")}`;
      const totals = employerTotals.get(pair) ??
        { wages: 0, withheld: 0, missingWithholding: false };
      if (
        (item.box4_ss_withheld ?? 0) > 0 && item.box3_ss_wages === undefined
      ) {
        throw new Error(
          "W-2 Social Security withholding needs actual box 3 wages, including explicit zero",
        );
      }
      totals.missingWithholding ||= item.box4_ss_withheld === undefined;
      totals.wages += (item.box3_ss_wages ?? 0) + (item.box7_ss_tips ?? 0);
      totals.withheld += item.box4_ss_withheld ?? 0;
      employerTotals.set(pair, totals);
      if (
        totals.wages > wages2026.ssWageBase ||
        totals.withheld > wages2026.ssTaxPerEmployer
      ) {
        throw new Error(
          "W-2 same-employer Social Security totals need correction before an excess credit",
        );
      }
      for (
        const [group, codes] of [
          ["elective", [
            Box12Code.D,
            Box12Code.E,
            Box12Code.F,
            Box12Code.AA,
            Box12Code.BB,
          ]],
          ["457", [Box12Code.G, Box12Code.EE]],
          ["simple", [Box12Code.S]],
        ] as const
      ) {
        const total = (item.box12_entries ?? []).filter((entry) =>
          codes.some((code) => code === entry.code)
        ).reduce((sum, entry) => sum + entry.amount, 0);
        const key = `${owner}:${group}`;
        deferralsByOwner.set(key, (deferralsByOwner.get(key) ?? 0) + total);
      }
      if (
        (item.box12_entries ?? []).some((entry) =>
          entry.amount > 0 &&
          (entry.code === "II" || entry.code === Box12Code.Z)
        )
      ) {
        throw new Error(
          "2026 W-2 code II/Z needs Medicaid-waiver election or section 409A tax review before calculation",
        );
      }
    }
    // The 2025 catch-up/excess-deferral helper embeds prior-year ages and limits.
    // Do not silently skip an excess because its year guard excludes 2026.
    if (
      [...deferralsByOwner].some(([key, amount]) =>
        amount >
          (key.endsWith(":simple") ? 17_000 : 24_500)
      )
    ) {
      throw new Error(
        "2026 catch-up/Roth or excess-deferral review is required above the owner's base limit",
      );
    }
    const projected = input.w2s.map((
      {
        tax_year: _year,
        box12_entries,
        box14a_entries,
        box14b_tipped_codes: _codes,
        ...item
      },
    ) =>
      w2ItemSchema.parse({
        ...item,
        box14_entries: box14a_entries,
        box12_entries: box12_entries?.filter((entry) =>
          !newCodes.has(entry.code)
        ),
      })
    );
    const common = w2.computeWithConfig(ctx, { w2s: projected }, wages2026);
    const outputs = common.outputs.filter((output) =>
      output.nodeType !== "schedule3" && output.nodeType !== "form8959" &&
      output.nodeType !== "schedule_a" && output.nodeType !== "schedule_c" &&
      output.nodeType !== "schedule_se" && output.nodeType !== "form8880" &&
      output.nodeType !== "form8889"
    ).map((output) => {
      // Form 1040 line 1i is the EIC election, not the amount printed in W-2 Q.
      if (output.nodeType === "f1040") {
        const { line1i_combat_pay: _combat, ...fields } = output.fields;
        return { ...output, fields };
      }
      if (output.nodeType === "form8919") {
        const sources = output.fields.w2_sources as Record<string, unknown>[];
        return {
          ...output,
          fields: {
            w2_sources: sources.map((source, i) => ({
              ...source,
              source_document_reference: input.w2s[i].source_document_reference,
              ss_wages_and_tips: input.w2s[i].box3_ss_wages === undefined &&
                  input.w2s[i].box7_ss_tips === undefined &&
                  box14Amount(projected[i], "RRTA compensation") === undefined
                ? undefined
                : source.ss_wages_and_tips,
            })),
          },
        };
      }
      if (output.nodeType === "form4137") {
        const sources = output.fields.w2_tip_sources as Record<
          string,
          unknown
        >[];
        return {
          ...output,
          fields: {
            w2_tip_sources: sources.map((source, i) => ({
              ...source,
              source_document_reference: input.w2s[i].source_document_reference,
            })),
          },
        };
      }
      if (output.nodeType !== "schedule2") return output;
      const old = output.fields;
      const allowed = new Set([
        "uncollected_fica",
        "uncollected_fica_gtl",
        "golden_parachute_excise",
      ]);
      if (Object.keys(old).some((key) => !allowed.has(key))) {
        throw new Error("Unmapped 2026 W-2 Schedule 2 source");
      }
      return {
        nodeType: "schedule2",
        fields: {
          line17c_w2_uncollected_fica: Number(old.uncollected_fica ?? 0) +
            Number(old.uncollected_fica_gtl ?? 0),
          line13k_golden_parachute_tax: Number(
            old.golden_parachute_excise ?? 0,
          ),
        },
      };
    });
    outputs.push({
      nodeType: "schedule_c",
      fields: { w2_sources_2026: input.w2s },
    });
    outputs.push({
      nodeType: "hsa_accounts",
      fields: { wage_sources: input.w2s },
    });
    outputs.push({
      nodeType: "able_accounts",
      fields: { wage_sources: input.w2s },
    });
    outputs.push({
      nodeType: "f1099r",
      fields: { wage_sources: input.w2s },
    });
    outputs.push({
      nodeType: "eitc",
      fields: {
        w2_eic_sources_2026: input.w2s.map((item) => ({
          recipient: item.employee_ssn.replaceAll("-", "") === primary
            ? "taxpayer"
            : "spouse",
          source_reference: item.source_document_reference,
          combat_pay: (item.box12_entries ?? []).filter((entry) =>
            entry.code === "Q"
          ).reduce((n, entry) => n + entry.amount, 0),
          statutory_employee: item.box13_statutory_employee === true,
        })),
      },
    });
    outputs.push({
      nodeType: "f8812",
      fields: {
        nontaxable_combat_pay_from_w2: input.w2s.reduce((sum, item) =>
          sum +
          (item.box12_entries ?? []).filter((entry) => entry.code === "Q")
            .reduce((n, entry) => n + entry.amount, 0), 0),
        statutory_employee_from_w2: input.w2s.some((item) =>
          item.box13_statutory_employee === true
        ),
      },
    });
    outputs.push({
      nodeType: "schedule_a",
      fields: {
        w2_tax_sources: input.w2s.map((item) => ({
          source_document_reference: item.source_document_reference,
          employee_ssn: item.employee_ssn,
          employer_ein: item.employer_ein,
          box17_state_withheld: item.box17_state_withheld ?? 0,
          box19_local_withheld: item.box19_local_withheld ?? 0,
          mandatory_state_contributions: (item.box14a_entries ?? [])
            .filter((entry) => entry.is_state_sdi_pfml)
            .map((entry) => ({
              description: entry.description,
              amount: entry.amount,
            })),
        })),
      },
    });
    const ownerTotals = new Map<
      string,
      {
        employers: number;
        wages: number;
        withheld: number;
        missingWithholding: boolean;
      }
    >();
    for (const [pair, employer] of employerTotals) {
      const owner = pair.split(":")[0];
      const total = ownerTotals.get(owner) ??
        { employers: 0, wages: 0, withheld: 0, missingWithholding: false };
      if (employer.wages > 0 || employer.withheld > 0) total.employers++;
      total.missingWithholding ||= employer.missingWithholding;
      total.wages += employer.wages;
      total.withheld += employer.withheld;
      ownerTotals.set(owner, total);
    }
    if (
      [...ownerTotals.values()].some((owner) =>
        owner.employers > 1 &&
        owner.wages > wages2026.ssWageBase && owner.missingWithholding
      )
    ) {
      throw new Error(
        "Excess Social Security credit needs actual W-2 box 4 withholding from every employer",
      );
    }
    const excessSs = Math.round(
      [...ownerTotals.values()].reduce((sum, owner) =>
        sum +
        (owner.employers > 1 && owner.wages > wages2026.ssWageBase
          ? Math.max(0, owner.withheld - wages2026.ssTaxPerEmployer)
          : 0), 0),
    );
    outputs.push({
      nodeType: "f8812",
      fields: {
        excess_social_security_from_w2: excessSs,
        payroll_sources_2026: input.w2s.map((item, i) => ({
          source_reference: item.source_document_reference,
          social_security_withheld: item.box4_ss_withheld,
          medicare_withheld: item.box6_medicare_withheld,
          rrta: (box14Amount(projected[i], "RRTA compensation") ?? 0) > 0,
        })),
      },
    });
    outputs.push({
      nodeType: "schedule3",
      fields: { line11_excess_ss: excessSs },
    });
    // Keep issued TP/TT evidence intact. The 2026 Schedule 1-A calculator must
    // apply recipient eligibility, occupation allocation and MAGI limits; do not
    // pretend box 7 or a 2025 employer statement is the new box 12 source.
    // Retain employer identity even without TP: Form 4137 can supply its tips.
    const schedule1aSources = input.w2s.map((item) => ({
      employee_ssn: item.employee_ssn,
      employer_ein: item.employer_ein,
      employer_name: item.employer_name,
      source_document_reference: item.source_document_reference,
      box1_wages: item.box1_wages,
      statutory_employee: item.box13_statutory_employee === true,
      cash_tips:
        item.box12_entries?.find((entry) => entry.code === "TP")?.amount ?? 0,
      qualified_overtime:
        item.box12_entries?.find((entry) => entry.code === "TT")?.amount ?? 0,
      occupation_codes: item.box14b_tipped_codes ?? [],
    }));
    if (schedule1aSources.length) {
      outputs.push({
        nodeType: "schedule1a",
        fields: { w2_2026_sources: schedule1aSources },
      });
    }
    outputs.push({
      nodeType: "form8959",
      fields: {
        w2_medicare_sources_2026: input.w2s.map((item, i) => {
          const rrta = box14Amount(projected[i], "RRTA compensation") ?? 0;
          const uncollected = (item.box12_entries ?? []).filter((entry) =>
            entry.code === Box12Code.B || entry.code === Box12Code.N
          ).reduce((n, entry) => n + entry.amount, 0);
          return {
            employee_ssn: item.employee_ssn,
            employer_ein: item.employer_ein,
            source_document_reference: item.source_document_reference,
            box5_medicare_wages: item.box5_medicare_wages,
            box6_medicare_withheld: item.box6_medicare_withheld,
            uncollected_fica_medicare: rrta > 0 ? 0 : uncollected,
            rrta_compensation: rrta,
            rrta_additional_withheld:
              box14Amount(projected[i], "Additional Medicare Tax") ?? 0,
          };
        }),
      },
    });
    outputs.push({
      nodeType: "f3903",
      fields: {
        w2_moving_sources_2026: input.w2s.map((item) => ({
          source_document_reference: item.source_document_reference,
          employee_ssn: item.employee_ssn,
          employer_ein: item.employer_ein,
          box1_wages: item.box1_wages,
          box12_p: item.box12_entries?.find((e) => e.code === "P")?.amount ?? 0,
        })),
      },
    });
    // The source record retains TA; it is excluded from box 1, not a second wage.
    outputs.push({ nodeType: "form8880", fields: { wage_sources: input.w2s } });
    outputs.push({ nodeType: "form2441", fields: { wage_sources: input.w2s } });
    outputs.push({ nodeType: "w2", fields: { issued_w2_sources: input.w2s } });
    return { outputs };
  }
}

export const w2_2026 = new W2Node2026();
