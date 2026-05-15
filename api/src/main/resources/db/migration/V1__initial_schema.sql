-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequences
CREATE SEQUENCE invoice_number_seq START 1 INCREMENT 1;

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR NOT NULL,
    password_hash   VARCHAR NOT NULL,
    name            VARCHAR NOT NULL,
    role            VARCHAR NOT NULL CHECK (role IN ('admin','company','customer')),
    customer_id     UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email_idx ON users (LOWER(email));
CREATE INDEX users_customer_id_idx ON users (customer_id);

-- Customers
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR NOT NULL,
    contact_info        VARCHAR,
    whatsapp_group_id   VARCHAR,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX customers_name_idx ON customers (name);

-- Phones
CREATE TABLE phones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model       VARCHAR NOT NULL,
    ownership   VARCHAR NOT NULL CHECK (ownership IN ('customer','company')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    status      VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','replaced')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX phones_customer_id_idx ON phones (customer_id);
CREATE INDEX phones_customer_id_status_idx ON phones (customer_id, status);

-- SIM cards
CREATE TABLE sim_cards (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type              VARCHAR NOT NULL CHECK (type IN ('prepaid','postpaid')),
    base_monthly_fee  NUMERIC(10,2) NOT NULL,
    customer_id       UUID NOT NULL REFERENCES customers(id),
    phone_id          UUID REFERENCES phones(id),
    status            VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','unassigned','cancelled')),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX sim_cards_customer_id_idx ON sim_cards (customer_id);
CREATE INDEX sim_cards_phone_id_idx ON sim_cards (phone_id);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  VARCHAR NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

-- Requests
CREATE TABLE requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR NOT NULL CHECK (type IN ('phone_repair','phone_replacement','sim_topup','new_sim','manual_support','onboarding')),
    status      VARCHAR NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_progress','done')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    phone_id    UUID REFERENCES phones(id),
    sim_card_id UUID REFERENCES sim_cards(id),
    author      VARCHAR NOT NULL CHECK (author IN ('customer','company')),
    fee         NUMERIC(10,2),
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    done_at     TIMESTAMP
);
CREATE INDEX requests_customer_id_idx ON requests (customer_id);
CREATE INDEX requests_status_idx ON requests (status);
CREATE INDEX requests_customer_id_status_idx ON requests (customer_id, status);
CREATE INDEX requests_done_at_idx ON requests (done_at);

-- Request parts
CREATE TABLE request_parts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    description VARCHAR NOT NULL,
    cost        NUMERIC(10,2) NOT NULL
);
CREATE INDEX request_parts_request_id_idx ON request_parts (request_id);

-- Attachments
CREATE TABLE attachments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    storage_key         VARCHAR NOT NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX attachments_request_id_idx ON attachments (request_id);

-- Invoices
CREATE TABLE invoices (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number              INT NOT NULL DEFAULT nextval('invoice_number_seq'),
    period_month                INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year                 INT NOT NULL,
    support_fees                NUMERIC(10,2) NOT NULL DEFAULT 0,
    support_expenses            NUMERIC(10,2) NOT NULL DEFAULT 0,
    rolling_advance_current     NUMERIC(10,2) NOT NULL DEFAULT 0,
    rolling_advance_previous    NUMERIC(10,2) NOT NULL DEFAULT 0,
    previous_balance            NUMERIC(10,2) NOT NULL DEFAULT 0,
    taxes                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    status                      VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
    pdf_storage_key             VARCHAR,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX invoices_period_idx ON invoices (period_year, period_month);
CREATE INDEX invoices_status_idx ON invoices (status);

-- SIM monthly billing
CREATE TABLE sim_monthly_billing (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sim_card_id     UUID NOT NULL REFERENCES sim_cards(id),
    period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     INT NOT NULL,
    actual_amount   NUMERIC(10,2) NOT NULL
);
CREATE UNIQUE INDEX sim_monthly_billing_period_idx ON sim_monthly_billing (sim_card_id, period_month, period_year);

-- System settings (single row)
CREATE TABLE system_settings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_holder         VARCHAR,
    bank_iban                   VARCHAR,
    bank_swift                  VARCHAR,
    company_name                VARCHAR,
    company_address             VARCHAR,
    company_whatsapp_group_id   VARCHAR
);

-- Admin seed user (password: Admin1234!)
INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@tetramobile.ae',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VR.F5WD7C',
    'Oscar',
    'admin',
    true
);

-- System settings singleton row
INSERT INTO system_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001');
