# Task 01 — Backend: Flyway V3 — sim_cards provider and number columns

## Domain
backend

## Plan
`plans/plan-02p-customer-asset-improvements.md`

## Depends on
- `tasks/plan-02-customers-assets/01-backend-phone-simcard-entities.md` — `sim_cards` table must exist before adding columns to it

## References
- `docs/architecture.md#Data model` — SIM_CARD ERD entity with new `provider` and `number` fields
- `specs/backend.md#SIM card rules` — nullable in DB, required at API layer for new rows

## Context

Add two new nullable columns to `sim_cards`: `provider` (VARCHAR for SimProvider enum) and `number` (VARCHAR for the FR mobile MSISDN). Both are nullable because existing rows in production have neither value. Nullability is enforced only at the API layer — a new `POST /customers/{id}/sim-cards` call must supply both fields. This is a pure DDL migration; no data backfill is needed.

### Inlined spec excerpts

**Schema additions (architecture.md):**
```
SIM_CARD {
  ...existing columns...
  string provider "FREE|ORANGE|BOUYGUES|SFR|CORIOLIS — nullable for existing rows, required via API"
  string number   "FR mobile MSISDN — nullable for existing rows, required via API"
}
```

**Existing migration location:**
```
api/src/main/resources/db/migration/
  V1__initial_schema.sql   ← sim_cards table defined here
  V2__fix_admin_password.sql
```

**New migration to create:**
```
V3__add_sim_card_provider_number.sql
```

## Implementation

1. Create `api/src/main/resources/db/migration/V3__add_sim_card_provider_number.sql`:
   ```sql
   ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS provider VARCHAR(20);
   ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS number VARCHAR(20);
   ```
   No NOT NULL constraint — existing rows have no value for these fields.

2. Verify Flyway will pick up the migration: confirm `flyway.locations` in `application.properties` / `application.yml` points to `classpath:db/migration` (it should already).

3. After writing the migration, run jOOQ codegen so the generated DSL reflects the new columns:
   ```bash
   cd api && ./mvnw generate-sources -pl .
   ```
   Confirm `sim_cards.PROVIDER` and `sim_cards.NUMBER` appear in the generated `Tables` class under `target/generated-sources/jooq`.

## Acceptance criteria

- [ ] `V3__add_sim_card_provider_number.sql` exists with the two `ALTER TABLE` statements
- [ ] `./mvnw flyway:migrate` applies cleanly on a fresh DB (or `mvn verify` passes, which runs migrations via test container)
- [ ] jOOQ codegen produces `sim_cards.PROVIDER` and `sim_cards.NUMBER` DSL fields
- [ ] No existing SIM card rows are affected (no NOT NULL, no DEFAULT, no backfill)
- [ ] All automated checks pass

## Automated checks

```bash
cd api && ./mvnw verify -q
```
