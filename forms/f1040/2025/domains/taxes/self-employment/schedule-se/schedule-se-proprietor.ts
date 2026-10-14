/** The current Schedule SE calculation represents one proprietor per return. */
export function scheduleSeSpouseProprietor(
  pending: Record<string, unknown> | undefined,
  fields: {
    net_profit_schedule_c?: unknown;
    net_profit_schedule_f?: unknown;
    farm_optional_method_elected?: unknown;
  },
): boolean {
  const businesses = (pending?.schedule_c as {
    schedule_cs?: Array<{ proprietor_recipient?: string }>;
  } | undefined)?.schedule_cs ?? [];
  const farms = (pending?.schedule_f as {
    schedule_fs?: Array<{ proprietor_recipient?: string }>;
  } | undefined)?.schedule_fs ?? [];
  const hasBusinessProfit = typeof fields.net_profit_schedule_c === "number" &&
    fields.net_profit_schedule_c !== 0;
  const hasFarmProfit = typeof fields.net_profit_schedule_f === "number" &&
    fields.net_profit_schedule_f !== 0;
  const activeBusinesses = hasBusinessProfit ? businesses : [];
  const activeFarms =
    hasFarmProfit || fields.farm_optional_method_elected === true ? farms : [];
  const owners = [...activeBusinesses, ...activeFarms].map((item) =>
    item.proprietor_recipient
  );
  const jointReturn = pending?.general !== undefined &&
      (pending.general as { filing_status?: string }).filing_status === "mfj" ||
    pending?.f1040 !== undefined &&
      (pending.f1040 as { filing_status?: string }).filing_status === "mfj";
  if (jointReturn && owners.some((owner) => owner === undefined)) {
    throw new Error(
      "Schedule SE joint business and farm sources need named proprietors",
    );
  }
  if (owners.includes("S") && owners.some((owner) => owner !== "S")) {
    throw new Error(
      "Schedule SE mixed proprietors need separate owner calculations",
    );
  }
  if (
    owners.includes("S") &&
    ((hasBusinessProfit && activeBusinesses.length === 0) ||
      (hasFarmProfit && activeFarms.length === 0))
  ) {
    throw new Error("Schedule SE cannot identify every active proprietor");
  }
  return owners.includes("S");
}
