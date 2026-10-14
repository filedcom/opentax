import { z } from "zod";

const buyerIdentity = z.object({
  name: z.string().regex(/^([A-Za-z0-9'\-] ?)*[A-Za-z0-9'\-]$/).max(35),
  ssn: z.string().regex(/^[0-9]{9}$/),
  address_line1: z.string().regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/).max(35),
  address_line2: z.string().regex(/^[A-Za-z0-9]( ?[A-Za-z0-9\-/])*$/).max(35)
    .optional(),
});

export const sellerFinancedBuyerSchema = z.discriminatedUnion("address_type", [
  buyerIdentity.extend({
    address_type: z.literal("us"),
    city: z.string().regex(/^([A-Za-z] ?)*[A-Za-z]$/).max(22),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^[0-9]{5}([0-9]{4}|[0-9]{7})?$/),
  }).strict(),
  buyerIdentity.extend({
    address_type: z.literal("foreign"),
    city: z.string().regex(/^([A-Za-z] ?)*[A-Za-z]$/).max(50),
    province_or_state: z.string().min(1).max(17).optional(),
    country_code: z.string().regex(/^[A-Z]{2}$/),
    foreign_postal_code: z.string().min(1).max(16).optional(),
  }).strict(),
]);

export type SellerFinancedBuyer = z.infer<typeof sellerFinancedBuyerSchema>;
