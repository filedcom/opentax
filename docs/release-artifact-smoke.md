# Release artifact smoke check

The release workflow compiles five native assets and runs each asset on a
matching GitHub-hosted architecture before uploading it. The Linux ARM job uses
`ubuntu-24.04-arm`, macOS Intel uses `macos-15-intel`, macOS ARM uses `macos-15`,
and the remaining Linux x64 and Windows x64 jobs use their matching default
runners. A failed smoke step prevents that artifact from being uploaded and
prevents the dependent release job from publishing the set. A manual dispatch
with `dry_run: true` builds and smokes but does not create a release, even when
dispatched from a tag.
The release job writes `SHA256SUMS` from the five downloaded assets and
publishes it beside them. Reviewers can compare each downloaded file with its
recorded digest; the manifest alone does not establish a signature or publisher
identity.

`scripts/smoke-release-binary.ts` invokes the **compiled asset**, not the Deno
source CLI, from an isolated temporary working directory. It checks the injected
version, creates a synthetic TY2025 Single return, adds full filer and W-2
source facts, checks computed wages and withholding, requires CLI validation to
find no applicable rule failures, and exports finalized MeF XML with exactly one
`IRS1040` and one `IRSW2` document. It checks filer identity, filing status,
employer identity, wages, and withholding against the synthetic source in those
documents, then loads the exported PDF to require at least two pages. It never
passes `--force` or `--draft`. The temporary return,
XML output, PDF and downloaded IRS template cache are deleted after the run.

For a manually built native asset on a matching machine, run:

```sh
deno run --allow-read --allow-write --allow-run --allow-net=www.irs.gov scripts/smoke-release-binary.ts ./opentax-linux-x64 1.2.3
```

Use the actual asset path and injected version. Cross-compiled assets must be
run on the corresponding architecture. This check proves only that one simple
source-backed return works through the packaged binary on that platform. It is
not the full test suite, TY2025 XSD validation, PDF visual inspection, tax-rule
coverage, malware/signature verification, or IRS ATS acceptance. Those remain
separate release gates. No smoke result is claimed until the workflow runs.

## Proposed next CLI release: v2.0.6

Read-only inventory on 2026-10-02: `v2.0.5` is the latest published GitHub
release and tag. It has the five native binaries but no `SHA256SUMS` asset;
that tag predates the current checksum step. PR
[#59](https://github.com/filedcom/opentax/pull/59) is open as a draft against
`main`. `cli/version.ts` stays `dev` in source; the release workflow injects the
tag version before compiling. `deno.json` still has package version `0.0.1`,
which is separate from the CLI binary release and is not changed by that
workflow.

After PR #59 implementation is complete, run the agreed full tests, local
TY2025 XSD checks, and filled-PDF review, resolve PR review/checks, and merge
it. Then build all five targets from the merged commit without publishing:

```sh
gh workflow run Release --ref main -f dry_run=true
gh run list --workflow Release --limit 3
```

Check the selected dry-run run's five build/smoke jobs and downloadable Actions
artifacts. Its injected version is `0.0.0-dev` because the ref is `main`.
After that gate passes, tag the verified merged commit and let the tag-push
workflow publish; do not tag the moving PR branch:

```sh
git switch main
git pull --ff-only origin main
git tag v2.0.6
git push origin v2.0.6
gh run list --workflow Release --limit 3
gh release view v2.0.6 --json tagName,assets,publishedAt
```

Expected release assets are `opentax-linux-x64`, `opentax-linux-arm64`,
`opentax-macos-x64`, `opentax-macos-arm64`,
`opentax-windows-x64.exe`, and `SHA256SUMS`. The release job depends on all five
native build/smoke jobs. Verify each published digest against `SHA256SUMS`, then
download the matching host binary and rerun the compiled-asset smoke with
expected version `2.0.6`:

```sh
deno run --allow-read --allow-write --allow-run --allow-net=www.irs.gov \
  scripts/smoke-release-binary.ts ./opentax-macos-arm64 2.0.6
```

Use the binary name for the actual host architecture. The smoke exercises a
synthetic Form 1040/W-2 calculation, validation, finalized MeF XML, and a
loadable filled PDF. It does not establish TY2025 IRS ATS acceptance. The ATS
certificate, enrollment, endpoint/WSDL/trust package, and authorized test
transmission remain separate prerequisites in [the ATS plan](ats/ty2025.md).
