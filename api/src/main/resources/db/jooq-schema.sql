-- jOOQ codegen schema — generated from V1__initial_schema.sql
-- Function-based indexes removed (H2 DDLDatabase does not support them).

CREATE SEQUENCE invoice_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT random_uuid(),
    email           VARCHAR NOT NULL,
    password_hash   VARCHAR NOT NULL,
    name            VARCHAR NOT NULL,
    role            VARCHAR NOT NULL CHECK (role IN ('admin','company','customer')),
    customer_id     UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT random_uuid(),
    name                VARCHAR NOT NULL,
    contact_info        VARCHAR,
    whatsapp_group_id   VARCHAR,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE phones (
    id          UUID PRIMARY KEY DEFAULT random_uuid(),
    model       VARCHAR NOT NULL,
    ownership   VARCHAR NOT NULL CHECK (ownership IN ('customer','company')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    status      VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','replaced')),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sim_cards (
    id                UUID PRIMARY KEY DEFAULT random_uuid(),
    type              VARCHAR NOT NULL CHECK (type IN ('prepaid','postpaid')),
    base_monthly_fee  NUMERIC(10,2) NOT NULL,
    customer_id       UUID NOT NULL REFERENCES customers(id),
    phone_id          UUID REFERENCES phones(id),
    status            VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','unassigned','cancelled')),
    provider          VARCHAR(20),
    number            VARCHAR(20),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  VARCHAR NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE requests (
    id          UUID PRIMARY KEY DEFAULT random_uuid(),
    type        VARCHAR NOT NULL CHECK (type IN ('phone_repair','phone_replacement','sim_topup','new_sim','manual_support','onboarding')),
    status      VARCHAR NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_progress','done')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    phone_id    UUID REFERENCES phones(id),
    sim_card_id UUID REFERENCES sim_cards(id),
    author      VARCHAR NOT NULL CHECK (author IN ('customer','company')),
    fee         NUMERIC(10,2),
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at     TIMESTAMP
);

CREATE TABLE request_parts (
    id          UUID PRIMARY KEY DEFAULT random_uuid(),
    request_id  UUID NOT NULL REFERENCES requests(id),
    description VARCHAR NOT NULL,
    cost        NUMERIC(10,2) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attachments (
    id                  UUID PRIMARY KEY DEFAULT random_uuid(),
    request_id          UUID NOT NULL REFERENCES requests(id),
    storage_key         VARCHAR NOT NULL,
    original_filename   VARCHAR(255),
    content_type        VARCHAR(100),
    uploaded_by_user_id UUID REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id                          UUID PRIMARY KEY DEFAULT random_uuid(),
    invoice_number              INT NOT NULL DEFAULT next value for invoice_number_seq,
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
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sim_monthly_billing (
    id              UUID PRIMARY KEY DEFAULT random_uuid(),
    sim_card_id     UUID NOT NULL REFERENCES sim_cards(id),
    period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     INT NOT NULL,
    actual_amount   NUMERIC(10,2) NOT NULL
);

CREATE TABLE system_settings (
    id                          UUID PRIMARY KEY DEFAULT random_uuid(),
    bank_account_holder         VARCHAR,
    bank_iban                   VARCHAR,
    bank_swift                  VARCHAR,
    company_name                VARCHAR,
    company_address             VARCHAR,
    company_whatsapp_group_id   VARCHAR
);
