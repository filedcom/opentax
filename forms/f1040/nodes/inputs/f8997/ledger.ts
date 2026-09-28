import { z } from "zod";

// The annual ledger is a source contract, not an authorization to file. The
// MeF/PDF guard stays active until every linked Form 8949 and source document
// is reconciled against the finalized return.

export enum QofSpecialGainCode {
  Section1256 = "A",
  Section1231 = "B",
  Straddle = "C",
  Collectibles = "D",
  Treaty = "E",
  NoninclusionTransfer = "F",
  FiveYearBasis = "G",
  SevenYearBasis = "H",
}

export enum QofEventKind {
  Inclusion = "inclusion",
  Exception = "exception",
  NoninclusionTransferOut = "noninclusion_transfer_out",
}

export enum QofInclusionType {
  SaleOrExchange = "sale_or_exchange",
  Distribution = "distribution",
  Gift = "gift",
  Worthless = "worthless",
  QofCeased = "qof_ceased",
  Other = "other",
}

const sourceReference = z.string().trim().min(1);
const amount = z.number().int().nonnegative();
const taxId = z.string().regex(/^\d{9}$/);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");

function anniversary(date: string, years: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year + years, month - 1, day))
    .toISOString().slice(0, 10);
}

export const gainAmountsSchema = z.object({
  short_term: amount,
  long_term: amount,
}).strict();

const form8949RowsSchema = z.object({
  short_term_row_reference: sourceReference.optional(),
  long_term_row_reference: sourceReference.optional(),
}).strict();

const counterpartySchema = z.object({
  name: sourceReference,
  tin: taxId,
  transfer_date: isoDate,
  source_document_reference: sourceReference,
}).strict();

const newDeferralSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("new_election"),
    deferred_gain: gainAmountsSchema,
    gain_realized_date: isoDate,
    source_gain_references: z.array(sourceReference).min(1),
    form8949_code_z_rows: form8949RowsSchema,
    form4797_source_reference: sourceReference.optional(),
    special_gain_code: z.nativeEnum(QofSpecialGainCode).optional(),
  }).strict(),
  z.object({
    kind: z.literal("noninclusion_transfer_in"),
    deferred_gain: gainAmountsSchema,
    transferor: counterpartySchema,
    special_gain_code: z.literal(QofSpecialGainCode.NoninclusionTransfer),
  }).strict(),
]);

const dispositionSchema = z.object({
  source_transaction_reference: sourceReference,
  received_form1099b: z.boolean(),
  form1099b_reference: sourceReference.optional(),
  proceeds: amount,
  adjusted_basis: amount,
}).strict();

export const eventSchema = z.object({
  event_id: sourceReference,
  kind: z.nativeEnum(QofEventKind),
  inclusion_type: z.nativeEnum(QofInclusionType).optional(),
  event_date: isoDate,
  description: sourceReference,
  source_event_reference: sourceReference,
  special_gain_code: z.nativeEnum(QofSpecialGainCode).optional(),
  deferred_gain_removed: gainAmountsSchema,
  included_gain: gainAmountsSchema,
  basis_adjustment: gainAmountsSchema.optional(),
  basis_adjustment_code: z.enum([
    QofSpecialGainCode.FiveYearBasis,
    QofSpecialGainCode.SevenYearBasis,
  ]).optional(),
  basis_workpaper_reference: sourceReference.optional(),
  form8949_code_y_rows: form8949RowsSchema.optional(),
  form4797_source_reference: sourceReference.optional(),
  disposition: dispositionSchema.optional(),
  ten_year_fmv_election: z.object({
    elected: z.literal(true),
    fair_market_value: amount,
    adjusted_basis_before_election: amount,
    reviewed_workpaper_reference: sourceReference,
    form8949_sale_row_reference: sourceReference,
  }).strict().optional(),
  exception_regulation_citation: sourceReference.optional(),
  transferee: counterpartySchema.optional(),
}).strict();

export const investmentLotSchema = z.object({
  lot_id: sourceReference,
  qof_ein: taxId,
  acquired_date: isoDate,
  description: sourceReference,
  qof_source_document_reference: sourceReference,
  reviewed_workpaper_reference: sourceReference,
  origin_special_gain_code: z.nativeEnum(QofSpecialGainCode).optional(),
  formerly_qof_ein: taxId.optional(),
  opening_deferred_gain: gainAmountsSchema,
  new_deferral: newDeferralSchema.optional(),
  events: z.array(eventSchema),
  closing_deferred_gain: gainAmountsSchema,
}).strict();

const priorYearLotSchema = z.object({
  lot_id: sourceReference,
  qof_ein: taxId,
  acquired_date: isoDate,
  short_term: amount,
  long_term: amount,
}).strict();

export const inputSchema = z.object({
  tax_year: z.literal(2025),
  complete_annual_ledger_confirmed: z.literal(true),
  reviewed_annual_workpaper_reference: sourceReference,
  prior_year: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("first_year") }).strict(),
    z.object({
      kind: z.literal("continuing"),
      filed_form8997_reference: sourceReference,
      closing_lots: z.array(priorYearLotSchema).min(1),
    }).strict(),
  ]),
  investment_lots: z.array(investmentLotSchema).min(1),
  uninvested_deferred_gain_at_year_end: gainAmountsSchema,
  foreign_eligible_taxpayer: z.boolean(),
  treaty_benefits_waived: z.boolean(),
  no_form1099b_for_disposition: z.boolean(),
}).strict().superRefine((input, ctx) => {
  const fail = (message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  const lots = input.investment_lots;
  const ids = lots.map((lot) => lot.lot_id);
  if (new Set(ids).size !== ids.length) fail("Form 8997 lot IDs must be unique");
  const prior = input.prior_year.kind === "continuing"
    ? input.prior_year.closing_lots
    : [];
  if (new Set(prior.map((lot) => lot.lot_id)).size !== prior.length) {
    fail("Prior-year Form 8997 lot IDs must be unique");
  }
  const openingLots = lots.filter((lot) =>
    lot.opening_deferred_gain.short_term > 0 ||
    lot.opening_deferred_gain.long_term > 0
  );
  if (openingLots.length !== prior.length) {
    fail("Part I opening lots must match prior-year Form 8997 closing lots");
  }
  for (const previous of prior) {
    const current = openingLots.find((lot) => lot.lot_id === previous.lot_id);
    if (!current ||
      (current.qof_ein !== previous.qof_ein &&
        current.formerly_qof_ein !== previous.qof_ein) ||
      current.acquired_date !== previous.acquired_date ||
      current.opening_deferred_gain.short_term !== previous.short_term ||
      current.opening_deferred_gain.long_term !== previous.long_term) {
      fail("Part I lot does not reconcile to filed prior-year Form 8997");
    }
  }
  const eventIds: string[] = [];
  const form8949Ids: string[] = [];
  for (const lot of lots) {
    if (lot.opening_deferred_gain.short_term +
          lot.opening_deferred_gain.long_term === 0 &&
      !lot.new_deferral && lot.events.length === 0 &&
      lot.closing_deferred_gain.short_term +
          lot.closing_deferred_gain.long_term === 0) {
      fail("Form 8997 lot needs an opening, new, event, or closing fact");
    }
    if (lot.acquired_date > "2025-12-31") {
      fail("Form 8997 acquisition date cannot be after 2025");
    }
    const fresh = lot.new_deferral;
    if (lot.acquired_date >= "2025-01-01" && !fresh) {
      fail("New 2025 QOF lot needs its Part II deferral or transfer source");
    }
    if (fresh) {
      if (lot.opening_deferred_gain.short_term +
        lot.opening_deferred_gain.long_term > 0) {
        fail("New Part II acquisition cannot also be a beginning-of-year lot");
      }
      if (lot.acquired_date < "2025-01-01") {
        fail("Part II acquisition must occur during 2025");
      }
      const amounts = fresh.deferred_gain;
      if (amounts.short_term + amounts.long_term === 0) {
        fail("Part II deferred gain must be positive");
      }
      if (fresh.kind === "new_election") {
        if (fresh.special_gain_code === QofSpecialGainCode.NoninclusionTransfer ||
          fresh.special_gain_code === QofSpecialGainCode.FiveYearBasis ||
          fresh.special_gain_code === QofSpecialGainCode.SevenYearBasis) {
          fail("New deferral cannot use transfer or basis-adjustment codes");
        }
        if (fresh.gain_realized_date > lot.acquired_date) {
          fail("QOF investment cannot precede the realized eligible gain");
        }
        const elapsedDays = (Date.parse(lot.acquired_date) -
          Date.parse(fresh.gain_realized_date)) / 86_400_000;
        if (elapsedDays > 180) fail("QOF investment exceeds the 180-day period");
        if (amounts.short_term > 0 &&
          !fresh.form8949_code_z_rows.short_term_row_reference) {
          fail("Short-term QOF deferral needs its Form 8949 code Z row");
        }
        if (amounts.long_term > 0 &&
          !fresh.form8949_code_z_rows.long_term_row_reference) {
          fail("Long-term QOF deferral needs its Form 8949 code Z row");
        }
        if ((amounts.short_term === 0 &&
            fresh.form8949_code_z_rows.short_term_row_reference) ||
          (amounts.long_term === 0 &&
            fresh.form8949_code_z_rows.long_term_row_reference)) {
          fail("Form 8997 code Z row reference needs positive deferred gain of that character");
        }
        if (fresh.special_gain_code === QofSpecialGainCode.Section1231 &&
          !fresh.form4797_source_reference) {
          fail("Section 1231 QOF deferral needs Form 4797 source");
        }
        form8949Ids.push(
          ...Object.values(fresh.form8949_code_z_rows).filter(
            (id): id is string => id !== undefined,
          ),
        );
      } else if (fresh.special_gain_code !==
        QofSpecialGainCode.NoninclusionTransfer) {
        fail("Received noninclusion transfer needs special gain code F");
      } else if (fresh.transferor.transfer_date !== lot.acquired_date) {
        fail("Received transfer date must match the acquired QOF lot date");
      }
    }
    const removed = { short_term: 0, long_term: 0 };
    for (const event of lot.events) {
      eventIds.push(event.event_id);
      if (event.event_date < lot.acquired_date ||
        event.event_date > "2025-12-31" ||
        event.event_date < "2025-01-01") {
        fail("Form 8997 event date must be in 2025 after acquisition");
      }
      removed.short_term += event.deferred_gain_removed.short_term;
      removed.long_term += event.deferred_gain_removed.long_term;
      const adjustment = event.basis_adjustment ?? {
        short_term: 0,
        long_term: 0,
      };
      if (event.kind === QofEventKind.Inclusion) {
        if (!event.inclusion_type) {
          fail("Taxable inclusion needs an event classification");
        }
        if (event.included_gain.short_term + event.included_gain.long_term === 0) {
          fail("Inclusion event needs positive previously deferred gain");
        }
        for (const term of ["short_term", "long_term"] as const) {
          if (event.deferred_gain_removed[term] !==
            event.included_gain[term] + adjustment[term]) {
            fail("Inclusion, basis adjustment, and removed deferral must reconcile");
          }
          if (event.included_gain[term] > 0 &&
            !event.form8949_code_y_rows?.[`${term}_row_reference`]) {
            fail("Included gain needs its Form 8949 code Y row by character");
          }
          if (event.included_gain[term] === 0 &&
            event.form8949_code_y_rows?.[`${term}_row_reference`]) {
            fail("Form 8997 code Y row reference needs positive included gain of that character");
          }
        }
        if ((adjustment.short_term + adjustment.long_term > 0) !==
          (event.basis_adjustment_code !== undefined &&
            event.basis_workpaper_reference !== undefined)) {
          fail("Five/seven-year basis adjustment needs code and workpaper");
        }
        if (event.basis_adjustment_code &&
          event.event_date < anniversary(
            lot.acquired_date,
            event.basis_adjustment_code ===
                QofSpecialGainCode.FiveYearBasis ? 5 : 7,
          )) {
          fail("Five/seven-year basis adjustment needs the holding period");
        }
        if (event.special_gain_code === QofSpecialGainCode.Section1231 &&
          !event.form4797_source_reference) {
          fail("Section 1231 inclusion needs Form 4797 source");
        }
        if (event.exception_regulation_citation || event.transferee) {
          fail("Taxable inclusion cannot also be an exception or transfer-out");
        }
        if (event.inclusion_type === QofInclusionType.SaleOrExchange &&
          !event.disposition) {
          fail("QOF sale or exchange needs sourced disposition facts");
        }
        if (event.disposition &&
          event.disposition.received_form1099b !==
            (event.disposition.form1099b_reference !== undefined)) {
          fail("QOF disposition Form 1099-B answer needs matching source reference");
        }
        if (event.ten_year_fmv_election &&
          (!event.disposition ||
            event.inclusion_type !== QofInclusionType.SaleOrExchange ||
            event.event_date < anniversary(lot.acquired_date, 10))) {
          fail("Ten-year FMV election needs a sourced qualifying disposition");
        }
        form8949Ids.push(
          ...Object.values(event.form8949_code_y_rows ?? {}).filter(
            (id): id is string => id !== undefined,
          ),
        );
      } else if (event.kind === QofEventKind.Exception) {
        if (!event.exception_regulation_citation ||
          event.deferred_gain_removed.short_term !== 0 ||
          event.deferred_gain_removed.long_term !== 0 ||
          event.included_gain.short_term !== 0 ||
          event.included_gain.long_term !== 0 ||
          adjustment.short_term !== 0 || adjustment.long_term !== 0 ||
          event.form8949_code_y_rows || event.transferee || event.disposition ||
          event.inclusion_type || event.ten_year_fmv_election) {
          fail("Excepted event needs regulation citation and no gain change");
        }
      } else {
        if (event.special_gain_code !== QofSpecialGainCode.NoninclusionTransfer ||
          !event.transferee ||
          event.transferee?.transfer_date !== event.event_date ||
          event.deferred_gain_removed.short_term +
              event.deferred_gain_removed.long_term === 0 ||
          event.included_gain.short_term !== 0 ||
          event.included_gain.long_term !== 0 ||
          adjustment.short_term !== 0 || adjustment.long_term !== 0 ||
          event.form8949_code_y_rows || event.inclusion_type ||
          event.disposition ||
          event.ten_year_fmv_election) {
          fail("Noninclusion transfer-out needs code F and transferee facts");
        }
      }
    }
    for (const term of ["short_term", "long_term"] as const) {
      const expected = lot.opening_deferred_gain[term] +
        (fresh?.deferred_gain[term] ?? 0) - removed[term];
      if (expected < 0 || lot.closing_deferred_gain[term] !== expected) {
        fail("Form 8997 lot opening, additions, events, and closing must reconcile");
      }
    }
  }
  if (new Set(eventIds).size !== eventIds.length) {
    fail("Form 8997 event IDs must be unique");
  }
  if (new Set(form8949Ids).size !== form8949Ids.length) {
    fail("QOF Form 8949 row references must be unique");
  }
  const missing1099b = lots.some((lot) => lot.events.some((event) =>
    event.disposition?.received_form1099b === false
  ));
  if (input.no_form1099b_for_disposition !== missing1099b) {
    fail("Part III no-1099-B answer must match disposition evidence");
  }
  if (input.foreign_eligible_taxpayer &&
    lots.some((lot) => lot.new_deferral?.kind === "new_election") &&
    !input.treaty_benefits_waived) {
    fail("Foreign eligible taxpayer's QOF deferral requires treaty waiver");
  }
  if (!input.foreign_eligible_taxpayer && input.treaty_benefits_waived) {
    fail("Nonforeign taxpayer cannot report a foreign treaty waiver");
  }
  if (input.uninvested_deferred_gain_at_year_end.short_term > 0 ||
    input.uninvested_deferred_gain_at_year_end.long_term > 0) {
    fail("Part IV uninvested deferred gain needs a reviewed IRS row identity and treatment");
  }
});

export type Form8997Input = z.infer<typeof inputSchema>;
export type Form8997Lot = Form8997Input["investment_lots"][number];

type Amounts = z.infer<typeof gainAmountsSchema>;
export interface Form8997Row {
  readonly lot_id: string;
  readonly qof_ein: string;
  readonly date: string;
  readonly description: string;
  readonly special_gain_code?: QofSpecialGainCode;
  readonly short_term: number;
  readonly long_term: number;
}
export interface Form8997Part {
  readonly rows: readonly Form8997Row[];
  readonly totals: Amounts;
}
export interface Form8997Statement {
  readonly part_i: Form8997Part;
  readonly part_ii: Form8997Part;
  readonly part_iii: Form8997Part;
  readonly part_iv: Form8997Part;
  readonly foreign_eligible_taxpayer: boolean;
  readonly treaty_benefits_waived: boolean;
  readonly no_form1099b_for_disposition: boolean;
}

function totals(rows: readonly Form8997Row[]): Amounts {
  return rows.reduce(
    (sum, row) => ({
      short_term: sum.short_term + row.short_term,
      long_term: sum.long_term + row.long_term,
    }),
    { short_term: 0, long_term: 0 },
  );
}

function part(rows: Form8997Row[]): Form8997Part {
  return { rows, totals: totals(rows) };
}

export function calculateForm8997Statement(
  raw: Form8997Input,
): Form8997Statement {
  const input = inputSchema.parse(raw);
  const partI = input.investment_lots.filter((lot) =>
    lot.opening_deferred_gain.short_term +
      lot.opening_deferred_gain.long_term > 0
  ).map((lot) => ({
    lot_id: lot.lot_id,
    qof_ein: lot.qof_ein,
    date: lot.acquired_date,
    description: lot.description,
    special_gain_code: lot.origin_special_gain_code,
    short_term: lot.opening_deferred_gain.short_term,
    long_term: lot.opening_deferred_gain.long_term,
  }));
  const partII = input.investment_lots.filter((lot) =>
    lot.new_deferral !== undefined
  ).map((lot) => ({
    lot_id: lot.lot_id,
    qof_ein: lot.qof_ein,
    date: lot.acquired_date,
    description: lot.new_deferral?.kind === "noninclusion_transfer_in"
      ? `${lot.description}; transferor ${lot.new_deferral.transferor.name}, ${lot.new_deferral.transferor.tin}, ${lot.new_deferral.transferor.transfer_date}`
      : lot.description,
    special_gain_code: lot.new_deferral?.special_gain_code,
    short_term: lot.new_deferral?.deferred_gain.short_term ?? 0,
    long_term: lot.new_deferral?.deferred_gain.long_term ?? 0,
  }));
  const partIII = input.investment_lots.flatMap((lot) =>
    lot.events.flatMap((event): Form8997Row[] => {
      const base: Form8997Row = {
        lot_id: lot.lot_id,
        qof_ein: lot.qof_ein,
        date: event.event_date,
        description: event.kind === QofEventKind.Exception
          ? `Exception: ${event.exception_regulation_citation}; ${event.description}`
          : event.kind === QofEventKind.NoninclusionTransferOut
          ? `${event.description}; transferee ${event.transferee?.name}, ${event.transferee?.tin}, ${event.transferee?.transfer_date}`
          : event.description,
        special_gain_code: event.special_gain_code,
        short_term: event.included_gain.short_term,
        long_term: event.included_gain.long_term,
      };
      if (!event.basis_adjustment_code) return [base];
      return [base, {
        ...base,
        description: event.basis_adjustment_code ===
            QofSpecialGainCode.FiveYearBasis
          ? "Adjustment to basis 5-year"
          : "Adjustment to basis 7-year",
        special_gain_code: event.basis_adjustment_code,
        short_term: event.basis_adjustment?.short_term ?? 0,
        long_term: event.basis_adjustment?.long_term ?? 0,
      }];
    })
  );
  const partIV = input.investment_lots.filter((lot) =>
    lot.closing_deferred_gain.short_term +
      lot.closing_deferred_gain.long_term > 0
  ).map((lot) => ({
    lot_id: lot.lot_id,
    qof_ein: lot.qof_ein,
    date: lot.acquired_date,
    description: lot.formerly_qof_ein
      ? `${lot.description}; Formerly ${lot.formerly_qof_ein}`
      : lot.description,
    special_gain_code: lot.origin_special_gain_code,
    short_term: lot.closing_deferred_gain.short_term,
    long_term: lot.closing_deferred_gain.long_term,
  }));
  return {
    part_i: part(partI),
    part_ii: part(partII),
    part_iii: part(partIII),
    part_iv: part(partIV),
    foreign_eligible_taxpayer: input.foreign_eligible_taxpayer,
    treaty_benefits_waived: input.treaty_benefits_waived,
    no_form1099b_for_disposition: input.no_form1099b_for_disposition,
  };
}
