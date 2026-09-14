# Vahana Fleet OS

Vahana is an India-focused, multi-tenant fleet operations ERP for operators who need one system of record for vehicles, components, workshop inventory, maintenance, costs, and regulatory compliance.

## Run locally

Install the web dependencies:

```bash
npm install
npm run dev
```

In a second terminal, create the API environment once and start the backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
npm run api
```

The seeded development account is `admin@example.com` / `ChangeMe!123`. Replace these values with `VAHANA_SEED_ADMIN_EMAIL` and `VAHANA_SEED_ADMIN_PASSWORD` before sharing an environment.

Open the local Vite URL shown in the terminal. The production web build and API tests can be verified with:

```bash
npm run build
npm run test:api
```

## Production foundation

The browser is now a client of the Vahana API. Local development uses SQLite, while production is designed for PostgreSQL through `VAHANA_DATABASE_URL`.

The first production slice includes:

- Multi-tenant organizations and organization-scoped vehicle queries
- JWT authentication with password hashing and role-ready memberships
- Vehicle register API with duplicate registration protection
- Audit event creation for vehicle mutations
- API-backed fleet dashboard and add-vehicle workflow
- Health endpoint, request IDs, CORS configuration, and automated API coverage

The current operations slice also includes:

- Vehicle component register, preventive maintenance plans, and work-order status updates
- Workshop parts catalogue, stock locations, receipt/issue movements, reorder thresholds, and transaction history
- Compliance document register with vehicle linkage and expired-document status calculation
- Organization-scoped expense ledger with live costs and finance dashboard views
- Role checks for operational mutations and runtime rejection of development secrets in staging/production

For non-development environments, set a unique `VAHANA_JWT_SECRET` and a non-default `VAHANA_SEED_ADMIN_PASSWORD`. The current local bootstrap uses `Base.metadata.create_all` for development and tests; production rollout should run a reviewed schema migration before starting the API.

See [ARCHITECTURE.md](ARCHITECTURE.md) for domain boundaries and the enterprise delivery sequence.
