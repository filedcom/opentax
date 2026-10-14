import { z } from "zod";

const reference = z.string().trim().min(1);
const cents = z.number().finite().nonnegative().refine((amount) =>
  Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});

/** Reviewed fields from the CDE-issued Form 8874-A. */
export const form8874AIssuanceSchema = z.object({
  notice_document_reference: reference,
  cde_name: reference,
  cde_ein: z.string().regex(/^\d{9}$/),
  investor_name: reference,
  investor_tin: z.string().regex(/^\d{9}$/),
  initial_investment_date: isoDate,
  qualified_equity_investment_amount: cents.refine((amount) => amount > 0),
  total_allowable_credit: cents,
  annual_credit_amounts: z.tuple([
    cents,
    cents,
    cents,
    cents,
    cents,
    cents,
    cents,
  ]),
  cde_official_signed_notice_confirmed: z.literal(true),
  cde_signature_date: isoDate,
  notice_provided_to_investor_date: isoDate,
}).strict().superRefine((notice, ctx) => {
  const signed = Date.parse(`${notice.cde_signature_date}T00:00:00Z`);
  const provided = Date.parse(
    `${notice.notice_provided_to_investor_date}T00:00:00Z`,
  );
  const invested = Date.parse(`${notice.initial_investment_date}T00:00:00Z`);
  if (
    signed < invested || provided < signed ||
    provided - invested > 60 * 86_400_000
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["notice_provided_to_investor_date"],
      message: "CDE Form 8874-A must be provided within 60 days of investment",
    });
  }
  const expectedCents = [5, 5, 5, 6, 6, 6, 6].map((rate) =>
    Math.round(notice.qualified_equity_investment_amount * rate)
  );
  if (
    notice.annual_credit_amounts.some((amount, index) =>
      Math.round(amount * 100) !== expectedCents[index]
    ) ||
    Math.round(notice.total_allowable_credit * 100) !==
      expectedCents.reduce((sum, amount) => sum + amount, 0)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["annual_credit_amounts"],
      message: "Form 8874-A annual credits must reconcile to 5%/6% of the QEI",
    });
  }
});
