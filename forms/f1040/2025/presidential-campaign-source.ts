/** Keep the final Form 1040 election marks equal to the reviewed general input. */
export function assertPresidentialCampaignSource(
  fields: Record<string, unknown>,
  pending?: Readonly<Record<string, unknown>>,
): void {
  const general = pending?.general;
  const source = general !== null && typeof general === "object" &&
      !Array.isArray(general)
    ? general as Record<string, unknown>
    : {};
  for (
    const [key, label] of [
      ["presidential_campaign_fund_taxpayer", "taxpayer"],
      ["presidential_campaign_fund_spouse", "spouse"],
    ] as const
  ) {
    const filed = fields[key];
    const reviewed = source[key];
    if (
      (filed !== undefined && typeof filed !== "boolean") ||
      (reviewed !== undefined && typeof reviewed !== "boolean")
    ) {
      throw new Error(
        `Form 1040 presidential campaign ${label} answer must be boolean`,
      );
    }
    if (
      (reviewed !== undefined && filed !== reviewed) ||
      (filed === true && reviewed !== true)
    ) {
      throw new Error(
        `Form 1040 presidential campaign ${label} mark differs from retained general input`,
      );
    }
  }
  if (fields.presidential_campaign_fund_spouse === true) {
    if (
      fields.filing_status !== "mfj" || source.filing_status !== "mfj"
    ) {
      throw new Error(
        "Form 1040 presidential campaign spouse mark requires a joint return",
      );
    }
  }
}
