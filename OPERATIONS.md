# Vahana operations runbook

## Production rollout

1. Provision PostgreSQL and a persistent document volume or an approved S3-compatible storage adapter.
2. Set `VAHANA_ENVIRONMENT=production`, a unique `VAHANA_DATABASE_URL`, `VAHANA_JWT_SECRET`, and `VAHANA_SEED_ADMIN_PASSWORD`.
3. Set `VAHANA_CORS_ORIGINS` to the deployed web origin.
4. Run `npm run migrate` from the release artifact before starting Uvicorn.
5. Start the API with a process supervisor and expose `/health` to the load balancer.

The default local storage adapter is intentionally explicit. Set `VAHANA_STORAGE_BACKEND=local` only when the configured volume is durable; an object-storage deployment must install and select its reviewed provider adapter rather than silently writing to ephemeral disk.

## Backup and recovery

- Back up PostgreSQL with daily full backups and point-in-time recovery.
- Version document objects independently with retention and encryption enabled.
- Test a restore into an isolated database at least monthly.
- Restore the database first, then the document objects, then run `npm run migrate`.
- Verify `/health`, authentication, document downloads, and a tenant-scoped read before traffic is restored.

## Observability

Every response includes `x-request-id`. API logs emit structured request completion fields: request ID, method, path, status, and duration. Forward these fields to the deployment log collector and alert on sustained 5xx responses, migration failures, database saturation, and storage errors.
