/** Validate the ordinary statutory 60-day window without a tax-year-dependent
 * deadline approximation. Relief must be represented by a separate source route. */
export function hsaRolloverElapsedDays(
  distributedOn: string,
  depositedOn: string,
) {
  const parseDate = (value: string): number => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 10) !== value
    ) {
      throw Error("Form 8889 HSA rollover needs valid calendar dates");
    }
    return timestamp;
  };
  const days = (parseDate(depositedOn) - parseDate(distributedOn)) / 86_400_000;
  if (days < 0 || days > 60) {
    throw Error(
      "Form 8889 HSA rollover must redeposit a tax-year distribution within 60 days",
    );
  }
  return days;
}
