# SNS WATCH BOX (仮) — Development Ledger
Updated: 2026-10-24 JST
Repository: https://github.com/SASAKIjoe/x-patrol-assistant

## Mandatory start-of-task gate

BEFORE proposing, implementing, or submitting new Work for this application:
1. Read THIS ledger first, then fetch the corresponding source files, release notes and test artifacts from GitHub.
2. Identify the existing implementation of every requested feature across versions, not just the newest numbered version.
3. Reuse the most complete proven implementation. No re-creation of previously implemented functions without a documented reason.
4. Define a preservation/regression checklist before changes. Build in a NEW isolated directory; do not overwrite stable/test paths or user data.
5. After implementation, verify every dependency, interactive flow, data migration, PWA scope/cache and Android Human Gates. Update this ledger with concrete evidence and unresolved issues.
6. Do not say a test has passed if only source inspection or static parsing occurred. Do not claim true X new-post detection for local list refresh.

## Product principles (confirmed by user)

- Android tablet PWA first, free/low-cost, compact high-density three-column cards on tablet portrait; minimal on-screen words to reduce unconscious reading fatigue.
- Tapping anywhere on the card outside actionable buttons/links opens/closes detail. Small chevron-only targets are unacceptable.
- X opened externally -> return to the same card/scroll position, preserve tab/filter/sort/expanded state.
- Human reads posts and manually likes; no automatic liking, following or scraping X.
- Distinct signals: manually checked ✔; objectively detected new post ('New' or ● only when feed evidence exists); unknown −. A local refresh is NOT an X update check.
- Track self-reported manual likes with timestamps, registration date, user-confirmed follower conversion date and days; distinguish follow confirmation from human visit confirmation. Correlation is not causation.
- Genre CRUD, collection inbox, X Android share target, duplicate detection, bulk promotion, morning/evening patrol, backup/restore and existing data protection are mandatory inherited features.
- App name: SNS WATCH BOX（仮）; legal trademark clearance not completed. English-only artifact filenames.
- Target: prioritize users not yet following the account, avoid implying that account follows automatically.

## Verified repository implementation map

| Directory | What is implemented or evidenced | Status / caveat |
|---|---|---|
| / (root) | Initial X巡回アシスタント V0.2 PWA | Preserve |
| v04-test/ | Manual X post URL intake, candidate management | Preserve |
| v05-test/ | Android X share target -> inbox, repeated shares, bulk candidate registration, persistence, duplicate rejection | Core flow user-tested on Android; preserve |
| v051-ui-test/ | Dense candidate list, collapse, check ✔, local reordering/refresh, view-position recovery, genre/inbox/patrol | Source inspected; use as base as needed |
| **v051-rss-test/** | **Existing free RSS-based X-post monitoring!** Uses keep.md RSS, compares verified author's X status IDs, initial baseline, retry scheduling, last-seen/ack state; candidate checks on app open. Source: rss.mjs, app.mjs, README.md, RESULT.md. | Report says unit 74, regression 18, compact 21, reorder 23, RSS browser 12, live RSS 4; Android all-candidate real-device test NOT_TESTED. External feed reliability/TOS unknown. Do NOT forget or rebuild from scratch. |
| v052-analytics-test/ | Separate three-column cards, manual-like count/time-stamped events, follower confirmation and conversion rate; whole-card tap fixed and user confirmed comfortable | Lacked inbox/share, patrol, RSS, etc.; do NOT treat as complete successor |
| v053-integrated-test/ | Attempted integration based on v051-ui-test plus analytics; 14 dependencies/source syntax verified, 3-column CSS and GitHub files published | **RSS was omitted because wrong base was chosen.** Remote browser QA navigated to wrong root V0.2; it does NOT validate v053 functionality. Android NOT_TESTED. Do not promote as complete. |

## RSS details — critically important

Source: `v051-rss-test/rss.mjs`; README: `v051-rss-test/README.md`; result: `v051-rss-test/RESULT.md`.
- Uses Keep free X RSS endpoint at keep.md; external third party, not X official RSS. No guarantee of uptime or complete post coverage.
- `RSS_CHECK_INTERVAL_MS = 6h` successful checks, `RSS_RETRY_INTERVAL_MS = 1h` failed checks; requests spaced >= 1,250 ms when app is active.
- Provider's published feed updates reportedly about once per 24h with recent 20 posts; do not equate check interval with source freshness.
- `newestOwnPost` checks canonical URL AND dc:creator matches intended account. Initial observation seeds baseline; only later verified newer status ID yields new indicator.
- Opening PWA can process due handles, with resumable queue. PWA closed does NOT poll in background; no live notifications or guaranteed feed coverage.
- External RSS service usage/availability must be re-validated before promising ongoing reliability or deploying widely.
- Reuse working RSS implementation rather than claiming X RSS cannot be done.

## Known failures and guardrails

- V0.4 previously showed unstyled/nonfunctional app because `style.css`, `app.mjs`, `core.mjs` were uploaded separately and omitted; recursive dependency audit REQUIRED.
- V0.5 local PWA launch initially failed but user later confirmed launch/share operation. Don't change stable version's SW or PWA identity.
- V0.5.2 initial card changes were cached; revisioned asset URLs made whole-card tap work. Test cache migration/update on Android.
- Naming/numbering is not an indicator of feature completeness: NEVER assume later version contains earlier RSS.
- GitHub connector scoped to `SASAKIjoe/x-patrol-assistant` successfully performed create/read/delete in Oct 2026; Work-side connector permissions can differ.
- GitHub Pages public files are code only; never upload real accounts, private watch lists or JSON backups.
- Avoid paid TinyFish browser service for routine tests unless user has approved charges; use free/local tests and actual Android Human Gate.

## Next required engineering task

Consolidate `v051-rss-test` + fully functioning V0.5 share/inbox/patrol/genre + compact three-column whole-card-tap UI + position restoration + non-destructive analytics from v052/v053.
Build in a NEW `v054-...-test/` directory only. Verify complete feature checklist and source-level + browser E2E, then one Android Human Gate; do not tell user to install a half-integrated version.
No work is currently claimed completed for this consolidation.

## Maintenance policy

Append each release's source paths, proven tests, current blockers, data format, and known regressions immediately after work. This ledger is the source-of-truth index, but actual GitHub implementation remains authoritative. A new chat cannot be guaranteed to automatically open this file; at the START of every SNS WATCH BOX development request, explicitly fetch/read this ledger.


## 2026-10-24 — v054-watch-test integration attempt

- URL: https://sasakijoe.github.io/x-patrol-assistant/v054-watch-test/
- Base: **v051-rss-test** (not the incomplete v053). Independently copied core/storage/migration/candidate UI/reorder UI/RSS and included the existing RSS scanning and native PWA X-share.
- New: 3-column tablet candidate cards; whole-surface tap for details, tiny arrow hidden; analytics sidecar to store manual-like +1/-1 timestamps, follower confirmation date, registration-to-follow confirmation interval, totals/conversion percent. RSS verified new-post status is shown as **New**, unverified **−**, human checked **✔**. Real RSS check button is visible next to the status.
- Store: new IndexedDB `xpatrol-v054-watch-test` seeded non-destructively from `xpatrol-v051-rss-test` before older version fallback; independent localStorage `sns-watch-box-v054-analytics` migrates from prior v053/v052 analytics when available. No earlier DB or source directory overwritten.
- GitHub source QA: 13/13 required files confirmed, 9 local module imports resolved, JS syntax checks pass, RSS baseline/new-ID + due scheduling pure logic checks pass. A synthetic URL ingestion test in the limited tool runtime could not validate browser URL APIs; not an application failure finding.
- NOT YET VERIFIED: actual Pages browser runtime, Android installed PWA + X share-to-inbox, RSS access from Android and third-party feed success, backup/restore, scroll return, complete interactivity across real users. **HOLD — do not claim formally complete without Android test**.
- External Keep RSS has no uptime guarantee and may be restricted or changed; feed update cadence is not the same as checking frequency.
- Future work: browser/Android E2E with inherited user dataset; fix discovered failures only in v054 test path, update cache version when code changes, and only then consider promotion.


## 2026-10-24 — V054 compact RSS dot + long-press reorder patch

- Android user reported the big `New` text was crowded and card order couldn't be changed. Requested green dot and long-press drag.
- Changed `v054-watch-test/app.mjs` to represent RSS-verified new status by ● (descriptive accessibility text retained); aggregate New N remains.
- Changed `v054-watch-test/style.css`: compact 11px green dot, drag ghost and source styles.
- Replaced `v054-watch-test/reorder-ui.mjs`: 450ms long-press on non-interactive card surface, drag to reorder grid, normal scroll pre-longpress, exclude action buttons, mouse/pointer and Alt+Arrow keyboard support; existing onCommit persists order and manual sort.
- Bumped `v054-watch-test/sw.js` cache version to `20261024-drag-dot-v2`.
- GitHub readback and JS syntax PASS. Android actual drag, scroll, saved order, cache refresh not yet tested (Human Gate).
- No other versions were modified.

## 2026-10-24 — V054 Android long-press still FAILED; sort-mode repair
- User reports long-press drag did NOT work on Android. Prior test did not establish real-device success. Hypothesis: browser touch scrolling consumes gesture. Do not call root cause confirmed without Android evidence.
- Updated `v054-watch-test/reorder-ui.mjs` to provide `setMode()` explicit reorder mode. Existing ordinary long-press remains; in reorder mode touching a card begins pointer drag directly and blocks page touch scrolling only on candidate cards.
- Added `⇅ 並べ替え` / `✓ 完了` toggle near candidate new-post status, mode CSS, SW cache version `20261024-drag-mode-v3`.
- Source readback and JS syntax PASS, real Android drag and persisted order UNVERIFIED. Keep existing data and old versions intact. Need Android Human Gate: open new version, tap sort mode, drag one tile, tap done, reload, ensure order retained; test normal scroll when mode disabled.

## 2026-10-24 — Android drag failure -> two-tap sorting fallback
- User tested V054 long-press and dedicated drag mode: both failed to move cards on Android. Do not claim Android drag PASS.
- Updated V054 reorder engine to expose `setSelectionMode()` and `commitOrder()`, and app.js/mjs handling of `⇅ 並べ替え`: tap source tile (highlight), then tap destination tile (insert before), persist original-to-new visible ID order through the existing safe `reorderPeople` callback, set manual sorting. No reliance on touch drag.
- Original card opening and action buttons work when sorting mode is OFF. Old experimental drag remains outside the reliable selection mode. CSS highlights chosen tile.
- Updated index assets `rev=tapsort4`, SW cache `20261024-tap-sort-v4` to avoid stale PWA JS, GitHub fetch/readback & JS syntax PASS.
- Android two-tap move, saved order and scrolling need real-device confirmation; not yet a full PASS. Existing data and earlier versions preserved.

## 2026-10-24 — Numbered candidate cards
- User wanted instant visual count of tiles. In v054-watch-test added a small 01,02,03... ordinal to each visible candidate tile based on current displayed order, including after manual reorder/filter. Ordinal is presentation only, not a persistent account ID. Kept compact 3-column layout and data unchanged.
- CSS card-index, cache key cardnumbers-v6, HTML asset rev=cardnumbers6. GitHub files read back; Android display untested.

## 2026-10-24 — Independent organization GitHub Pages and one-file migration (v054 + org root)
- User created the free GitHub organization `iris-watch-2026` and public repository `iris-watch-2026.github.io`. A user screenshot showed Pages site live from main root. GitHub connector was granted write access specifically to the new repository.
- All core client-side assets were copied to the new repository; manifest root URLs, page icon, and service-worker cache namespace were adjusted. Old source repository, existing PWA, local IndexedDB, and analytics localStorage were not deleted or reset.
- User observed that candidate/RSS records and ♡/follow analytics required two JSON downloads. The user strongly prefers fewer manual actions. Added `📦 まとめて保存` and `📂 まとめて復元` to **both** old V054 site and new organization site. Single JSON `sns-watch-box-combined-v1` contains validated candidates and separate analytics, including extra historical records not currently in active candidate cards. Distinct legacy per-category backup controls remain available.
- Unified restore parses/validates both sections before preview; only an explicit confirmation attempts local writes. Analytics storage is written first, with a snapshot rollback if candidate IndexedDB replace fails. After successful restoration counts and data are displayed. Cross-store atomicity cannot be guaranteed across abrupt browser termination.
- New PWA pages precache `combined-backup.mjs`, with revised SW cache keys and HTML asset revision queries; docs updated to describe safe private one-file move and no automatic cross-origin transfer.
- **Synthetic unit tests PASS:** 45 candidate cards + 64 historical analytics records + 3 follower confirmations roundtrip; malformed/wrong-format JSON, missing analytics, duplicate handles, and blocked localStorage write are rejected. GitHub readback and module parsing PASS. Old V054 app dynamic async-module parse PASS; new org files parse and UI-ID/precache linkage PASS. Actual Android unified backup/restore and post-deploy browser E2E remain HUMAN GATE (UNVERIFIED).
- New organization's public GitHub README and migration guide do not include the former personal-account URL; commit author history may still publicly show the associated maintainer. Do not claim anonymity.
