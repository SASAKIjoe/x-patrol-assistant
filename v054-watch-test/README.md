# SNS WATCH BOX V0.5.4 — Integrated PWA Test

Test URL: https://sasakijoe.github.io/x-patrol-assistant/v054-watch-test/

## Included without removing prior features

- X Android Web Share Target -> collection inbox -> duplicate suppression -> batch promotion.
- Genre add/edit/delete, genre counts/targets and searching, candidate status.
- Morning/evening manual patrol, human-checked ✔, saved check history, view-position return.
- RSS-based public X post checks inherited from `v051-rss-test/rss.mjs`: initial baseline; subsequently newly verified status ID => **New**; failures => unknown −. Checks only while PWA page is open. External Keep RSS availability, feed completeness and X/third-party terms remain unverified for wide rollout.
- Dense 3-column candidate cards, whole card surface opens detail, buttons/links operate independently.
- Manually entered ♥/♡ event counts and user-confirmed follower conversion dates; registration-to-confirmation interval and aggregate rate.
- JSON backups for the full candidate/RSS records plus separate "♡記録" backup of analytics. They are **separate datasets**.
- All records stored per device, not in this public repository.

## Data protection

Independent IndexedDB database `xpatrol-v054-watch-test`. On first use it attempts a read-only copy from `v051-rss-test` first, then from `v051-ui-test`, V0.5 and local legacy datasets. Old databases are not overwritten. Sidecar localStorage `sns-watch-box-v054-analytics` reads previous analytics data from V053 and V052 if present; does not overwrite them.

For a different Android browser or device, export both JSON backups from the source version before migration.

## Status

GitHub source dependencies and JavaScript parsing checked. Unit-level baseline/new-post RSS state checked. **Android real-device, published Pages browser E2E, share receipt, and third-party RSS availability have not yet been verified for THIS v054 release.** Do not claim full PASS until the Human Gate has been completed.

## Guardrails

No automated liking/following. No X scraping, password/token storage, paid server, or background network polling. The latest original codebases in sibling folders are preserved.
