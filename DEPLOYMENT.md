# Företagsnamn.app deployment

This app is designed for Vercel with Next.js App Router.

## Required for public production URL

Set this in Vercel for all environments that should generate correct canonical, sitemap, Stripe return URLs, and metadata:

- `NEXT_PUBLIC_APP_URL` - production URL, for example `https://foretagsnamn.app`

Do not leave this as `http://localhost:3000` in production.

## Required for paid deep search

These are required for a working paid flow:

- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PRICE_ID_DEEP_SEARCH` - Stripe Price ID for the 49 SEK product
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Firebase service account client email
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key

For `FIREBASE_PRIVATE_KEY`, paste the full private key into Vercel. Escaped newlines (`\n`) are supported by the app.

If Stripe is missing, the paid button is disabled or checkout returns a safe error. If Firebase is missing, paid report generation returns `503` with no local fallback.

## Optional provider integrations

The free preview and paid reports still work without these, but results become fallback or indicative:

- `OPENROUTER_API_KEY` - enables real AI brand/name risk analysis
- `OPENROUTER_MODEL` - defaults to `deepseek/deepseek-v4-flash:free`
- `NAMECHEAP_API_USER` - enables real domain checks
- `NAMECHEAP_API_KEY` - Namecheap API key
- `NAMECHEAP_USERNAME` - Namecheap username
- `NAMECHEAP_CLIENT_IP` - whitelisted IPv4 address for Namecheap API
- `NAMECHEAP_SANDBOX` - `true` for sandbox, `false` for production

Namecheap requires API access and IPv4 allowlisting. If Namecheap fails, domain cards fall back to indicative results. OpenRouter failures become uncertain AI fallback results. Instagram/TikTok checks are public URL status checks only and may return uncertain if platforms block automation.

## Vercel checklist

1. Create a Vercel project from this repository.
2. Add all production environment variables above.
3. Confirm `NEXT_PUBLIC_APP_URL` matches the production domain.
4. Configure Stripe Checkout product/price for 49 SEK and set the price ID.
5. Create a Firebase service account with Firestore access and set the Firebase env vars.
6. Run a production deployment.
7. Check `/api/health` after deploy. It returns booleans only and never exposes secrets.
8. Test free preview, Stripe checkout, success page, stored paid report reload, and print/PDF.

## Manual live-test checklist

Use this checklist after every production deployment:

1. Visit `/` and confirm the homepage loads with the search field, trust copy, how-it-works section, and FAQ.
2. Run a free search with a normal Swedish name, for example `Gröna Verkstan`.
3. Run a free search with `å`, `ä`, or `ö` and confirm domain/handle suggestions normalize correctly.
4. Visit `/api/health` and confirm it returns only safe booleans.
5. Visit `/diagnostics` and confirm the same safe configuration status is visible.
6. Start Stripe Checkout in test mode from a free preview result.
7. Complete paid checkout with a Stripe test card.
8. Confirm `/success?session_id=...` renders a `Djupsökningsrapport`.
9. Reload the same success URL and confirm the same stored report returns from Firestore.
10. Use `Skriv ut / spara som PDF` and confirm buttons/navigation are hidden in the print view.
11. Visit `/robots.txt` and confirm it points to the sitemap.
12. Visit `/sitemap.xml` and confirm the production URL is listed.

## Production troubleshooting

### Stripe checkout disabled

Check `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_DEEP_SEARCH`, and `NEXT_PUBLIC_APP_URL`. The homepage disables checkout when Stripe is not configured.

### Firebase 503 on paid report

Check `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`. The app intentionally returns `503` if report storage is not configured.

### Namecheap returns fallback

Check `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_CLIENT_IP`, and `NAMECHEAP_SANDBOX`. Namecheap also requires IPv4 allowlisting.

### OpenRouter returns uncertain

Check `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. If OpenRouter fails or returns invalid JSON, the AI card safely becomes uncertain.

### Social checks show uncertain

Instagram and TikTok can block automated profile URL checks. This is expected and should be treated as an indicative result only.

### `NEXT_PUBLIC_APP_URL` wrong

Fix `NEXT_PUBLIC_APP_URL` in Vercel and redeploy. It controls canonical metadata, sitemap URLs, and Stripe success/cancel URLs.

## Safety boundaries

- No Bolagsverket integration is implemented.
- Company-name checks are preliminary and rules-based.
- Social checks are indicative public profile URL checks only.
- AI output is not legal advice.
- No Supabase dependency is used.
