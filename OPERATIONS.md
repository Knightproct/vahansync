# Vahana operations runbook

## Production rollout

1. Create a Supabase project and private `documents` Storage bucket.
2. Set `VAHANA_ENVIRONMENT=production`, the Supabase PostgreSQL URL, `VAHANA_AUTH_PROVIDER=supabase`, `VAHANA_SUPABASE_JWT_SECRET`, and a non-default seed password.
3. Set `VAHANA_SUPABASE_SERVICE_ROLE_KEY` only in the API environment, never in Vite or browser configuration.
4. Set `VAHANA_CORS_ORIGINS` to the deployed web origin and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in the web build environment.
5. Run `npm run migrate` from the release artifact before starting Uvicorn.
6. Configure Razorpay plan IDs, the server-side key secret, and a webhook for `/api/v1/webhooks/razorpay`.
7. Start the API with a process supervisor and expose `/health` to the load balancer.

The default local storage adapter is intentionally explicit. Production should use `VAHANA_STORAGE_BACKEND=supabase` with a private bucket and the service-role key held only by the API.

## Backup and recovery

- Back up PostgreSQL with daily full backups and point-in-time recovery.
- Version document objects independently with retention and encryption enabled.
- Test a restore into an isolated database at least monthly.
- Restore the database first, then the document objects, then run `npm run migrate`.
- Verify `/health`, authentication, document downloads, and a tenant-scoped read before traffic is restored.

## Observability

Every response includes `x-request-id`. API logs emit structured request completion fields: request ID, method, path, status, and duration. Forward these fields to the deployment log collector and alert on sustained 5xx responses, migration failures, database saturation, and storage errors.
