/**
 * The binary's network policy. Bun has no permission sandbox, so the CLI
 * replaces global fetch with one that reaches only these HTTPS hosts:
 * IRS form templates, and GitHub for `opentax update` and its daily check.
 * `scripts/testing/sandbox.ts` proves fetch is the only network path the
 * shipped module graph has.
 */
export const ALLOWED_HOSTS: readonly string[] = [
  "www.irs.gov",
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
