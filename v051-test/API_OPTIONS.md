# X-PATROL-051 update semantics and optional data adapter

Checked 2026-10-17, Asia/Tokyo, against official X documentation. No X API call, account automation, scraping, payment setup, or credential collection was performed.

## V0.51 free mode

The 更新 button recomputes local patrol priority from recorded checks, session time, and elapsed time. It does not contact X or establish that an account posted. Use 要確認 / 未確認 for the local state and explicitly show 新着未判定. Opening X and marking 確認を記録 are separate user choices. No automatic collection from multiple usernames and no automatic likes are permitted in this task.

## Current official pricing and constraints

The [official pricing page](https://docs.x.com/x-api/getting-started/pricing) describes prepaid, usage-based credits, with Post reads at USD 0.005 per returned resource and User reads at USD 0.010. It lists spending limits and a 3 million Post-read monthly cap. Repeated resources are usually deduplicated within a UTC day, with exceptions. Prices may change; confirm the developer console before any optional integration. Owned-read discounts concern the developer's own data, not arbitrary candidate accounts.

The [free-credit incentive](https://docs.x.com/x-api/getting-started/free-credits) requires an eligible payment card and a first credit purchase; promotional credits expire. It does not provide a permanent free external-post monitoring mode compatible with this task's no-payment requirement.

[Get Users Posts](https://docs.x.com/x-api/users/get-posts) documents `GET /2/users/{id}/tweets`, `since_id`, time ranges, pagination, and `max_results` from 5 to 100. [Rate limits](https://docs.x.com/x-api/fundamentals/rate-limits) currently list this endpoint at 10,000 requests per app / 15 minutes and 900 per user / 15 minutes. Actual app entitlement, authentication, credit balance, and response headers must still be checked. A successful permitted read can establish observed posts as of its fetch time; it is not a guarantee of real-time completeness.

The [X automation rules](https://help.x.com/en/rules-and-policies/x-automation) prohibit automated likes and non-API automation such as scripting the X website. The [developer policy](https://docs.x.com/developer-terms/policy) also requires privacy, control, and compliance with the approved use case. Browser scraping, unofficial mirrors, hidden endpoints, and automated engagement are excluded.

## Optional adapter design — documentation only

Any future integration requires a separate user request, permitted data access, reviewed terms and current pricing, and a server component. The [official security guidance](https://docs.x.com/fundamentals/security) says API credentials must not appear in client code, logs, or repositories; a static GitHub Pages bundle must never embed a token.

Suggested interface, not implemented:

```text
LatestPostObservation {
  personId, provider: "official-x-api" | "permitted-source",
  outcome: "observed-new" | "observed-none" | "unknown",
  observedAt, latestPostId?, sourceUrl?, sincePostId?,
  errorCode?, retryAfter?, expiresAt?
}
```

Separate these observations from the human `checkedAt` record. Store only necessary IDs, timestamps, provenance, and a link; keep the user's manual history and original backups intact. A stale/failed/unauthorized/limited result becomes 新着未判定 and never 新着なし. Only a successful authorized observation can show 新着投稿あり, alongside its observation time and source. Define the observation window explicitly before interpreting an empty response. Pagination gaps or expired cache cannot establish absence.

The adapter should remain disabled by default, use a same-origin authenticated backend with allowlisted endpoints, enforce a user-visible spend ceiling, respect rate/reset headers, stop on credit exhaustion, and avoid silent background polling. The present user request does not authorize implementing it or collecting posts from multiple usernames.

A different source is acceptable only if its operator and the content owner explicitly permit that use, its terms permit access and display, and provenance can be verified. A user-provided URL by itself is not proof of permission to scrape its contents. Manual registration remains the supported free option.
