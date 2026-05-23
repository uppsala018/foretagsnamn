# BACKEND LOCK — DO NOT MODIFY THESE FILES
The following files contain backend logic and must not be changed, deleted or moved during the UI rebuild.

- `.env.example`
- `.env.local`
- `next.config.ts`
- `hostup_api.php`
- `foretagsnamn-af068-firebase-adminsdk-fbsvc-6c1d2bb85b.json`
- `app/api/checkout/deep-search/route.ts`
- `app/api/checkout/session/route.ts`
- `app/api/health/route.ts`
- `app/api/hostup/check/route.ts`
- `app/api/namecheck/route.ts`
- `app/api/provider-debug/route.ts`
- `app/api/reports/paid/route.ts`
- `lib/firebase-admin.ts`
- `lib/reports/report-store.ts`
- `lib/stripe.ts`
- `lib/namecheck/company-name-provider.ts`
- `lib/namecheck/generate-report.ts`
- `lib/namecheck/mock-provider.ts`
- `lib/namecheck/normalize.ts`
- `lib/namecheck/openrouter-provider.ts`
- `lib/namecheck/provider-diagnostics.ts`
- `lib/namecheck/report.ts`
- `lib/namecheck/social-provider.ts`
- `lib/namecheck/types.ts`
- `lib/namecheck/validation.ts`

Rules:
- Never delete or overwrite any file in this list
- Never change any import path that these files depend on
- Never rename any API routes
- Never remove environment variable references
- If a UI component needs data from the backend, only change how it DISPLAYS the data, not how the data is fetched
