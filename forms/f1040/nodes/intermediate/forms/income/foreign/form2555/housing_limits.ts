/** One location of a housing-limit notice: [country code, notice country, location, full year, daily]. */
export type HousingLimitRow = readonly [
  countryCode: string,
  noticeCountry: string,
  location: string,
  fullYear: number,
  daily: number,
];

/** A row that covers a country's other cities: every city except those listed. */
export interface BroadHousingLimitRow {
  readonly countryCode: string;
  readonly location: string;
  readonly exceptCities: readonly string[];
}

/** The year's IRC 911(c)(2)(B) housing-limit notice, as Form 2555 line 29b reads it. */
export interface HousingLimitTable {
  readonly notice: string;
  /** The generally applicable limit (30% of the exclusion) for an unlisted location. */
  readonly standardFullYear: number;
  readonly standardDaily: number;
  readonly rows: readonly HousingLimitRow[];
  readonly broadRows: readonly BroadHousingLimitRow[];
  /** Locations naming an area rather than one city, matched by review. */
  readonly areaLocations: readonly string[];
}

export type HousingLimitSelection =
  | {
    kind: "notice_table";
    location: string;
    location_match_verified: true;
    review_document_reference: string;
  }
  | {
    kind: "standard_unlisted";
    verified_not_listed: true;
    notice_review_document_reference: string;
  };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toLowerCase().replace(/\s+/g, " ");
}

function broadRow(
  table: HousingLimitTable,
  countryCode: string,
  location: string,
): BroadHousingLimitRow | undefined {
  return table.broadRows.find((row) =>
    row.countryCode === countryCode && row.location === location
  );
}

function broadRowMatches(
  table: HousingLimitTable,
  countryCode: string,
  location: string,
  city: string,
): boolean {
  const row = broadRow(table, countryCode, location);
  if (!row) return false;
  const normalizedCity = normalize(city);
  return !row.exceptCities.some((except) => normalize(except) === normalizedCity);
}

/** Explicit reviewed selection; an unknown city never falls into a standard cap implicitly. */
export function resolveHousingLimit(
  table: HousingLimitTable,
  countryCode: string,
  city: string,
  selection: HousingLimitSelection,
  qualifyingDays: number,
): { line29a?: string; line29b: number } {
  if (
    !/^[A-Z]{2}$/.test(countryCode) || !city.trim() ||
    !Number.isInteger(qualifyingDays) || qualifyingDays < 1 ||
    qualifyingDays > 365
  ) {
    throw new Error(
      "Form 2555 housing needs a valid country, city, and qualifying day count",
    );
  }
  if (selection.kind === "notice_table") {
    if (!selection.review_document_reference.trim()) {
      throw new Error(
        "Form 2555 adjusted location needs a review document reference",
      );
    }
    const row = table.rows.find(([country, , location]) =>
      country === countryCode && location === selection.location
    );
    if (!row) {
      throw new Error(
        `Form 2555 adjusted housing location is not in ${table.notice} for this country`,
      );
    }
    const [country, noticeCountry, location, fullYear, daily] = row;
    if (broadRow(table, country, location)) {
      if (!broadRowMatches(table, country, location, city)) {
        throw new Error(
          "Form 2555 adjusted housing location does not cover the residence city",
        );
      }
    } else if (
      !table.areaLocations.includes(location) &&
      normalize(city) !== normalize(location)
    ) {
      throw new Error(
        "Form 2555 adjusted housing location does not match the residence city",
      );
    }
    return {
      line29a: `${city.trim()}, ${noticeCountry}`,
      line29b: qualifyingDays === 365
        ? fullYear
        : Math.round(daily * qualifyingDays),
    };
  }
  if (!selection.notice_review_document_reference.trim()) {
    throw new Error(
      `Form 2555 standard housing limit needs ${table.notice} review evidence`,
    );
  }
  const listed = table.rows.some(([country, , location]) =>
    country === countryCode &&
    (normalize(location) === normalize(city) ||
      broadRowMatches(table, country, location, city))
  );
  if (listed) {
    throw new Error(
      "Form 2555 listed housing location cannot use the standard limit",
    );
  }
  return {
    line29b: qualifyingDays === 365
      ? table.standardFullYear
      : Math.round(table.standardDaily * qualifyingDays),
  };
}
