# Sprint Retrospectives

## Sprint 1 (setup, accounts, trips, sharing, CI)

**What went well**
- We split the issues in chat early and kept each other informed of what we were working on.
- Yanli set up all 14 issues with labels, acceptance criteria, and milestones, and built the project framework, login, and join requests.
- Pull requests were turned around quickly, and CI and the Playwright tests were running on every pull request by the end of the sprint.

**What did not go well**
- We both set up our own MongoDB cluster and the README said each developer uses their own database. We caught the overlap and agreed to share one.
- Some pull requests were merged by their author before a partner review, especially as we were transitioning to sprint 2 and wrapping up final week and ran into conflicts in between each of our pushes and trying to resolve the merge conflicts. Merging right after helped resolve conflicts temporarily, but we would lose track of each other's work if we didn't review.

**What we would change**
- Assign every issue at sprint planning, and have the partner approve before merging and continue to communicate them right after submitting request.

**Partner feedback**
- We both stuck to our commitments and communicated with each other on the issues. Yanli was responsive within a day and I also responded as soon as I could within a day, which made coordinating easier.

## Sprint 2 (itinerary, voting, live updates, availability, budget, deployment, docs)

**What went well**
- We covered the five features and deployed the app to Render ahead of the deadline.
- Each of us kept the other updated on what was merged and what was left, and Yanli picked up voting, live updates, and availability while Alex built the itinerary, budget, deployment, and docs.
- The shared rules file and test-first workflow kept the code consistent.

**What did not go well**
- A stacked pull request merged into the wrong base branch, so one of the issues reached `main` late.
- Few merges produced conflicts, and resolving them took time.
- We tested our own parts separately, and did not test the finished deployment together before recording.

**What we would change**
- Settle which tools to align on from day one, delete merged branches before opening the next stacked pull request, and run one joint test of the deployed app before the demo.

**Partner feedback**
- We held up each of our end, were responsive, and were clear about what we were taking on to cross this to finish line.
