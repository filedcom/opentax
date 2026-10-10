# Ongoing pull request workflow

Keep related MeF-readiness work on one ongoing draft pull request targeting
`main`. Push subsequent commits to that PR's branch rather than creating a PR
for each task. Keep its title and description current with the complete diff.

After an authorized merge, fetch the latest `origin/main` and create one new
ongoing branch and draft PR for subsequent work. Preserve local audit records,
evidence, and uncommitted changes while updating the checkout.

The previous batch is merged in [PR #73](https://github.com/filedcom/opentax/pull/73).
Continue in [PR #74](https://github.com/filedcom/opentax/pull/74) on
`codex/mef-readiness-ongoing-3`, based on `origin/main`
commit `d65263134` after that merge. Use one ongoing draft PR for this branch
and keep pushing subsequent work to it until the next authorized merge.
Leave unrelated draft PRs outside this workflow.
