/** The current Schedule SE calculation represents one proprietor per return. */
export function scheduleSeSpouseProprietor(
  pending: Record<string, unknown> | undefined,
  fields: { net_profit_schedule_c?: unknown; net_profit_schedule_f?: unknown },
): boolean {
  const businesses = (pending?.schedule_c as {
    schedule_cs?: Array<{ proprietor_recipient?: string }>;
  } | undefined)?.schedule_cs ?? [];
  const farms = (pending?.schedule_f as {
    schedule_fs?: Array<{ proprietor_recipient?: string }>;
  } | undefined)?.schedule_fs ?? [];
  const spouseBusiness = businesses.length === 1 &&
    businesses[0].proprietor_recipient === "S";
  const spouseFarm = farms.length === 1 &&
    farms[0].proprietor_recipient === "S";
  const hasBusinessProfit = typeof fields.net_profit_schedule_c === "number" &&
    fields.net_profit_schedule_c !== 0;
  const hasFarmProfit = typeof fields.net_profit_schedule_f === "number" &&
    fields.net_profit_schedule_f !== 0;
  if (
    (spouseBusiness && hasFarmProfit) ||
    (spouseFarm && hasBusinessProfit)
  ) {
    throw new Error(
      "Schedule SE mixed business and farm proprietor needs separate owner calculations",
    );
  }
  return spouseBusiness || spouseFarm;
}
