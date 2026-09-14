# Vahana Fleet OS — production architecture

## Product direction

Vahana is a multi-tenant operating system for Indian fleet operators. The system of record is the backend, not the browser: every operational change is authenticated, scoped to an organization, validated, and audit logged.

## Selected stack

- **Web:** React 18 + Vite, with feature-oriented components and an API client boundary.
- **API:** FastAPI with versioned REST endpoints under `/api/v1`.
- **Data:** SQLAlchemy 2 models. PostgreSQL is the production database; SQLite is supported for local development and automated tests.
- **Security:** JWT access tokens, Argon2 password hashing, organization-scoped queries, role checks, and immutable audit events.
- **Operations:** Environment-driven configuration, request IDs, health/readiness endpoints, structured error responses, and container-friendly startup.

This keeps local development lightweight while preserving the production seams needed for managed PostgreSQL, object storage, queues, telematics providers, and Indian accounting integrations.

## Domain boundaries

1. **Identity & tenancy** — organizations, users, roles, memberships, and audit log.
2. **Fleet** — vehicles, odometer readings, assignments, depots, drivers, and component hierarchy.
3. **Maintenance** — service plans, work orders, inspections, downtime, and warranty.
4. **Workshop & inventory** — parts, stock locations, receipts, issues, vendors, purchase orders, and valuation.
5. **Compliance vault** — documents, versions, expiry rules, reminders, and access history.
6. **Finance** — expenses, fuel, tolls, invoices, GST metadata, approvals, and cost-per-kilometre.
7. **Integrations** — GPS/telematics, FASTag, fuel cards, accounting, messaging, and webhooks.

## Tenancy and security rules

- Every business record carries an `organization_id`.
- The request context resolves the organization from the authenticated membership; clients never choose a raw organization ID for reads or writes.
- Role checks protect mutations (`owner`, `admin`, `manager`, `workshop`, `finance`, `viewer`).
- Audit records capture actor, action, entity, entity ID, request ID, and before/after payloads where applicable.
- Document binaries are stored outside the relational database; the database stores metadata, version, checksum, expiry, and authorization context.

## Delivery sequence

### Foundation

Authentication, tenancy, vehicles, audit log, API conventions, and operational dashboard data.

### Operations

Component registry, inspections, preventive maintenance rules, work orders, workshop inventory, and document expiry automation.

### Finance and integrations

Expense approval, fuel/toll reconciliation, GST-ready vendor bills, telematics adapters, FASTag/fuel-card imports, and notifications.

### Enterprise hardening

PostgreSQL migrations, object storage, background jobs, observability, backups, rate limiting, SSO, mobile technician workflows, and disaster recovery runbooks.
