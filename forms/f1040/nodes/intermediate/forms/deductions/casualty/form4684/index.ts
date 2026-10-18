import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../../core/types/tax-node.ts";
import {
  output,
  TaxNode,
} from "../../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../../core/types/output-nodes.ts";
import { scheduleA } from "../../../../../inputs/deductions/itemized/schedule_a/index.ts";
import { schedule_d } from "../../../../aggregation/income/investments/schedule_d/index.ts";
import { form4797 } from "../../../income/business/form4797/index.ts";
import { standard_deduction } from "../../../../worksheets/deductions/standard/standard_deduction/index.ts";
import type { NodeContext } from "../../../../../../../../core/types/node-context.ts";

export enum PersonalCasualtyKind {
  // A loss attributable to a federally declared disaster (DR- or EM- number).
  FederallyDeclaredDisaster = "federally_declared_disaster",
  // A qualified disaster loss: $500 floor, no 10% AGI floor, and deductible
  // without itemizing (2025 Instructions for Form 4684, Qualified disaster
  // losses).
  QualifiedDisaster = "qualified_disaster",
  // Deductible only against personal casualty gains (Worksheet 1-1).
  NotFederallyDeclared = "not_federally_declared",
}

// Section A, line 11: $100 per casualty, or $500 when the qualified disaster
// loss rules apply (2025 Instructions for Form 4684, Line 11).
const PER_EVENT_FLOOR = 100;
const QUALIFIED_DISASTER_FLOOR = 500;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const wholeDollars = z.number().int().nonnegative();

const personalPropertySchema = z.object({
  property_type: z.string().trim().min(1).max(100).describe(
    "Line 1 type of property, such as House",
  ),
  address_line1: z.string().max(35).regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/)
    .optional(),
  city: z.string().max(22).regex(/^([A-Za-z] ?)*[A-Za-z]$/),
  state: z.string().regex(/^[A-Z]{2}$/),
  zip: z.string().regex(/^\d{5}(\d{4})?$/),
  acquired_date: isoDate,
  basis: wholeDollars.describe("Line 2 cost or other basis"),
  insurance: wholeDollars.describe(
    "Line 3 insurance or other reimbursement, whether or not a claim was filed",
  ),
  fmv_before: wholeDollars.describe("Line 5"),
  fmv_after: wholeDollars.describe("Line 6"),
}).strict();

const personalCasualtySchema = z.object({
  description: z.string().trim().min(1).max(50).describe(
    "The casualty or theft, such as the disaster's name",
  ),
  casualty_date: isoDate,
  kind: z.nativeEnum(PersonalCasualtyKind).describe(
    "qualified_disaster: $500 floor, and its net loss (line 15) is added to the standard deduction for a non-itemizer; not_federally_declared: deductible only against personal casualty gains",
  ),
  fema_declaration_number: z.string().regex(/^(DR|EM)-\d{4}$/).optional()
    .describe("FEMA DR- or EM- number; required for a federally declared or qualified disaster"),
  qualified_disaster_confirmed: z.literal(true).optional().describe(
    "Required for qualified_disaster: the loss is attributable to a disaster listed under Qualified disaster losses in the Instructions for Form 4684",
  ),
  properties: z.array(personalPropertySchema).min(1).max(4).describe(
    "Properties A through D lost or damaged in this one casualty",
  ),
}).strict().superRefine((casualty, ctx) => {
  const declared = casualty.kind !== PersonalCasualtyKind.NotFederallyDeclared;
  if (declared !== (casualty.fema_declaration_number !== undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fema_declaration_number"],
      message: declared
        ? "A federally declared or qualified disaster needs its FEMA declaration number"
        : "A casualty not attributable to a federally declared disaster has no FEMA number",
    });
  }
  if (
    (casualty.kind === PersonalCasualtyKind.QualifiedDisaster) !==
      (casualty.qualified_disaster_confirmed === true)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["qualified_disaster_confirmed"],
      message:
        "qualified_disaster_confirmed is set only, and always, for a qualified_disaster",
    });
  }
});

export const inputSchema = z.object({
  // Section A: one entry per casualty or theft, each its own Form 4684
  // through line 12.
  personal_casualties: z.array(personalCasualtySchema).min(1).optional(),

  // ── Business/Income-Producing Property (Section B) ────────────────────────
  // FMV before casualty/theft for business property
  business_fmv_before: z.number().nonnegative().optional(),

  // FMV after casualty/theft for business property
  business_fmv_after: z.number().nonnegative().optional(),

  // Adjusted basis of business property
  business_basis: z.number().nonnegative().optional(),

  // Insurance reimbursement received for business property
  business_insurance: z.number().nonnegative().optional(),

  // Filing facts for Section B, line 19 and its casualty summary. The MeF
  // builder requires them when a business loss is reported.
  business_property_description: z.string().trim().min(1).max(80).optional(),
  business_property_location: z.string().trim().min(1).max(80).optional(),
  business_acquired_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  business_casualty_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  business_casualty_description: z.string().trim().min(1).max(80).optional(),
  // Retained ownership and workpaper identity for disclosure/source joins.
  business_recipient_ssn: z.string().regex(/^\d{9}$/).optional(),
  business_source_document_reference: z.string().trim().min(1).max(500)
    .optional(),
  business_source_transaction_id: z.string().trim().min(1).max(500).optional(),

  // Whether business property is §1231 (held > 1 year)
  // true → routes to form4797; false → routes to schedule_d as capital loss
  business_is_section_1231: z.boolean().optional(),
});

type Form4684Input = z.infer<typeof inputSchema>;

type PersonalProperty = z.infer<typeof personalPropertySchema>;
export type PersonalCasualty = z.infer<typeof personalCasualtySchema>;

export type PersonalPropertyLines = {
  readonly line4Gain?: number;
  readonly line7FmvDecline?: number;
  readonly line8Smaller?: number;
  readonly line9Loss?: number;
};

export type PersonalCasualtyLines = {
  readonly casualty: PersonalCasualty;
  readonly properties: readonly PersonalPropertyLines[];
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
};

// Lines 13 through 16 of the one Form 4684 that carries them. Lines 16
// through 18 stay blank when the section stops at line 15.
export type SectionASummary = {
  readonly forms: readonly PersonalCasualtyLines[];
  readonly line13: number;
  readonly line14: number;
  readonly line15: number;
  readonly line16?: number;
};

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// The deductible loss amount before floors
// Loss = lesser of FMV decline or adjusted basis, minus insurance reimbursement
export function casualtyLossLines(
  fmvBefore: number,
  fmvAfter: number,
  basis: number,
  insurance: number,
): { fmvDecline: number; cappedLoss: number; loss: number } {
  const fmvDecline = Math.max(0, fmvBefore - fmvAfter);
  const cappedLoss = Math.min(fmvDecline, basis);
  return { fmvDecline, cappedLoss, loss: Math.max(0, cappedLoss - insurance) };
}

function rawLoss(
  fmvBefore: number,
  fmvAfter: number,
  basis: number,
  insurance: number,
): number {
  return casualtyLossLines(fmvBefore, fmvAfter, basis, insurance).loss;
}

/** Lines 2 through 9 for one property: line 4 when reimbursement exceeds
 * basis, lines 7 through 9 otherwise. */
export function personalPropertyLines(
  property: PersonalProperty,
): PersonalPropertyLines {
  if (property.insurance > property.basis) {
    return { line4Gain: property.insurance - property.basis };
  }
  const lines = casualtyLossLines(
    property.fmv_before,
    property.fmv_after,
    property.basis,
    property.insurance,
  );
  return {
    line7FmvDecline: lines.fmvDecline,
    line8Smaller: lines.cappedLoss,
    line9Loss: lines.loss,
  };
}

function personalCasualtyLines(
  casualty: PersonalCasualty,
): PersonalCasualtyLines {
  const properties = casualty.properties.map(personalPropertyLines);
  const line10 = properties.reduce((sum, p) => sum + (p.line9Loss ?? 0), 0);
  const line11 = casualty.kind === PersonalCasualtyKind.QualifiedDisaster
    ? QUALIFIED_DISASTER_FLOOR
    : PER_EVENT_FLOOR;
  return {
    casualty,
    properties,
    line10,
    line11,
    line12: Math.max(0, line10 - line11),
  };
}

function line12Total(
  forms: readonly PersonalCasualtyLines[],
  include: (kind: PersonalCasualtyKind) => boolean,
): number {
  return forms.filter((form) => include(form.casualty.kind))
    .reduce((sum, form) => sum + form.line12, 0);
}

/** Form 4684 Section A lines 1 through 16 (2025 Instructions for Form 4684,
 * Lines 13 through 16 and Worksheet 1-1). A net casualty gain (line 13 more
 * than line 14) goes to Schedule D by holding period, which is refused. */
export function personalSectionA(
  casualties: readonly PersonalCasualty[],
): SectionASummary {
  const forms = casualties.map(personalCasualtyLines);
  const line13 = forms.reduce(
    (sum, form) =>
      sum + form.properties.reduce((s, p) => s + (p.line4Gain ?? 0), 0),
    0,
  );
  const nonFederal = line12Total(
    forms,
    (kind) => kind === PersonalCasualtyKind.NotFederallyDeclared,
  );
  const line14 = line12Total(
    forms,
    (kind) => kind !== PersonalCasualtyKind.NotFederallyDeclared,
  ) + Math.min(nonFederal, line13);
  if (line13 > line14) {
    throw new Error(
      "Form 4684 line 15 net personal casualty gain needs its Schedule D holding-period split",
    );
  }
  const qualified = line12Total(
    forms,
    (kind) => kind === PersonalCasualtyKind.QualifiedDisaster,
  );
  const line15 = line13 === line14 ? 0 : Math.min(line14 - line13, qualified);
  const allQualified = forms.every((form) =>
    form.line10 === 0 ||
    form.casualty.kind === PersonalCasualtyKind.QualifiedDisaster
  );
  return {
    forms,
    line13,
    line14,
    line15,
    ...(line13 === line14 || allQualified
      ? {}
      : { line16: line14 - (line13 + line15) }),
  };
}

function buildPersonalOutput(input: Form4684Input): NodeOutput[] {
  if (input.personal_casualties === undefined) return [];
  const summary = personalSectionA(input.personal_casualties);
  const line16 = summary.line16 ?? 0;
  // Line 16 is limited by 10% of AGI on Schedule A, which holds AGI. A net
  // qualified disaster loss (line 15) is Schedule A line 16 when itemizing
  // or an increase to the standard deduction (2025 Instructions for Form
  // 1040, Line 12e, Exception 5).
  return [
    ...(line16 > 0
      ? [output(scheduleA, { form4684_line16_loss: line16 })]
      : []),
    ...(summary.line15 > 0
      ? [
        output(scheduleA, { net_qualified_disaster_loss: summary.line15 }),
        output(standard_deduction, {
          net_qualified_disaster_loss: summary.line15,
        }),
      ]
      : []),
  ];
}

function buildBusinessOutput(input: Form4684Input): NodeOutput[] {
  const fmvBefore = input.business_fmv_before ?? 0;
  const fmvAfter = input.business_fmv_after ?? 0;
  const basis = input.business_basis ?? 0;
  const insurance = input.business_insurance ?? 0;

  const loss = rawLoss(fmvBefore, fmvAfter, basis, insurance);
  if (loss <= 0) return [];

  if (input.business_is_section_1231) {
    // Form 4684 line 38a feeds Form 4797 line 14 when the net business
    // casualty is a loss. Keep its source separate from other ordinary gains.
    return [output(form4797, { ordinary_gain_form4684: -loss })];
  }

  // Capital loss on investment/personal use property held for investment
  // Routes to Schedule D as a short-term capital loss
  return [output(schedule_d, { line_11_form2439: -loss })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form4684Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4684";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    scheduleA,
    standard_deduction,
    schedule_d,
    form4797,
  ]);

  compute(_ctx: NodeContext, rawInput: Form4684Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const personalOutputs = buildPersonalOutput(input);
    const businessOutputs = buildBusinessOutput(input);

    return { outputs: [...personalOutputs, ...businessOutputs] };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form4684 = new Form4684Node();
