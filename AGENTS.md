# AGENTS.md — TripVote

<!--
  This file is the shared rules file for every AI coding agent (Antigravity, Claude, Cursor, Copilot, ...)
  working in this repository. Both partners maintain it.
  Read it fully before writing code. When a rule here conflicts with a chat prompt, ask before breaking the rule.
  Items marked TBD are not decided yet: do not invent a choice for them, ask instead.
-->

## 1. Project context

TripVote is a web app that lets a group of friends plan a trip in one place: agree on dates, propose and vote on
activities, keep a shared itinerary with live updates, and track spending against a budget.

- **PRD:** [PRD.pdf](./PRD.pdf) or [https://docs.google.com/document/d/1iHZIIQXjuXRsxHST-Pnsn6QM3NhG51EssCBFlDintzE/edit]
- **Mockup (clickable prototype):** https://claude.ai/artifact/VpeXpJRxvQ86tuiQuUA84L
- **Backlog:** GitHub Issues + Project board "TripVote Scrum Board" (milestones Sprint 1, Sprint 2)

The PRD and the issue's acceptance criteria are the source of truth for behavior. The mockup is the source of truth
for layout, copy and visual style. If they disagree, follow the issue and mention the mismatch in the PR.

### 1.1 Roles (used everywhere: API, UI, tests)

| Role | Can do |
| --- | --- |
| **Organizer** | Everything a Member can, plus edit/delete the trip, set the budget, approve/deny join requests, remove members, edit/delete any activity |
| **Member** | View and add to itinerary, vote, mark availability, log expenses, edit/delete own activities, leave the trip |
| **Viewer** | Opened a valid share link: sees only trip name, organizer, dates and member list; can accept an invite or request to join |

Authorization is always checked on the **server**. Hiding a button in the UI is not access control.

### 1.2 Tech stack

Versions below were checked against the npm registry on 2026-10-30. Install **exactly** these versions
(for example `npm install vite@8.3.5`). Do not pick versions from memory: AI training data is often a
major version behind. For a package not listed here, run `npm view <package> version` first and use the
latest stable release, then add it to this table in the same PR.

| Layer | Choice | Version |
| --- | --- | --- |
| Runtime | Node.js LTS (`"engines": { "node": ">=24" }`) | 24.x LTS |
| Frontend | React + Vite, React Router | react 19.3.1, react-dom 19.3.1, vite 8.3.5, @vitejs/plugin-react 6.1.2, react-router 8.5.1 |
| Styling | Tailwind CSS (Vite plugin) | tailwindcss 4.3.3, @tailwindcss/vite 4.3.3 |
| Backend | Express REST API | express 5.3.0, cookie-parser 1.4.7, helmet 8.3.0, cors 2.8.6, express-rate-limit 8.7.2 |
| Database | MongoDB Atlas via Mongoose | mongoose 9.11.4 |
| Validation | zod (shared schemas for request bodies) | zod 4.6.7 |
| Auth | JWT in an httpOnly, Secure, SameSite cookie; bcrypt for passwords | jsonwebtoken 9.0.3, bcrypt 6.0.0 |
| Live updates | TBD: Socket.IO (preferred) or Pusher | socket.io 4.8.4 if chosen |
| Unit tests | Vitest + React Testing Library | vitest 5.0.5, @testing-library/react 16.3.3, @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.8, jsdom 30.1.3 |
| Lint / format | ESLint (flat config) + Prettier | eslint 10.13.0, @eslint/js 10.0.1, globals 17.13.0, eslint-plugin-react-hooks 7.1.1, eslint-plugin-react-refresh 0.5.7, prettier 3.9.10 |
| API tests | Supertest + mongodb-memory-server | supertest 7.3.1, mongodb-memory-server 11.3.0 |
| E2E tests | Playwright | @playwright/test 1.64.1 |
| CI | GitHub Actions | — |
| Hosting | TBD: Render and/or Netlify, with a preview deploy for every PR | — |
| API docs | OpenAPI 3 (swagger-jsdoc + swagger-ui-express at `/api/docs`) | — |

Use exact versions in `package.json` (no `^` or `~`; set `save-exact=true` in `.npmrc`) and commit
`package-lock.json`. Upgrading a package is its own `chore:` PR that also updates this table.

Do not add another framework, ORM, CSS library, state library or test runner without asking first.

### 1.3 Folder structure

```
/
├── AGENTS.md
├── client/                     # React + Vite frontend
│   └── src/
│       ├── api/                # fetch wrappers, one file per resource (trips.js, itinerary.js ...)
│       ├── components/         # shared, presentational UI (Button, Card, Badge, Avatar, Modal ...)
│       ├── features/           # one folder per domain: auth, trips, members, itinerary, availability, budget
│       │   └── itinerary/      #   components, hooks and tests for that feature live together
│       ├── hooks/              # shared hooks (useAuth, useTripSocket ...)
│       ├── pages/              # route-level screens, matching the mockup screens
│       ├── lib/                # pure helpers (dates, money, permissions) — no React here
│       └── test/               # test setup and shared test utilities
├── server/                     # Express backend
│   ├── src/
│   │   ├── app.js              # builds the Express app (no listen) — imported by tests
│   │   ├── server.js           # starts HTTP + live-update server
│   │   ├── config/             # env loading and validation
│   │   ├── models/             # Mongoose models
│   │   ├── routes/             # routers only: path + middleware + controller
│   │   ├── controllers/        # parse request, call service, send response
│   │   ├── services/           # business rules (vote counting, overlap, balances)
│   │   ├── middleware/         # requireAuth, requireTripRole, errorHandler, validate
│   │   ├── validators/         # zod schemas
│   │   └── realtime/           # live-update events
│   └── tests/
│       ├── unit/               # services and helpers
│       └── integration/        # Supertest against app.js + in-memory MongoDB
├── e2e/                        # Playwright specs, one per user flow
├── docs/                       # openapi.yaml, architecture and schema diagrams
└── .github/                    # workflows, issue templates, pull_request_template.md
```

Keep layers separate: routes never touch the database, controllers never contain business rules, models never
import Express.

### 1.4 Data model

`User`, `Trip` (has a unique random `shareCode`), `TripMembership` (`user`, `trip`, `role`: organizer|member,
`status`: pending|active), `ItineraryItem`, `Vote` (unique per user + item), `Availability` (user + trip + dates),
`Budget` (total + per-category amounts), `Expense` (amount, category, payer, splitAmong).

Money is stored as **integer cents**, never floats. Dates are stored in UTC; trip dates are date-only strings
(`YYYY-MM-DD`).

### 1.5 Naming conventions and coding standards

- JavaScript (ES modules) everywhere. Prettier for formatting, ESLint for linting; code must pass `npm run lint`.
- **Files:** React components `PascalCase.jsx` (`TripCard.jsx`); everything else `camelCase.js` (`tripService.js`);
  tests next to the code or in `tests/`, named `*.test.js(x)`; Playwright specs `*.spec.js`.
- **Names:** components `PascalCase`, functions/variables `camelCase`, constants `UPPER_SNAKE_CASE`,
  Mongoose models singular `PascalCase` (`Trip`), collections plural.
- **Booleans** start with `is/has/can` (`isOrganizer`, `canEdit`).
- **API routes:** REST, plural nouns, nested under the trip:
  `POST /api/trips`, `GET /api/trips/:tripId/itinerary`, `POST /api/trips/:tripId/itinerary/:itemId/votes`.
- **API responses:** success returns the resource as JSON; errors return
  `{ "error": { "code": "VALIDATION_ERROR", "message": "End date can't be before the start date." } }`
  with the right status (400 validation, 401 not logged in, 403 wrong role, 404 not found, 409 conflict).
- Use `async/await`, never raw promise chains. No `console.log` left in committed code: use
  `logger.info/warn/error` from `server/src/config/logger.js` (it is silent when `NODE_ENV=test`).
- Functions do one thing; files over ~200 lines should be split.

### 1.6 Testing strategy (TDD is required)

We follow **red → green → refactor** and the git history must show it:

1. **Red:** write tests from the issue's acceptance criteria, run them, see them fail, commit
   (`test: ... (#issue)`).
2. **Green:** write the minimum code to pass, commit (`feat: ... (#issue)`).
3. **Refactor:** clean up with tests still green, commit (`refactor: ...`).

- Every acceptance criterion in the issue maps to at least one test. Name tests after the behavior:
  `it('rejects an end date before the start date')`.
- **Unit (Vitest):** pure logic in `services/` and `client/src/lib/` (dates, overlap, balances, money).
- **Component (React Testing Library):** query by role and label like a user would; no snapshot-only tests.
- **Integration (Supertest):** every endpoint, including the 401/403 cases for each role.
- **E2E (Playwright):** one spec per key user flow in section 2.3. An issue that adds or changes a
  user-facing flow is not done until its spec in `e2e/` exists and passes.
- Coverage goal: **80% lines** for `server/src/services` and `client/src/lib`; every endpoint has an integration test.
- Tests never call real external services or the real Atlas database.

## 2. PRD and design references

### 2.1 Visual style (from the mockup)

- Font: **Plus Jakarta Sans** (fallback system-ui).
- Colors (define once as Tailwind theme tokens, never hard-code elsewhere):
  ink `#14213D`, muted `#5A6478`, primary `#2457D6`, warning `#E07A1F` (text `#A84D0C`), success `#1E7A4C`,
  danger `#B42318`, page `#F6F7F9`, card `#FFFFFF` with `#E3E6EC` border and 16px radius.
- Primary actions are solid blue buttons; secondary actions are white with a gray border; destructive actions use
  danger red text.
- Layout: top app bar, then trip header + tabs (Overview, Itinerary, Availability, Budget) on trip pages; content max
  width ~1120px; everything works at 375px wide.

### 2.2 Screens and key components

| Screen (route) | Issue area | What it must do |
| --- | --- | --- |
| Log in / Sign up (`/login`, `/signup`) | US1 | Tabbed form; name, email, password; clear inline errors (duplicate email) |
| Dashboard (`/trips`) | US2 | Grid of `TripCard`s with role badge, dates, member/activity counts; "New trip" form with date validation; invitation banner |
| Invite link (`/join/:shareCode`) | US3 | Viewer view: trip name, organizer, dates, members, Members-only notice; Accept / Request to join; invalid-link error |
| Trip overview (`/trips/:id`) | US3 | `TripHeader` + `TripTabs`; members list with Remove (Organizer); join requests with Approve/Deny; share link with Copy; settings (edit/delete or leave) |
| Itinerary (`/trips/:id/itinerary`) | US4 | `ActivityCard`s grouped by day in time order; `VoteButton` toggle with count and voter names; add/edit/delete activity; live banner; connection-lost state |
| Availability (`/trips/:id/availability`) | US5 | Day grid for the trip range; tap to toggle own availability; darker = more members free; BEST tag; list of who has not responded |
| Budget (`/trips/:id/budget`) | US6 | Summary (planned/spent/remaining); per-category planned vs. actual bar with "Over budget by $X"; balances; expenses table; Log expense form |

Component expectations:

- `TripHeader`: trip name, role badge, destination, dates, member count, live status pill.
- `VoteButton`: real `<button>` with `aria-pressed`; one vote per member per activity; clicking again removes it;
  updates optimistically and rolls back on error.
- `ConnectionStatus`: shows Live / Reconnecting; when disconnected the page still works and shows a message.
- Forms: every input has a `<label>`; errors are shown next to the field and announced (`role="alert"`);
  submit buttons are disabled while saving.
- Empty states say what will appear and how to add the first item.

### 2.3 User flows the implementation must follow

1. **New user:** Sign up → Dashboard → New trip → Trip overview (creator becomes Organizer) → copy share link.
2. **Invitee:** open share link (must be logged in; otherwise log in and return) → Viewer page → Accept (becomes
   Member) or Request to join → Organizer approves on Trip overview → requester becomes Member.
3. **Planning:** Itinerary → Add activity → other Members vote → every open client sees the change within ~2 s
   without reload.
4. **Dates:** Availability → mark free days → group sees overlap and the BEST range.
5. **Money:** Budget → Log expense → category bars, overspend flag and balances update.

## 3. Scrum and workflow

- Work only on issues from the board. Move the card: Sprint Todo → In Progress (when you start) → In Review (PR open)
  → Done (merged).
- **Branches:** one branch per issue, from `main`:
  `feature/<issue#>-short-description`, `fix/<issue#>-...`, `chore/<issue#>-...`, `docs/<issue#>-...`
  (e.g. `feature/12-itinerary-voting`). Never commit directly to `main`.
- **Commits:** Conventional Commits, present tense, issue number at the end:
  `feat: add vote toggle to activity card (#12)`, `test: add failing tests for vote limits (#12)`,
  `fix: reject negative expense amounts (#14)`. Types: feat, fix, test, refactor, docs, chore, ci, style.
- **Pull requests:**
  - Title like the main commit; body starts with `Closes #<issue>`, lists what changed and how it was tested,
    and ticks the acceptance criteria that are met.
  - CI (tests + lint + `npm audit`) must be green; the preview deploy link must work.
  - At least **one review from the partner** before merge. Squash-merge, then delete the branch.
- **Referencing issues in code:** only for workarounds or TODOs: `// TODO(#14): replace with real split rule`.
  No bare TODOs without an issue number.
- Keep PRs small: one issue per PR. If the work grows, open a new issue instead of widening the PR.

## 4. Do's and don'ts

### Do

- Read the issue's acceptance criteria and the matching mockup screen before writing code.
- Write the failing test first (section 1.6).
- Validate every request body with zod on the server; trust nothing from the client.
- Check trip membership and role in middleware (`requireTripRole('organizer')`) for every trip route.
- Reuse components from `client/src/components` before creating new ones.
- Keep secrets in environment variables; update `.env.example` when you add one.
- Handle loading, empty and error states on every screen.
- Ask when something in the PRD, mockup or this file is unclear or marked TBD.

### Don't

- Don't add dependencies without a reason in the PR description; prefer the libraries in section 1.2.
- Don't disable ESLint rules, skip tests or delete failing tests to make CI pass.
- Don't store money as floats or compare dates as local-time strings.
- Don't put business logic in React components or Express routes.
- Don't use `dangerouslySetInnerHTML`, `eval`, or string-built Mongo queries.
- Don't return password hashes, tokens or other members' emails in API responses.
- Don't change the visual style (colors, font, spacing) away from the mockup without updating this file.
- Don't commit `.env`, real credentials, or generated build output.

### Security requirements

- Passwords hashed with bcrypt (cost ≥ 10); never logged.
- JWT in an httpOnly, Secure, SameSite cookie; short expiry.
- Logout must also invalidate the token on the server, not only clear the cookie (e.g. a `tokenVersion`
  on the user that logout increments and `requireAuth` checks). An integration test must show that the
  old token is rejected after logout.
- Share codes are random and unguessable (e.g. `crypto.randomBytes`), never sequential IDs.
- Viewers can never read itinerary, availability or budget data — enforced in the API and covered by tests.
- Use `helmet`, CORS restricted to our own origin, and rate limiting on auth routes.
- `npm audit` runs in CI; fix high/critical issues before merging.

### Accessibility requirements

- Semantic HTML: real `<button>`, `<a href>`, `<label>`, headings in order, landmarks (`header`, `nav`, `main`).
- Every feature works with the keyboard only; focus is always visible.
- Icon-only buttons have `aria-label`; toggles use `aria-pressed`; live messages use `aria-live`.
- Text contrast at least 4.5:1 (WCAG AA). Never use color alone to show state (add text or an icon, e.g.
  "Over budget by $45.00").
- Touch targets at least 44×44px; layouts work at 375px wide.

<!--
  Changelog — update when the rules change after the before/after test (HW3 Task 4).
  - v1 (2026-10-30): first version, used for the before/after test.
  - v2 (2026-10-30): after the before/after test. Logout must invalidate the token on the server
    (the test run only cleared the cookie), and every user-facing flow needs a passing Playwright spec
    (the test run wrote none).
-->
