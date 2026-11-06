<!--
  PR template for TripVote. Follows AGENTS.md section 3 (Scrum and workflow).
  Title: Conventional Commit style with the issue number, e.g. "feat: add vote toggle to activity card (#12)".
  One issue per PR. Branch: feature/<issue#>-..., fix/<issue#>-..., chore/<issue#>-..., docs/<issue#>-...
-->

Closes #

## What changed

-

## How it was tested

<!-- Name the tests you added (red → green → refactor) and how to run them. -->

- [ ] Unit / component tests (`npm test`)
- [ ] API integration tests (Supertest, incl. 401/403 cases for each role)
- [ ] E2E spec in `e2e/` for any user-facing flow that was added or changed
- [ ] Checked manually at 375px wide and with keyboard only (UI changes)

## Acceptance criteria

<!-- Copy the checklist from the issue and tick what this PR meets. -->

- [ ]

## Checklist

- [ ] Commits follow `type: description (#issue)` and the history shows test → feat → refactor
- [ ] `npm run lint` passes and CI (tests + lint + `npm audit`) is green
- [ ] No new dependency, or the reason is given above and the AGENTS.md version table is updated
- [ ] No secrets committed; `.env.example` updated if a new env var was added
- [ ] UI matches the mockup (colors, font, spacing) or the mismatch is explained above
- [ ] Preview deploy link works (once hosting is set up)

## Screenshots

<!-- For UI changes: before / after, desktop and 375px. -->

## Reviewer

- [ ] Reviewed by partner (at least one approval before squash-merge)
