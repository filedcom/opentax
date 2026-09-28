import { z } from "zod";
import { FilingStatus } from "../../types.ts";

export enum CommunityPropertyState {
  AZ = "AZ",
  CA = "CA",
  ID = "ID",
  LA = "LA",
  NM = "NM",
  NV = "NV",
  TX = "TX",
  WA = "WA",
  WI = "WI",
}

export enum Form8958Line {
  Wages = 1,
  Interest = 2,
  Dividends = 3,
  StateTaxRefund = 4,
  SelfEmploymentIncome = 5,
  CapitalGainLoss = 6,
  PensionIncome = 7,
  RentsRoyaltiesPassThrough = 8,
  DeductibleSelfEmploymentTax = 9,
  SelfEmploymentTax = 10,
  Withholding = 11,
  Other = 12,
}

export enum AllocationBasis {
  CommunityEqual = "community_equal",
  TaxpayerSeparate = "taxpayer_separate",
  OtherPersonSeparate = "other_person_separate",
  ReviewedException = "reviewed_exception",
}

const reference = z.string().trim().min(1);
const wholeDollar = z.number().refine(Number.isSafeInteger);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

export const allocationItemSchema = z.object({
  item_id: reference,
  form_line: z.nativeEnum(Form8958Line),
  description: z.string().trim().min(1).max(40),
  source_document_id: reference,
  source_record_reference: reference,
  allocation_basis: z.nativeEnum(AllocationBasis),
  state_law_workpaper_reference: reference,
  federal_exception_workpaper_reference: reference.optional(),
  total_amount: wholeDollar,
  taxpayer_share: wholeDollar,
  other_person_share: wholeDollar,
}).strict().superRefine((item, ctx) => {
  if (item.taxpayer_share + item.other_person_share !== item.total_amount) {
    ctx.addIssue({
      code: "custom",
      path: ["taxpayer_share"],
      message: "Form 8958 B + C must equal A",
    });
  }
  if (
    item.form_line === Form8958Line.Withholding &&
    (item.total_amount < 0 || item.taxpayer_share < 0 ||
      item.other_person_share < 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["total_amount"],
      message: "Withholding cannot be negative",
    });
  }
  if (
    item.allocation_basis === AllocationBasis.CommunityEqual &&
    Math.abs(item.taxpayer_share - item.other_person_share) > 1
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["allocation_basis"],
      message: "Community-equal shares differ by more than one rounding dollar",
    });
  }
  if (
    item.allocation_basis === AllocationBasis.TaxpayerSeparate &&
    (item.taxpayer_share !== item.total_amount || item.other_person_share !== 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["allocation_basis"],
      message: "Taxpayer-separate amount must belong wholly to taxpayer",
    });
  }
  if (
    item.allocation_basis === AllocationBasis.OtherPersonSeparate &&
    (item.taxpayer_share !== 0 || item.other_person_share !== item.total_amount)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["allocation_basis"],
      message: "Other-person-separate amount must belong wholly to spouse",
    });
  }
  if (
    (item.allocation_basis === AllocationBasis.ReviewedException) !==
      (item.federal_exception_workpaper_reference !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["federal_exception_workpaper_reference"],
      message: "Exception allocation needs its own federal workpaper",
    });
  }
});

export const inputSchema = z.object({
  domicile_state: z.nativeEnum(CommunityPropertyState),
  federal_filing_status: z.literal(FilingStatus.MFS),
  taxpayer: z.object({
    first_name: reference,
    last_name: reference,
    ssn: z.string().regex(/^\d{9}$/),
  }).strict(),
  spouse: z.object({
    first_name: reference,
    last_name: reference,
    ssn: z.string().regex(/^\d{9}$/),
  }).strict(),
  community_property_period: z.object({
    from: date,
    through: date,
    domicile_workpaper_reference: reference,
  }).strict(),
  reviewed_by: reference,
  reviewed_on: date,
  return_wide_items_review_reference: reference,
  rows: z.array(allocationItemSchema).min(1),
}).strict().superRefine((input, ctx) => {
  if (
    input.taxpayer.ssn === input.spouse.ssn ||
    input.community_property_period.from >
      input.community_property_period.through ||
    input.community_property_period.from < "2025-01-01" ||
    input.community_property_period.through > "2025-12-31"
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["community_property_period"],
      message: "Distinct spouses and a valid 2025 domicile period are required",
    });
  }
  if (
    new Set(input.rows.map((row) => row.item_id)).size !== input.rows.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["rows"],
      message: "Allocation item IDs must be distinct",
    });
  }
  const lineCounts = new Map<Form8958Line, number>();
  const lineTotals = new Map<Form8958Line, [number, number, number]>();
  for (const row of input.rows) {
    const count = (lineCounts.get(row.form_line) ?? 0) + 1;
    lineCounts.set(row.form_line, count);
    const previous = lineTotals.get(row.form_line) ?? [0, 0, 0];
    lineTotals.set(row.form_line, [
      previous[0] + row.total_amount,
      previous[1] + row.taxpayer_share,
      previous[2] + row.other_person_share,
    ]);
    if (count > 40) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: "TY2025 IRS8958 permits at most 40 native rows per line",
      });
      break;
    }
    if (
      (row.form_line === Form8958Line.DeductibleSelfEmploymentTax ||
        row.form_line === Form8958Line.SelfEmploymentTax) &&
      row.allocation_basis === AllocationBasis.CommunityEqual
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message:
          "Married spouses cannot infer equal self-employment tax from community income",
      });
    }
  }
  if (
    [...lineTotals.values()].some((values) =>
      values.some((value) => !Number.isSafeInteger(value))
    )
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["rows"],
      message: "Form 8958 line totals must remain safe whole dollars",
    });
  }
});

export type F8958Input = z.infer<typeof inputSchema>;

/** Arithmetic preflight only; does not allocate or authorize a filed return. */
export function prepareF8958Allocation(rawInput: F8958Input) {
  const input = inputSchema.parse(rawInput);
  const totalsByLine = Object.values(Form8958Line)
    .filter((value): value is Form8958Line => typeof value === "number")
    .map((line) => {
      const rows = input.rows.filter((row) => row.form_line === line);
      return {
        line,
        total: rows.reduce((sum, row) => sum + row.total_amount, 0),
        taxpayer: rows.reduce((sum, row) => sum + row.taxpayer_share, 0),
        spouse: rows.reduce((sum, row) => sum + row.other_person_share, 0),
      };
    });
  return { ...input, totalsByLine };
}
