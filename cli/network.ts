/**
 * The binary's network policy. Bun has no permission sandbox, so the CLI
 * replaces global fetch with one that reaches only these HTTPS hosts:
 * IRS form templates, the IRS MeF A2A services (`opentax mef`; ATS at
 * la.alt, production at la, per Pub 4164 §4.1.6), and GitHub for
 * `opentax update` and its daily check.
 * `scripts/testing/sandbox.ts` proves fetch is the only network path the
 * shipped module graph has.
 */
export const ALLOWED_HOSTS: readonly string[] = [
  "www.irs.gov",
  "la.alt.www4.irs.gov",
  "la.www4.irs.gov",
  "api.github.com",
  "github.com",
];

export class NetworkPolicyError extends Error {}

function requestUrl(input: string | URL | Request): URL {
  return new URL(input instanceof Request ? input.url : input);
}

/** A fetch that refuses any request outside the allowed HTTPS hosts. */
export function restrictedFetch(
  allowed: readonly string[],
  fetcher: typeof fetch,
): typeof fetch {
  const guarded = (input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    if (url.protocol !== "https:" || !allowed.includes(url.hostname)) {
      return Promise.reject(
        new NetworkPolicyError(
          `Network access to ${url.protocol}//${url.host} is not allowed`,
        ),
      );
    }
    return fetcher(input, init);
  };
  return Object.assign(guarded, fetcher);
}

export function installNetworkPolicy(): void {
  globalThis.fetch = restrictedFetch(ALLOWED_HOSTS, globalThis.fetch);
}
