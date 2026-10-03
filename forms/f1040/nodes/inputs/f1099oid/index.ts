import { z } from "zod";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { form6251 } from "../../intermediate/forms/form6251/index.ts";
import { form4952 } from "../../intermediate/forms/form4952/index.ts";
import { schedule_b } from "../../intermediate/aggregation/schedule_b/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { pabAllocableDeductionWorkpaperSchema } from "../pab_allocable_deduction.ts";

// Per-item schema — one 1099-OID from one payer
// IRS Form 1099-OID TY2025: Original Issue Discount
export const itemSchema = z.object({
  // Payer identification
  payer_name: z.string().min(1),
  payer_tin: z.string().optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  recipient_tin: z.string().regex(/^\d{9}$/).optional(),
  account_number: z.string().trim().min(1).max(40).optional(),

  // Box 1: Original issue discount for 2025
  box1_oid: z.number().nonnegative().optional(),
  // Confirm this OID is investment-property income omitted from the Form 4952
  // manual "other" source facts.
  investment_property_for_form4952: z.boolean().optional(),

  // Box 2: Other periodic interest
  box2_other_interest: z.number().nonnegative().optional(),

  // Box 3: Early withdrawal penalty (deductible on Schedule 1 line 18)
  box3_early_withdrawal_penalty: z.number().nonnegative().optional(),

  // Box 4: Federal income tax withheld
  box4_federal_withheld: z.number().nonnegative().optional(),

  // Box 5: accrued market discount; include as interest only when the
  // taxpayer's current-inclusion election applies to this instrument.
  box5_market_discount: z.number().nonnegative().optional(),
  box5_included_in_income_currently: z.boolean().optional(),

  // Box 6: Acquisition premium (reduces OID reportable)
  box6_acquisition_premium: z.number().nonnegative().optional(),
  box6_applies_to: z.enum(["taxable_oid", "tax_exempt_oid"]).optional(),

  // Box 7: Description (CUSIP / instrument name)
  box7_description: z.string().optional(),

  // Box 8: Original issue discount on US Treasury obligations
  box8_oid_treasury: z.number().nonnegative().optional(),

  // Box 9: Investment expenses (deductible; IRC §212)
  box9_investment_expenses: z.number().nonnegative().optional(),

  // Box 10: Bond premium (reduces taxable OID)
  box10_bond_premium: z.number().nonnegative().optional(),
  box10_applies_to: z.enum(["taxable_stated_interest", "tax_exempt_oid"])
    .optional(),

  // Box 11: Tax-exempt OID (from private activity bonds — AMT preference item)
  box11_tax_exempt_oid: z.number().nonnegative().optional(),
  // Explicit AMT preference share of net tax-exempt OID. Box 11 alone does
  // not establish that the bond is a specified private-activity bond.
  box11_pab_oid: z.number().nonnegative().optional(),
  pab_eligible_bonds_reviewed: z.literal(true).optional(),
  pab_allocable_deduction_workpaper: pabAllocableDeductionWorkpaperSchema
    .optional(),
  pab_review_reference: z.string().trim().min(1).optional(),
  pab_bond_identifier: z.string().trim().min(1).optional(),

  // Box 12: State tax withheld (informational)
  box12_state_tax: z.number().nonnegative().optional(),

  // Box 13: FATCA filing requirement flag
  box13_fatca: z.boolean().optional(),

  // Nominee/adjustments
  nominee_oid: z.number().nonnegative().optional(),
});

// Node inputSchema
export const inputSchema = z.object({
  f1099oids: z.array(itemSchema).min(1),
});

type OIDItem = z.infer<typeof itemSchema>;
type OIDItems = OIDItem[];

export function assertDistinct1099OIDCopies(items: OIDItems): void {
  const seenReferences = new Set<string>();
  const seenAccounts = new Set<string>();
  const seenOwners = new Set<string>();
  const unidentifiedCopies = new Set<string>();
  for (const item of items) {
    const payer = item.payer_tin?.replace(/\D/g, "") || item.payer_name.trim();
    const owner = JSON.stringify([payer, item.recipient_tin ?? null]);
    if (item.source_document_reference) {
      const key = item.source_document_reference;
      if (seenReferences.has(key)) {
        throw new Error(
          "1099-OID repeats the same issued-copy source reference; corrected copies need a reviewed single current row",
        );
      }
      seenReferences.add(key);
    }
    if (item.account_number) {
      // One account can hold multiple obligations reported on separate OID
      // copies; box 7 distinguishes those obligations within the account.
      const key = JSON.stringify([
        owner,
        item.account_number,
        item.box7_description?.trim().toUpperCase() ?? null,
      ]);
      if (seenAccounts.has(key)) {
        throw new Error(
          "1099-OID repeats the same payer, recipient, account, and obligation; corrected copies need a reviewed single current row",
        );
      }
      seenAccounts.add(key);
    }
    const positive = [
      item.box1_oid,
      item.box2_other_interest,
      item.box3_early_withdrawal_penalty,
      item.box4_federal_withheld,
      item.box5_market_discount,
      item.box6_acquisition_premium,
      item.box8_oid_treasury,
      item.box9_investment_expenses,
      item.box10_bond_premium,
      item.box11_tax_exempt_oid,
      item.box12_state_tax,
    ].some((amount) => (amount ?? 0) > 0);
    if (!positive) continue;
    if (!item.account_number && !item.source_document_reference) {
      if (seenOwners.has(owner)) {
        throw new Error(
          "1099-OID has multiple positive payer copies without account or issued source reference",
        );
      }
      unidentifiedCopies.add(owner);
    } else if (unidentifiedCopies.has(owner)) {
      throw new Error(
        "1099-OID has multiple positive payer copies without account or issued source reference",
      );
    }
    seenOwners.add(owner);
  }
}

function taxableInterest(item: OIDItem): number {
  const gross = (item.box1_oid ?? 0) + (item.box8_oid_treasury ?? 0) +
    (item.box2_other_interest ?? 0) +
    (item.box5_included_in_income_currently === true
      ? item.box5_market_discount ?? 0
      : 0);
  const taxablePremium = item.box10_applies_to === "taxable_stated_interest"
    ? item.box10_bond_premium ?? 0
    : 0;
  return gross -
    (item.box6_applies_to === "taxable_oid"
      ? item.box6_acquisition_premium ?? 0
      : 0) -
    (item.nominee_oid ?? 0) - taxablePremium;
}

function taxExemptInterest(item: OIDItem): number {
  return (item.box11_tax_exempt_oid ?? 0) -
    (item.box6_applies_to === "tax_exempt_oid"
      ? item.box6_acquisition_premium ?? 0
      : 0) -
    (item.box10_applies_to === "tax_exempt_oid"
      ? item.box10_bond_premium ?? 0
      : 0);
}

function validateItem(item: OIDItem): void {
  if (
    (item.box5_market_discount ?? 0) > 0 &&
    item.box5_included_in_income_currently === undefined
  ) {
    throw new Error("1099-OID box 5 needs a current-inclusion answer");
  }
  const taxableOid = (item.box1_oid ?? 0) + (item.box8_oid_treasury ?? 0);
  if ((item.box6_acquisition_premium ?? 0) > 0 && !item.box6_applies_to) {
    throw new Error(
      "1099-OID box 6 needs its taxable or tax-exempt OID classification",
    );
  }
  const oid = item.box6_applies_to === "tax_exempt_oid"
    ? item.box11_tax_exempt_oid ?? 0
    : taxableOid;
  if ((item.box6_acquisition_premium ?? 0) > oid) {
    throw new Error("1099-OID acquisition premium exceeds reported OID");
  }
  const taxableAcquisitionPremium = item.box6_applies_to === "taxable_oid"
    ? item.box6_acquisition_premium ?? 0
    : 0;
  if ((item.nominee_oid ?? 0) > taxableOid - taxableAcquisitionPremium) {
    throw new Error(
      "1099-OID nominee amount exceeds OID after acquisition premium",
    );
  }
  if ((item.box10_bond_premium ?? 0) > 0 && !item.box10_applies_to) {
    throw new Error(
      "1099-OID box 10 needs its taxable or tax-exempt interest classification",
    );
  }
  const premiumBase = item.box10_applies_to === "tax_exempt_oid"
    ? item.box11_tax_exempt_oid ?? 0
    : item.box2_other_interest ?? 0;
  if ((item.box10_bond_premium ?? 0) > premiumBase) {
    throw new Error(
      "1099-OID box 10 bond premium exceeds the related interest",
    );
  }
  if (taxExemptInterest(item) < 0) {
    throw new Error("1099-OID tax-exempt adjustments exceed box 11 OID");
  }
  if ((item.box11_tax_exempt_oid ?? 0) > 0) {
    if (
      item.box11_pab_oid === undefined ||
      item.box11_pab_oid > taxExemptInterest(item)
    ) {
      throw new Error(
        "1099-OID tax-exempt OID needs its explicit private-activity-bond share",
      );
    }
  } else if ((item.box11_pab_oid ?? 0) > 0) {
    throw new Error("1099-OID PAB interest requires tax-exempt OID");
  }
}

// Route each payer's reported taxable amount and adjustments to Schedule B.
function scheduleBOutputs(items: OIDItems): NodeOutput[] {
  return items
    .filter((item) =>
      (item.box1_oid ?? 0) + (item.box2_other_interest ?? 0) +
          (item.box8_oid_treasury ?? 0) +
          (item.box5_included_in_income_currently === true
            ? item.box5_market_discount ?? 0
            : 0) > 0
    )
    .map((item) =>
      output(schedule_b, {
        interest_detail: {
          payer_name: item.payer_name,
          gross: (item.box1_oid ?? 0) + (item.box2_other_interest ?? 0) +
            (item.box8_oid_treasury ?? 0) +
            (item.box5_included_in_income_currently === true
              ? item.box5_market_discount ?? 0
              : 0),
          net: taxableInterest(item),
          nominee: item.nominee_oid ?? 0,
          accrued: 0,
          oid_adjustment: item.box6_applies_to === "taxable_oid"
            ? item.box6_acquisition_premium ?? 0
            : 0,
          bond_premium: item.box10_applies_to === "taxable_stated_interest"
            ? item.box10_bond_premium ?? 0
            : 0,
        },
      })
    );
}

// Form 6251 AMT: tax-exempt OID from private activity bonds (box11)
function form6251Output(items: OIDItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => {
      const gross = item.box11_pab_oid ?? 0;
      const deduction = item.pab_allocable_deduction_workpaper
        ?.allocable_deduction ?? 0;
      if (deduction > gross) {
        throw new Error(
          "1099-OID PAB allocable deduction exceeds specified-bond OID",
        );
      }
      return sum + gross - deduction;
    },
    0,
  );
  if (total <= 0) return [];
  return [output(form6251, { line2g_pab_interest: total })];
}

function taxExemptOutputs(items: OIDItems): NodeOutput[] {
  const total = items.reduce((sum, item) => sum + taxExemptInterest(item), 0);
  return total > 0
    ? [
      output(f1040, { line2a_tax_exempt: total }),
      output(agi_aggregator, { tax_exempt_interest: total }),
    ]
    : [];
}

function earlyWithdrawalOutput(items: OIDItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box3_early_withdrawal_penalty ?? 0),
    0,
  );
  return total > 0
    ? [output(schedule1, { line18_early_withdrawal: total })]
    : [];
}

// f1040 line25b: federal withholding from box4
function withholdingOutput(items: OIDItems): NodeOutput[] {
  const total = items.reduce(
    (sum, item) => sum + (item.box4_federal_withheld ?? 0),
    0,
  );
  if (total <= 0) return [];
  return [output(f1040, { line25b_withheld_1099: total })];
}

class F1099oidNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1099oid";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_b,
    f1040,
    form6251,
    form4952,
    agi_aggregator,
    schedule1,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f1099oids } = inputSchema.parse(input);
    assertDistinct1099OIDCopies(f1099oids);
    f1099oids.forEach(validateItem);

    const outputs: NodeOutput[] = [
      ...scheduleBOutputs(f1099oids),
      ...form6251Output(f1099oids),
      ...taxExemptOutputs(f1099oids),
      ...earlyWithdrawalOutput(f1099oids),
      ...withholdingOutput(f1099oids),
    ];

    for (const item of f1099oids) {
      if (item.investment_property_for_form4952 !== true) continue;
      const interest = taxableInterest(item);
      if (interest > 0) {
        outputs.push(output(form4952, { source_1099_interest: interest }));
      }
    }

    return { outputs };
  }
}

export const f1099oid = new F1099oidNode();
