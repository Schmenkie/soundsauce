<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog server-side analytics into SoundSauce's Vercel API routes. A shared `posthog-node` client module was created and wired into four critical API endpoints, tracking the most business-important server-side events: subscription lifecycle (checkout, activation, plan changes, and cancellations), stem separation usage, and user feedback. Each event captures the authenticated user's distinct ID — reading from the `X-POSTHOG-DISTINCT-ID` header first to maintain correlation with client-side PostHog sessions, falling back to the Supabase user ID. Exception tracking (`captureException`) was added to all error handlers so server-side crashes are surfaced in PostHog's error monitoring.

| Event | Description | File |
|---|---|---|
| `checkout_session_created` | Stripe checkout session successfully created; user is being redirected to payment. Captures `tier`, `price_id`, `stripe_customer_id`. | `api/create-checkout.js` |
| `subscription_activated` | Stripe webhook confirmed a new subscription (`checkout.session.completed`). Captures `tier`, `price_id`, `stripe_customer_id`, `subscription_status`. | `api/stripe-webhook.js` |
| `subscription_updated` | Stripe webhook confirmed a subscription plan or status change. Captures `tier`, `subscription_status`. | `api/stripe-webhook.js` |
| `subscription_canceled` | Stripe webhook confirmed subscription deletion; user downgraded to free tier. Captures `stripe_customer_id`. | `api/stripe-webhook.js` |
| `stem_separation_started` | Replicate job successfully queued for stem separation. Captures `prediction_id`. | `api/separate-stems.js` |
| `feedback_submitted` | User feedback email was sent successfully via Resend. Captures `feedback_type`, `page`. | `api/send-feedback.js` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](https://us.posthog.com/project/310428/dashboard/1613895) — all insights in one place
- [Subscription Conversion Funnel](https://us.posthog.com/project/310428/insights/rTVTk68S) — checkout → activation conversion rate
- [Subscription Events Over Time](https://us.posthog.com/project/310428/insights/Fg5HBR4q) — activations, updates, and cancellations trend
- [Checkout Sessions Created](https://us.posthog.com/project/310428/insights/hGXttyox) — daily revenue intent signal
- [Stem Separations Started](https://us.posthog.com/project/310428/insights/bJCozFmT) — core Pro feature usage
- [Feedback Submitted by Type](https://us.posthog.com/project/310428/insights/p7MVIKrF) — bug reports vs feature requests vs general feedback

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
